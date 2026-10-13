import { randomUUID } from 'node:crypto'

const PRIORITIES = ['high', 'med', 'low']
const STATUSES = ['todo', 'working', 'done']
const KINDS = ['work', 'temp', 'challenge']
const MAX_DEPTH = 5

// A workspace: folders (nested through parentId) and works.
// kind 'work' lives in a folder; 'temp' is a stopwatch work; 'challenge' is a countdown work.
export const emptyWorkspace = () => ({
  folders: [],
  works: [],
  focusId: null,
  session: { minutes: 25, running: false, startedAt: null, accumulated: 0 },
})

// Workspaces saved before folders existed held { tasks, done }. Real tasks are carried over
// into a folder per project; the six built-in sample tasks are dropped.
export function migrate(ws) {
  if (ws.works) return ws
  const out = emptyWorkspace()
  if (ws.session) out.session = ws.session
  const isSample = (t) => /^t[1-6]$/.test(t.id)
  const folderFor = (name) => {
    let f = out.folders.find((x) => x.name === name)
    if (!f) {
      f = { id: randomUUID(), name, parentId: null, pri: 'med', status: 'todo', bookmarked: false, createdAt: new Date().toISOString() }
      out.folders.push(f)
    }
    return f.id
  }
  const carry = (t, status) =>
    out.works.push({
      id: t.id,
      title: t.title,
      kind: 'work',
      folderId: folderFor(t.project || 'Imported'),
      pri: PRIORITIES.includes(t.pri) ? t.pri : 'med',
      status,
      bookmarked: false,
      dueAt: t.dueAt ?? null,
      limitMin: null,
      spentMs: 0,
      startedAt: null,
      createdAt: t.createdAt ?? new Date().toISOString(),
      completedAt: t.completedAt ?? null,
    })
  for (const t of ws.tasks ?? []) if (!isSample(t)) carry(t, 'todo')
  for (const t of ws.done ?? []) if (!isSample(t)) carry(t, 'done')
  return out
}

// ── validation ──
function readMarks(body) {
  const out = {}
  if (body.pri !== undefined) {
    if (!PRIORITIES.includes(body.pri)) return `pri must be one of ${PRIORITIES.join(', ')}`
    out.pri = body.pri
  }
  if (body.bookmarked !== undefined) {
    if (typeof body.bookmarked !== 'boolean') return 'bookmarked must be true or false'
    out.bookmarked = body.bookmarked
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return `status must be one of ${STATUSES.join(', ')}`
    out.status = body.status
  }
  return out
}
function readText(value, label, max) {
  if (typeof value !== 'string' || !value.trim()) return { error: `${label} is required` }
  return { text: value.trim().slice(0, max) }
}
function readDue(value) {
  if (value === null || value === '') return { dueAt: null }
  if (Number.isNaN(Date.parse(value))) return { error: 'dueAt must be a date or null' }
  return { dueAt: new Date(value).toISOString() }
}

// ── clocks ──
// Timed works store timestamps, never ticking counters: elapsed = spentMs + (now - startedAt).
function stopClock(w, now) {
  if (!w.startedAt) return
  w.spentMs += now - w.startedAt
  w.startedAt = null
}
function setStatus(w, status, now) {
  if (status === w.status) return null
  const timed = w.kind !== 'work'
  if (status === 'working') {
    // reopening a finished challenge is a fresh attempt
    if (w.status === 'done' && w.kind === 'challenge') w.spentMs = 0
    w.completedAt = null
    if (timed && !w.startedAt) w.startedAt = now
  } else if (status === 'todo') {
    if (w.kind === 'challenge' && w.status === 'working') return 'A running challenge cannot be paused — finish it or reset it'
    stopClock(w, now)
    if (w.kind === 'challenge') w.spentMs = 0
    w.completedAt = null
  } else {
    stopClock(w, now)
    w.completedAt = new Date(now).toISOString()
  }
  w.status = status
  return null
}

