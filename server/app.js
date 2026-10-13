import express from 'express'
import { randomUUID } from 'node:crypto'
import { checkPassword, clearCookie, clearFailures, codeKey, hashPassword, isLocked, newToken, noteFailure, readCookie, readCredentials, setCookie, tokenKey } from './auth.js'
import { fileRoutes } from './files.js'
import { Conflict, createStorage } from './storage.js'
import { emptyWorkspace, migrate, workspaceRoutes } from './workspace.js'

// The whole API as one Express app. server/dev.js runs it locally; api/index.js hands it
// to Vercel. Nothing is kept in memory between requests: each one reads the documents it
// needs from storage and writes back what it changed.
export const storage = createStorage()
const ONLINE = storage.cloud
const RULES = { codeMin: ONLINE ? 6 : 4, codeMax: 8, maxFileMb: storage.maxFileMb }

let secretOnce
const secret = () => (secretOnce ??= storage.secret())

const fail = (res, message) => res.status(400).json({ error: message })
function sendError(res, err) {
  if (res.headersSent) return
  if (err instanceof Conflict) return res.status(409).json({ error: 'That was changed somewhere else at the same moment — try again' })
  console.error(err)
  res.status(500).json({ error: 'The server could not save that' })
}

async function readAuth() {
  const doc = await storage.readJson('auth')
  return { auth: doc?.value ?? { users: [], sessions: {}, fails: {} }, tag: doc?.tag ?? null }
}
const saveAuth = (a) => storage.writeJson('auth', a.auth, a.tag)

// writes the request's workspace back and answers with it
function commit(req, res, status = 200) {
  return storage
    .writeJson(`ws/${req.user.id}`, req.ws, req.wsTag)
    .then(() => res.status(status).json(req.ws))
    .catch((err) => sendError(res, err))
}

const app = express()
// behind Vercel's proxy the client address is in X-Forwarded-For
if (ONLINE) app.set('trust proxy', true)
app.use(express.json({ limit: '100kb' }))

const publicUser = (u) => ({ id: u.id, name: u.name, hasPassword: Boolean(u.hash) })
const userOf = (auth, req) => {
  const token = readCookie(req)
  const id = token && auth.sessions[tokenKey(token)]
  return id ? auth.users.find((u) => u.id === id) : null
}
async function startSession(res, a, user, status = 200) {
  const token = newToken()
  a.auth.sessions[tokenKey(token)] = user.id
  await saveAuth(a)
  setCookie(res, token, ONLINE)
  res.status(status).json({ user: publicUser(user), rules: RULES })
}
const LOCKED = 'Too many wrong codes — the vault is locked for a few minutes'

// A new vault is claimed by choosing a code nobody else uses.
app.post('/api/auth/register', async (req, res) => {
  const fields = readCredentials(req.body ?? {}, { register: true, min: RULES.codeMin })
  if (typeof fields === 'string') return fail(res, fields)
  const a = await readAuth()
  if (isLocked(a.auth, req.ip)) return res.status(429).json({ error: LOCKED })
  const key = codeKey(await secret(), fields.code)
  if (a.auth.users.some((u) => u.codeKey === key)) {
    // answering this reveals that the code exists, so it counts as a guess
    noteFailure(a.auth, req.ip)
    await saveAuth(a)
    return res.status(409).json({ error: 'That code already opens another vault — choose a different one' })
  }
  const user = {
    id: randomUUID(),
    name: fields.name,
    codeKey: key,
    ...(fields.password ? hashPassword(fields.password) : {}),
    createdAt: new Date().toISOString(),
  }
  // data saved before accounts existed goes to the first account created
  const workspace = a.auth.unclaimed ? migrate(a.auth.unclaimed) : emptyWorkspace()
  delete a.auth.unclaimed
  a.auth.users.push(user)
  await storage.writeJson(`ws/${user.id}`, workspace, null)
  await startSession(res, a, user, 201)
})

app.post('/api/auth/login', async (req, res) => {
  const fields = readCredentials(req.body ?? {})
  if (typeof fields === 'string') return fail(res, fields)
  const a = await readAuth()
  if (isLocked(a.auth, req.ip)) return res.status(429).json({ error: LOCKED })
  const key = codeKey(await secret(), fields.code)
  const user = a.auth.users.find((u) => u.codeKey === key)
  const miss = async (body) => {
    noteFailure(a.auth, req.ip)
    await saveAuth(a)
    res.status(401).json(body)
  }
  if (!user) return miss({ error: 'No vault opens with that code' })
  if (user.hash) {
    if (!fields.password) return res.status(401).json({ error: 'Code accepted — this vault also needs its password', needsPassword: true })
    if (!checkPassword(fields.password, user)) return miss({ error: 'Wrong password', needsPassword: true })
  }
  clearFailures(a.auth, req.ip)
  await startSession(res, a, user)
})

app.post('/api/auth/logout', async (req, res) => {
  const a = await readAuth()
  const token = readCookie(req)
  if (token && a.auth.sessions[tokenKey(token)]) {
    delete a.auth.sessions[tokenKey(token)]
    await saveAuth(a)
  }
  clearCookie(res, ONLINE)
  res.json({ user: null, rules: RULES })
})

app.get('/api/auth/me', async (req, res) => {
  const { auth } = await readAuth()
  const user = userOf(auth, req)
  res.json({ user: user ? publicUser(user) : null, rules: RULES })
})

// everything below needs a signed-in account and only ever touches that account's workspace
app.use('/api', async (req, res, next) => {
  const { auth } = await readAuth()
  const user = userOf(auth, req)
  if (!user) return res.status(401).json({ error: 'Sign in first' })
  const doc = await storage.readJson(`ws/${user.id}`)
  req.user = user
  req.ws = migrate(doc?.value ?? emptyWorkspace())
  req.wsTag = doc?.tag ?? null
  next()
})

app.get('/api/state', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(req.ws)
})

const fileKey = (userId, fileId) => `files/${userId}/${fileId}`
// remove the stored files of deleted works; a failure here must not undo the delete
const dropFiles = (userId, works) =>
  storage.removeFiles(works.flatMap((w) => (w.files ?? []).map((f) => fileKey(userId, f.id)))).catch((err) => console.error(err))

// folders, works, their clocks and the focus slot
workspaceRoutes(app, { commit, fail, dropFiles })
// task sheets and finished work attached to a work
fileRoutes(app, { commit, fail, storage, fileKey })

// Focus timer. Stored as timestamps so it keeps real time across reloads and tabs:
// elapsed = accumulated + (running ? now - startedAt : 0)
app.put('/api/session', (req, res) => {
  const { minutes, running, startedAt, accumulated } = req.body ?? {}
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 90) return fail(res, 'minutes must be 1-90')
  if (typeof running !== 'boolean') return fail(res, 'running must be a boolean')
  if (typeof accumulated !== 'number' || accumulated < 0) return fail(res, 'accumulated must be seconds >= 0')
  if (running && typeof startedAt !== 'number') return fail(res, 'startedAt is required while running')
  req.ws.session = { minutes, running, startedAt: running ? startedAt : null, accumulated }
  commit(req, res)
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
// eslint-disable-next-line no-unused-vars -- Express recognises error handlers by their four arguments
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: `That is over the ${RULES.maxFileMb} MB limit` })
  sendError(res, err)
})

export default app
