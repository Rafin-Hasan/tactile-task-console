import express from 'express'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkPassword,
  clearCookie,
  clearFailures,
  codeKey,
  hashPassword,
  isLocked,
  loadSecret,
  newToken,
  noteFailure,
  readCookie,
  readCredentials,
  setCookie,
  tokenKey,
} from './auth.js'
import { fileRoutes, fileStore } from './files.js'
import { emptyWorkspace, migrate, workspaceRoutes } from './workspace.js'

// API_PORT rather than PORT: dev launchers set PORT for the web server
const PORT = process.env.API_PORT || 3001
const DATA_DIR = process.env.API_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), 'data')
const DB_FILE = join(DATA_DIR, 'db.json')

// ── storage: one JSON file, written atomically ──
// { users: [...], sessions: { tokenHash: userId }, workspaces: { userId: { folders, works, focusId, session } } }
function load() {
  if (!existsSync(DB_FILE)) return { users: [], sessions: {}, workspaces: {} }
  try {
    const data = JSON.parse(readFileSync(DB_FILE, 'utf8'))
    // data saved before accounts existed is kept and handed to the first account created
    if (!data.users) return { users: [], sessions: {}, workspaces: {}, unclaimed: data }
    for (const id of Object.keys(data.workspaces)) data.workspaces[id] = migrate(data.workspaces[id])
    return data
  } catch (err) {
    console.error(`Could not read ${DB_FILE}; refusing to overwrite it.`, err.message)
    process.exit(1)
  }
}
function save() {
  mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DB_FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(db, null, 2))
  renameSync(tmp, DB_FILE)
}

const db = load()
save()
loadSecret(DATA_DIR)

// ── live sync: a change is pushed over SSE to every open tab of the same account ──
const clients = new Map()
const frame = (ws) => `event: state
data: ${JSON.stringify(ws)}

`
function commit(req, res, status = 200) {
  save()
  const msg = frame(req.ws)
  for (const c of clients.get(req.user.id) ?? []) c.write(msg)
  res.status(status).json(req.ws)
}

const fail = (res, message) => res.status(400).json({ error: message })

const app = express()
app.use(express.json({ limit: '100kb' }))

const publicUser = (u) => ({ id: u.id, name: u.name, hasPassword: Boolean(u.hash) })
function startSession(res, user) {
  const token = newToken()
  db.sessions[tokenKey(token)] = user.id
  save()
  setCookie(res, token)
  res.json({ user: publicUser(user) })
}
const currentUser = (req) => {
  const token = readCookie(req)
  const id = token && db.sessions[tokenKey(token)]
  return id ? db.users.find((u) => u.id === id) : null
}
const LOCKED = 'Too many wrong codes — the vault is locked for a few minutes'

// A new vault is claimed by choosing a code nobody else uses.
app.post('/api/auth/register', (req, res) => {
  const fields = readCredentials(req.body ?? {}, { register: true })
  if (typeof fields === 'string') return fail(res, fields)
  if (isLocked(req.ip)) return res.status(429).json({ error: LOCKED })
  const key = codeKey(fields.code)
  if (db.users.some((u) => u.codeKey === key)) {
    // answering this reveals that the code exists, so it counts as a guess
    noteFailure(req.ip)
    return res.status(409).json({ error: 'That code already opens another vault — choose a different one' })
  }
  const user = {
    id: randomUUID(),
    name: fields.name,
    codeKey: key,
    ...(fields.password ? hashPassword(fields.password) : {}),
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  db.workspaces[user.id] = db.unclaimed ? migrate(db.unclaimed) : emptyWorkspace()
  delete db.unclaimed
  startSession(res.status(201), user)
})

app.post('/api/auth/login', (req, res) => {
  const fields = readCredentials(req.body ?? {})
  if (typeof fields === 'string') return fail(res, fields)
  if (isLocked(req.ip)) return res.status(429).json({ error: LOCKED })
  const key = codeKey(fields.code)
  const user = db.users.find((u) => u.codeKey === key)
  if (!user) {
    noteFailure(req.ip)
    return res.status(401).json({ error: 'No vault opens with that code' })
  }
  if (user.hash) {
    if (!fields.password) return res.status(401).json({ error: 'Code accepted — this vault also needs its password', needsPassword: true })
    if (!checkPassword(fields.password, user)) {
      noteFailure(req.ip)
      return res.status(401).json({ error: 'Wrong password', needsPassword: true })
    }
  }
  clearFailures(req.ip)
  startSession(res, user)
})

app.post('/api/auth/logout', (req, res) => {
  const token = readCookie(req)
  if (token && db.sessions[tokenKey(token)]) {
    delete db.sessions[tokenKey(token)]
    save()
  }
  clearCookie(res)
  res.json({ user: null })
})

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req)
  res.json({ user: user ? publicUser(user) : null })
})

// everything below needs a signed-in account and only ever touches that account's workspace
app.use('/api', (req, res, next) => {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in first' })
  req.user = user
  req.ws = db.workspaces[user.id]
  next()
})

app.get('/api/state', (req, res) => res.json(req.ws))

app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
  res.flushHeaders()
  res.write(frame(req.ws))
  const mine = clients.get(req.user.id) ?? new Set()
  clients.set(req.user.id, mine.add(res))
  const ping = setInterval(() => res.write(': ping\n\n'), 25000)
  req.on('close', () => {
    clearInterval(ping)
    mine.delete(res)
  })
})

// folders, works, their clocks and the focus slot
const store = fileStore(DATA_DIR)
workspaceRoutes(app, { commit, fail, store })
// task sheets and finished work attached to a work
fileRoutes(app, { commit, fail, store })

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

app.listen(PORT, () => console.log(`Task Console API on http://localhost:${PORT} · data in ${DB_FILE}`))
