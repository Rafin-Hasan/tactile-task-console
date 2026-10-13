import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const COOKIE = 'tc_session'
const MAX_AGE_S = 60 * 60 * 24 * 30

// A vault code is both the account's identity and its key, so it has to be found by lookup.
// Only an HMAC of it is stored, keyed with a secret kept apart from the accounts.
export const codeKey = (secret, code) => createHmac('sha256', secret).update(code).digest('hex')

// The optional extra password is stored as a per-user salt and scrypt hash.
export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}
export function checkPassword(password, user) {
  const given = scryptSync(password, user.salt, 64)
  const stored = Buffer.from(user.hash, 'hex')
  return given.length === stored.length && timingSafeEqual(given, stored)
}

// The browser holds a random token; storage only keeps its SHA-256.
export const newToken = () => randomBytes(32).toString('hex')
export const tokenKey = (token) => createHash('sha256').update(token).digest('hex')

export function readCookie(req) {
  const raw = req.headers.cookie || ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === COOKIE) return v.join('=')
  }
  return null
}
const flags = (secure) => `HttpOnly; SameSite=Lax; Path=/${secure ? '; Secure' : ''}`
export const setCookie = (res, token, secure) => res.setHeader('Set-Cookie', `${COOKIE}=${token}; ${flags(secure)}; Max-Age=${MAX_AGE_S}`)
export const clearCookie = (res, secure) => res.setHeader('Set-Cookie', `${COOKIE}=; ${flags(secure)}; Max-Age=0`)

export const CODE_MAX = 8
// Codes are `min` to CODE_MAX digits, for creating a vault and for opening one alike
// (min is longer when the app is reachable from the internet).
export function readCredentials(body, { register = false, min = 4 } = {}) {
  const code = typeof body.code === 'string' ? body.code : ''
  if (!new RegExp(`^\\d{${min},${CODE_MAX}}$`).test(code)) return `The code must be ${min}-${CODE_MAX} digits`
  const password = typeof body.password === 'string' ? body.password : ''
  if (password.length > 200) return 'Password is too long'
  if (!register) return { code, password }
  if (password && password.length < 6) return 'The extra password needs at least 6 characters'
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : 'Operator'
  return { code, password, name }
}

// A short code is easy to guess, so guessing is throttled per client address: 8 misses lock
// that address out for 5 minutes. The counters live in the auth document, so the lockout
// also holds across serverless instances.
const WINDOW_MS = 5 * 60 * 1000
const LIMIT = 8
export function isLocked(auth, who) {
  const f = auth.fails?.[who]
  return Boolean(f) && Date.now() - f.first <= WINDOW_MS && f.count >= LIMIT
}
export function noteFailure(auth, who) {
  auth.fails ??= {}
  const now = Date.now()
  for (const [k, f] of Object.entries(auth.fails)) if (now - f.first > WINDOW_MS) delete auth.fails[k]
  const f = auth.fails[who]
  if (f) f.count++
  else auth.fails[who] = { count: 1, first: now }
}
export function clearFailures(auth, who) {
  if (auth.fails) delete auth.fails[who]
}
