import express from 'express'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const MAX_FILE_MB = 25
const MAX_FILES_PER_WORK = 30
const ROLES = ['task', 'work']
// Only these are shown inside the browser; anything else is always downloaded, so an
// uploaded HTML or script file can never run on this site.
const INLINE = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain']

// Attachments live on disk under data/files/<account>/<file id>; the name a person gave the
// file is only ever metadata, never part of a path.
export function fileStore(dataDir) {
  const dirFor = (userId) => join(dataDir, 'files', userId)
  return {
    pathFor: (userId, fileId) => join(dirFor(userId), fileId),
    save(userId, fileId, bytes) {
      mkdirSync(dirFor(userId), { recursive: true })
      writeFileSync(join(dirFor(userId), fileId), bytes)
    },
    // remove the stored files of deleted works
    drop(userId, works) {
      for (const w of works) for (const f of w.files ?? []) rmSync(join(dirFor(userId), f.id), { force: true })
    },
  }
}

const header = (req, name) => {
  try {
    return decodeURIComponent(req.get(name) ?? '')
  } catch {
    return ''
  }
}

export function fileRoutes(app, { commit, fail, store }) {
  const find = (req, res) => {
    const work = req.ws.works.find((w) => w.id === req.params.id)
    if (!work) res.status(404).json({ error: 'Work not found' })
    return work
  }

  // The file travels as the raw request body; its name, type and role come in headers.
  app.post('/api/works/:id/files', express.raw({ type: () => true, limit: `${MAX_FILE_MB}mb` }), (req, res) => {
    const work = find(req, res)
    if (!work) return
    const role = header(req, 'X-File-Role')
    if (!ROLES.includes(role)) return fail(res, `role must be one of ${ROLES.join(', ')}`)
    // path separators and control characters never reach the stored name
    const name = [...header(req, 'X-File-Name')].map((ch) => (ch === '/' || ch === '\\' || ch < ' ' ? '_' : ch)).join('').trim().slice(0, 160)
    if (!name) return fail(res, 'The file needs a name')
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return fail(res, 'The file is empty')
    work.files ??= []
    if (work.files.length >= MAX_FILES_PER_WORK) return fail(res, `A work can hold ${MAX_FILES_PER_WORK} files at most`)
    const type = header(req, 'X-File-Type').toLowerCase().slice(0, 100)
    const file = {
      id: randomUUID(),
      name,
      type: /^[\w.+-]+\/[\w.+-]+$/.test(type) ? type : 'application/octet-stream',
      size: req.body.length,
      role,
      addedAt: new Date().toISOString(),
    }
    store.save(req.user.id, file.id, req.body)
    work.files.push(file)
    commit(req, res, 201)
  })

  app.get('/api/works/:id/files/:fileId', (req, res) => {
    const work = find(req, res)
    if (!work) return
    const file = (work.files ?? []).find((f) => f.id === req.params.fileId)
    if (!file) return res.status(404).json({ error: 'File not found' })
    const inline = INLINE.includes(file.type) && req.query.download === undefined
    res.set({
      'Content-Type': inline ? file.type : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    })
    // the browser's PDF viewer refuses to run inside a sandbox, so PDFs are exempt
    if (file.type !== 'application/pdf') res.set('Content-Security-Policy', "sandbox; default-src 'none'")
    res.sendFile(store.pathFor(req.user.id, file.id), (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: 'The stored file is missing' })
    })
  })

  app.delete('/api/works/:id/files/:fileId', (req, res) => {
    const work = find(req, res)
    if (!work) return
    const file = (work.files ?? []).find((f) => f.id === req.params.fileId)
    if (!file) return res.status(404).json({ error: 'File not found' })
    store.drop(req.user.id, [{ files: [file] }])
    work.files = work.files.filter((f) => f.id !== file.id)
    commit(req, res)
  })

  // an upload over the limit lands here instead of crashing the request
  app.use('/api/works/:id/files', (err, _req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: `That file is over the ${MAX_FILE_MB} MB limit` })
    next(err)
  })
}
