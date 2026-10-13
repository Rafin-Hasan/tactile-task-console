export const PRI = { high: 'High', med: 'Medium', low: 'Low' }
export const PRI_ORDER = ['high', 'med', 'low']
export const nextPri = (pri) => PRI_ORDER[(PRI_ORDER.indexOf(pri) + 1) % PRI_ORDER.length]

export const KIND = { work: 'Work', temp: 'Temporary', challenge: 'Challenge' }
export const STATUS = { todo: 'Not started', working: 'Under working', done: 'Done' }

// folders nested through parentId
export const childFolders = (folders, parentId) => folders.filter((f) => f.parentId === parentId)
export function pathTo(folders, id) {
  const path = []
  for (let f = folders.find((x) => x.id === id); f; f = folders.find((x) => x.id === f.parentId)) path.unshift(f)
  return path
}
// done / total works in a folder, counting everything in its subfolders too
export function folderProgress(folders, works, id) {
  const inside = new Set([id])
  for (let grew = true; grew; ) {
    grew = false
    for (const f of folders) {
      if (!inside.has(f.id) && inside.has(f.parentId)) {
        inside.add(f.id)
        grew = true
      }
    }
  }
  const mine = works.filter((w) => inside.has(w.folderId))
  return { total: mine.length, done: mine.filter((w) => w.status === 'done').length }
}

// bookmarked first, then by priority; finished works sink to the end
export function sortWorks(works) {
  const rank = (w) => (w.status === 'done' ? 10 : 0) + (w.bookmarked ? 0 : 3) + PRI_ORDER.indexOf(w.pri)
  return [...works].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt))
}
