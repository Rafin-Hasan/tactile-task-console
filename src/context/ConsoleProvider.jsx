import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { sfx } from '../lib/sfx'
import { ConsoleContext } from './console'

const EMPTY = { folders: [], works: [], focusId: null, session: { minutes: 25, running: false, startedAt: null, accumulated: 0 } }
const POLL_MS = 6000
const patchById = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch } : x))

export default function ConsoleProvider({ children }) {
  const [state, setState] = useState(EMPTY)
  // undefined while the saved session is being checked, null when signed out
  const [user, setUser] = useState(undefined)
  // 'connecting' until the first snapshot, then 'live' or 'offline'
  const [link, setLink] = useState('connecting')
  const [error, setError] = useState(null)
  const [sound, setSound] = useState(false)

  // limits the server enforces (they differ between your own machine and the hosted app)
  const [rules, setRules] = useState({ codeMin: 4, codeMax: 8, maxFileMb: 25 })
  const busy = useRef(0)

  useEffect(() => {
    api
      .me()
      .then((r) => {
        setRules(r.rules)
        setUser(r.user)
      })
      .catch(() => setUser(null))
  }, [])

  // Changes made in another tab or device arrive by re-reading the workspace every few
  // seconds while this tab is visible, and at once when it regains focus.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let stopped = false
    const pull = async () => {
      // skip while one of our own saves is in flight, so a stale read cannot overwrite it
      if (document.hidden || busy.current) return
      try {
        const next = await api.state()
        if (stopped || busy.current) return
        setState((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
        setLink('live')
      } catch (err) {
        if (stopped) return
        if (err.status === 401) setUser(null)
        else setLink('offline')
      }
    }
    pull()
    const timer = setInterval(pull, POLL_MS)
    window.addEventListener('focus', pull)
    document.addEventListener('visibilitychange', pull)
    return () => {
      stopped = true
      clearInterval(timer)
      window.removeEventListener('focus', pull)
      document.removeEventListener('visibilitychange', pull)
      setState(EMPTY)
      setLink('connecting')
    }
  }, [userId])

  const play = useCallback(
    (kind) => {
      if (sound) sfx(kind)
    },
    [sound],
  )

  // Apply the change locally right away, then let the server's answer settle it.
  const send = useCallback(async (optimistic, request) => {
    if (optimistic) setState(optimistic)
    busy.current++
    try {
      setState(await request())
      setError(null)
      setLink('live')
      return true
    } catch (err) {
      if (err.status === 401) setUser(null)
      setError(err.message === 'Failed to fetch' ? 'API unreachable — change not saved' : err.message)
      // drop the optimistic guess and show what is really saved
      if (optimistic) api.state().then(setState, () => {})
      return false
    } finally {
      busy.current--
    }
  }, [])

  // sign-in calls resolve to null on success, or { message, needsPassword }
  const auth = useCallback(async (request) => {
    try {
      const reply = await request()
      setRules(reply.rules)
      setUser(reply.user)
      setError(null)
      return null
    } catch (err) {
      return {
        message: err.message === 'Failed to fetch' ? 'API unreachable — is the server running?' : err.message,
        needsPassword: Boolean(err.needsPassword),
      }
    }
  }, [])

  const actions = useMemo(
    () => ({
      login: (fields) => auth(() => api.login(fields)),
      register: (fields) => auth(() => api.register(fields)),
      logout: () => auth(() => api.logout()),
      addFolder: (folder) => send(null, () => api.addFolder(folder)),
      updateFolder: (id, patch) => send((s) => ({ ...s, folders: patchById(s.folders, id, patch) }), () => api.updateFolder(id, patch)),
      deleteFolder: (id) => send(null, () => api.deleteFolder(id)),
      // creates the work, then attaches any task files chosen in the form
      addWork: (work, taskFiles = []) =>
        send(null, async () => {
          let next = await api.addWork(work)
          const id = next.works.at(-1).id
          for (const file of taskFiles) next = await api.uploadFile(id, 'task', file)
          return next
        }),
      uploadFile: (workId, role, file) => send(null, () => api.uploadFile(workId, role, file)),
      deleteFile: (workId, fileId) => send(null, () => api.deleteFile(workId, fileId)),
      updateWork: (id, patch) => send((s) => ({ ...s, works: patchById(s.works, id, patch) }), () => api.updateWork(id, patch)),
      deleteWork: (id) => send(null, () => api.deleteWork(id)),
      workTimer: (id, action) => send(null, () => api.workTimer(id, action)),
      setFocusId: (id) => send((s) => ({ ...s, focusId: id }), () => api.setFocus(id)),
      setSession: (session) => send((s) => ({ ...s, session }), () => api.setSession(session)),
    }),
    [send, auth],
  )

  const value = useMemo(
    () => ({ ...state, ...actions, user, rules, link, error, sound, setSound, play }),
    [state, actions, user, rules, link, error, sound, play],
  )
  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>
}