export function workspaceRoutes(app, { commit, fail, dropFiles }) {
  const missing = (res, what) => res.status(404).json({ error: `${what} not found` })
  const depthOf = (ws, id) => {
    let depth = 0
    for (let f = ws.folders.find((x) => x.id === id); f; f = ws.folders.find((x) => x.id === f.parentId)) depth++
    return depth
  }

  // ── folders ──
  app.post('/api/folders', (req, res) => {
    const { ws, body = {} } = req
    const name = readText(body.name, 'A folder name', 60)
    if (name.error) return fail(res, name.error)
    const parentId = body.parentId ?? null
    if (parentId !== null && !ws.folders.some((f) => f.id === parentId)) return missing(res, 'Parent folder')
    if (depthOf(ws, parentId) >= MAX_DEPTH) return fail(res, `Folders can nest ${MAX_DEPTH} levels deep at most`)
    const marks = readMarks(body)
    if (typeof marks === 'string') return fail(res, marks)
    ws.folders.push({ id: randomUUID(), name: name.text, parentId, pri: 'med', status: 'todo', bookmarked: false, ...marks, createdAt: new Date().toISOString() })
    commit(req, res, 201)
  })

  app.patch('/api/folders/:id', (req, res) => {
    const folder = req.ws.folders.find((f) => f.id === req.params.id)
    if (!folder) return missing(res, 'Folder')
    const body = req.body ?? {}
    const marks = readMarks(body)
    if (typeof marks === 'string') return fail(res, marks)
    if (body.name !== undefined) {
      const name = readText(body.name, 'A folder name', 60)
      if (name.error) return fail(res, name.error)
      folder.name = name.text
    }
    Object.assign(folder, marks)
    commit(req, res)
  })

  // deleting a folder removes everything inside it
  app.delete('/api/folders/:id', (req, res) => {
    const { ws } = req
    if (!ws.folders.some((f) => f.id === req.params.id)) return missing(res, 'Folder')
    const gone = new Set([req.params.id])
    for (let grew = true; grew; ) {
      grew = false
      for (const f of ws.folders) if (!gone.has(f.id) && gone.has(f.parentId)) grew = gone.add(f.id) && true
    }
    ws.folders = ws.folders.filter((f) => !gone.has(f.id))
    dropFiles(req.user.id, ws.works.filter((w) => gone.has(w.folderId)))
    ws.works = ws.works.filter((w) => !gone.has(w.folderId))
    if (!ws.works.some((w) => w.id === ws.focusId)) ws.focusId = null
    commit(req, res)
  })

  // ── works ──
  app.post('/api/works', (req, res) => {
    const { ws, body = {} } = req
    const title = readText(body.title, 'A title', 120)
    if (title.error) return fail(res, title.error)
    if (!KINDS.includes(body.kind)) return fail(res, `kind must be one of ${KINDS.join(', ')}`)
    const marks = readMarks(body)
    if (typeof marks === 'string') return fail(res, marks)
    let folderId = null
    if (body.kind === 'work') {
      if (!ws.folders.some((f) => f.id === body.folderId)) return fail(res, 'A work has to be added inside a folder')
      folderId = body.folderId
    }
    let limitMin = null
    if (body.kind === 'challenge') {
      if (!Number.isInteger(body.limitMin) || body.limitMin < 1 || body.limitMin > 1440) return fail(res, 'A challenge needs a time limit of 1-1440 minutes')
      limitMin = body.limitMin
    }
    const due = readDue(body.dueAt ?? null)
    if (due.error) return fail(res, due.error)
    ws.works.push({
      id: randomUUID(),
      title: title.text,
      kind: body.kind,
      folderId,
      pri: marks.pri ?? 'med',
      status: 'todo',
      bookmarked: marks.bookmarked ?? false,
      dueAt: due.dueAt,
      limitMin,
      spentMs: 0,
      startedAt: null,
      files: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    })
    commit(req, res, 201)
  })

  app.patch('/api/works/:id', (req, res) => {
    const work = req.ws.works.find((w) => w.id === req.params.id)
    if (!work) return missing(res, 'Work')
    const body = req.body ?? {}
    const read = readMarks(body)
    if (typeof read === 'string') return fail(res, read)
    const { status, ...marks } = read
    if (body.title !== undefined) {
      const title = readText(body.title, 'A title', 120)
      if (title.error) return fail(res, title.error)
      work.title = title.text
    }
    if (body.dueAt !== undefined) {
      const due = readDue(body.dueAt)
      if (due.error) return fail(res, due.error)
      work.dueAt = due.dueAt
    }
    if (status) {
      const refused = setStatus(work, status, Date.now())
      if (refused) return fail(res, refused)
    }
    Object.assign(work, marks)
    commit(req, res)
  })

  app.delete('/api/works/:id', (req, res) => {
    const { ws } = req
    if (!ws.works.some((w) => w.id === req.params.id)) return missing(res, 'Work')
    dropFiles(req.user.id, ws.works.filter((w) => w.id === req.params.id))
    ws.works = ws.works.filter((w) => w.id !== req.params.id)
    if (ws.focusId === req.params.id) ws.focusId = null
    commit(req, res)
  })

  // start / pause / reset the clock of a temporary or challenge work
  app.post('/api/works/:id/timer', (req, res) => {
    const work = req.ws.works.find((w) => w.id === req.params.id)
    if (!work) return missing(res, 'Work')
    if (work.kind === 'work') return fail(res, 'Only temporary and challenge works have a clock')
    const now = Date.now()
    const action = req.body?.action
    if (action === 'start') {
      const refused = setStatus(work, 'working', now)
      if (refused) return fail(res, refused)
      if (!work.startedAt) work.startedAt = now
    } else if (action === 'pause') {
      if (work.kind === 'challenge') return fail(res, 'A running challenge cannot be paused — finish it or reset it')
      stopClock(work, now)
    } else if (action === 'reset') {
      Object.assign(work, { spentMs: 0, startedAt: null, status: 'todo', completedAt: null })
    } else {
      return fail(res, 'action must be start, pause or reset')
    }
    commit(req, res)
  })

  app.put('/api/focus', (req, res) => {
    const id = req.body?.id ?? null
    if (id !== null && !req.ws.works.some((w) => w.id === id)) return missing(res, 'Work')
    req.ws.focusId = id
    commit(req, res)
  })
}
