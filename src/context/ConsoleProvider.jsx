import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { sfx } from '../lib/sfx'
import { ConsoleContext } from './console'

const EMPTY = { folders: [], works: [], focusId: null, session: { minutes: 25, running: false, startedAt: null, accumulated: 0 } }
const patchById = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch } : x))

export default function ConsoleProvider({ children }) {
  const [state, setState] = useState(EMPTY)
  // undefined while the saved session is being checked, null when signed out
  const [user, setUser] = useState(undefined)
  // 'connecting' until the first snapshot, then 'live' or 'offline'
  const [link, setLink] = useState('connecting')
  const [error, setError] = useState(null)
  const [sound, setSound] = useState(false)

  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
  }, [])

  // The server pushes the full workspace on connect and after every change, from any tab.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const stream = new EventSource('/api/events')
    stream.addEventListener('state', (e) => {
      setState(JSON.parse(e.data))
      setLink('live')
    })
    stream.onerror = () => setLink('offline')
    return () => {
      stream.close()
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
    try {
      setState(await request())
      setError(null)
      return true
    } catch (err) {
      if (err.status === 401) setUser(null)
      setError(err.message === 'Failed to fetch' ? 'API unreachable — change not saved' : err.message)
      // drop the optimistic guess and show what is really saved
      if (optimistic) api.state().then(setState, () => {})
      return false
    }
  }, [])

  // sign-in calls resolve to null on success, or { message, needsPassword }
  const auth = useCallback(async (request) => {
    try {
      setUser((await request()).user)
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
    () => ({ ...state, ...actions, user, link, error, sound, setSound, play }),
    [state, actions, user, link, error, sound, play],
  )
  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>
}
