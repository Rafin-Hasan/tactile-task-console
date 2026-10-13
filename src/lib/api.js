async function call(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status, needsPassword: Boolean(data?.needsPassword) })
  return data
}

export const api = {
  me: () => call('GET', '/auth/me'),
  register: (fields) => call('POST', '/auth/register', fields),
  login: (fields) => call('POST', '/auth/login', fields),
  logout: () => call('POST', '/auth/logout'),
  state: () => call('GET', '/state'),
  addFolder: (folder) => call('POST', '/folders', folder),
  updateFolder: (id, patch) => call('PATCH', `/folders/${id}`, patch),
  deleteFolder: (id) => call('DELETE', `/folders/${id}`),
  addWork: (work) => call('POST', '/works', work),
  updateWork: (id, patch) => call('PATCH', `/works/${id}`, patch),
  deleteWork: (id) => call('DELETE', `/works/${id}`),
  workTimer: (id, action) => call('POST', `/works/${id}/timer`, { action }),
  // the file is sent as the raw body; its name, type and role travel in headers
  async uploadFile(workId, role, file) {
    const res = await fetch(`/api/works/${workId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'X-File-Type': encodeURIComponent(file.type || 'application/octet-stream'),
        'X-File-Role': role,
      },
      body: file,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw Object.assign(new Error(data?.error || `Upload failed (${res.status})`), { status: res.status })
    return data
  },
  deleteFile: (workId, fileId) => call('DELETE', `/works/${workId}/files/${fileId}`),
  fileUrl: (workId, fileId) => `/api/works/${workId}/files/${fileId}`,
  setFocus: (id) => call('PUT', '/focus', { id }),
  setSession: (session) => call('PUT', '/session', session),
}
