import express from 'express'
import { randomUUID } from 'node:crypto'

const MAX_FILES_PER_WORK = 30
const ROLES = ['task', 'work']
// Only these are shown inside the browser; anything else is always downloaded, so an
// uploaded HTML or script file can never run on this site.
const INLINE = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain']

const header = (req, name) => {
  try {
    return decodeURIComponent(req.get(name) ?? '')
  } catch {
    return ''
  }
}

// Attachments are stored under files/<account>/<file id>; the name a person gave the file
// is only ever metadata, never part of a storage key.
export function fileRoutes(app, { commit, fail, storage, fileKey }) {
  const find = (req, res) => {
    const work = req.ws.works.find((w) => w.id === req.params.id)
    if (!work) res.status(404).json({ error: 'Work not found' })
    return work
  }

  // The file travels as the raw request body; its name, type and role come in headers.
  app.post('/api/works/:id/files', express.raw({ type: () => true, limit: `${storage.maxFileMb}mb` }), async (req, res) => {
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
    await storage.putFile(fileKey(req.user.id, file.id), req.body)
    work.files.push(file)
    commit(req, res, 201)
  })

  app.get('/api/works/:id/files/:fileId', async (req, res) => {
    const work = find(req, res)
    if (!work) return
    const file = (work.files ?? []).find((f) => f.id === req.params.fileId)
    if (!file) return res.status(404).json({ error: 'File not found' })
    const bytes = await storage.getFile(fileKey(req.user.id, file.id))
    if (!bytes) return res.status(404).json({ error: 'The stored file is missing' })
    const inline = INLINE.includes(file.type) && req.query.download === undefined
    res.set({
      'Content-Type': inline ? file.type : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    })
    // the browser's PDF viewer refuses to run inside a sandbox, so PDFs are exempt
    if (file.type !== 'application/pdf') res.set('Content-Security-Policy', "sandbox; default-src 'none'")
    res.end(bytes)
  })

  app.delete('/api/works/:id/files/:fileId', async (req, res) => {
    const work = find(req, res)
    if (!work) return
    const file = (work.files ?? []).find((f) => f.id === req.params.fileId)
    if (!file) return res.status(404).json({ error: 'File not found' })
    await storage.removeFiles([fileKey(req.user.id, file.id)])
    work.files = work.files.filter((f) => f.id !== file.id)
    commit(req, res)
  })
}
