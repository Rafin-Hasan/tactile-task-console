import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const COOKIE = 'tc_session'
const MAX_AGE_S = 60 * 60 * 24 * 30

// A vault code is both the account's identity and its key, so it has to be found by lookup.
// The database stores only an HMAC of it, keyed with a secret kept in a separate file.
let secret
export function loadSecret(dataDir) {
  const file = join(dataDir, 'secret.key')
  if (!existsSync(file)) {
    mkdirSync(dataDir, { recursive: true })
    writeFileSync(file, randomBytes(32).toString('hex'), { mode: 0o600 })
  }
  secret = readFileSync(file, 'utf8').trim()
}
export const codeKey = (code) => createHmac('sha256', secret).update(code).digest('hex')

// The optional extra password is stored as a per-user salt and scrypt hash.
export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}
export function checkPassword(password, user) {
  const given = scryptSync(password, user.salt, 64)
  const stored = Buffer.from(user.hash, 'hex')
  return given.length === stored.length && timingSafeEqual(given, stored)
}

// The browser holds a random token; the database only keeps its SHA-256.
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
export const setCookie = (res, token) =>
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_S}`)
export const clearCookie = (res) => res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)

export const CODE_MIN = 4
export const CODE_MAX = 8
export function readCredentials(body, { register = false } = {}) {
  const code = typeof body.code === 'string' ? body.code : ''
  if (!new RegExp(`^\\d{${CODE_MIN},${CODE_MAX}}$`).test(code)) return `The code must be ${CODE_MIN}-${CODE_MAX} digits`
  const password = typeof body.password === 'string' ? body.password : ''
  if (password.length > 200) return 'Password is too long'
  if (!register) return { code, password }
  if (password && password.length < 6) return 'The extra password needs at least 6 characters'
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : 'Operator'
  return { code, password, name }
}

// A short code is easy to guess, so guessing is throttled per client address:
// 8 misses lock that address out for 5 minutes.
const fails = new Map()
const WINDOW_MS = 5 * 60 * 1000
export function isLocked(who) {
  const f = fails.get(who)
  if (f && Date.now() - f.first > WINDOW_MS) fails.delete(who)
  return (fails.get(who)?.count ?? 0) >= 8
}
export function noteFailure(who) {
  const f = fails.get(who)
  if (f) f.count++
  else fails.set(who, { count: 1, first: Date.now() })
}
export const clearFailures = (who) => fails.delete(who)
