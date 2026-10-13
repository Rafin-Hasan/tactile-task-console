import { neon } from '@neondatabase/serverless'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Thrown when a document was changed by another request between our read and our write.
export class Conflict extends Error {}

// Storage holds JSON documents ('auth', 'ws/<account>') and attached files ('files/<account>/<id>').
// On your own machine everything is plain files under api/data. Online (when a Postgres URL is
// configured) the same keys live in two database tables, because a serverless host has no disk.

function diskStorage(dir) {
  const path = (key) => join(dir, ...key.split('/'))
  const write = (file, data) => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(`${file}.tmp`, data)
    renameSync(`${file}.tmp`, file)
  }

  // data saved by earlier versions as one db.json is split into the per-account layout once
  const legacy = join(dir, 'db.json')
  if (existsSync(legacy) && !existsSync(path('auth.json'))) {
    const old = JSON.parse(readFileSync(legacy, 'utf8'))
    if (old.users) {
      for (const [id, ws] of Object.entries(old.workspaces ?? {})) write(path(`ws/${id}.json`), JSON.stringify(ws, null, 2))
      write(path('auth.json'), JSON.stringify({ users: old.users, sessions: old.sessions ?? {}, fails: {}, unclaimed: old.unclaimed }, null, 2))
    } else {
      write(path('auth.json'), JSON.stringify({ users: [], sessions: {}, fails: {}, unclaimed: old }, null, 2))
    }
    renameSync(legacy, join(dir, 'db.imported.json'))
  }

  return {
    cloud: false,
    where: dir,
    maxFileMb: 25,
    async readJson(key) {
      const file = path(`${key}.json`)
      return existsSync(file) ? { value: JSON.parse(readFileSync(file, 'utf8')), tag: null } : null
    },
    async writeJson(key, value) {
      write(path(`${key}.json`), JSON.stringify(value, null, 2))
    },
    async putFile(key, bytes) {
      write(path(key), bytes)
    },
    async getFile(key) {
      return existsSync(path(key)) ? readFileSync(path(key)) : null
    },
    async removeFiles(keys) {
      for (const key of keys) rmSync(path(key), { force: true })
    },
    async secret() {
      const file = path('secret.key')
      if (!existsSync(file)) write(file, randomBytes(32).toString('hex'))
      return readFileSync(file, 'utf8').trim()
    },
  }
}

function postgresStorage(url) {
  const sql = neon(url)
  let ready
  const init = () =>
    (ready ??= (async () => {
      await sql`create table if not exists docs (key text primary key, value jsonb not null, version integer not null default 1)`
      await sql`create table if not exists files (key text primary key, bytes bytea not null)`
    })())

  const store = {
    cloud: true,
    where: 'Postgres',
    // a serverless request body is capped at 4.5 MB
    maxFileMb: 4,
    async readJson(key) {
      await init()
      const rows = await sql`select value, version from docs where key = ${key}`
      return rows[0] ? { value: rows[0].value, tag: rows[0].version } : null
    },
    // tag is the version read earlier (null for a document that did not exist yet);
    // the write only lands if nobody else wrote in between
    async writeJson(key, value, tag) {
      await init()
      const json = JSON.stringify(value)
      const rows =
        tag == null
          ? await sql`insert into docs (key, value) values (${key}, ${json}::jsonb) on conflict (key) do nothing returning version`
          : await sql`update docs set value = ${json}::jsonb, version = version + 1 where key = ${key} and version = ${tag} returning version`
      if (rows.length === 0) throw new Conflict()
    },
    async putFile(key, bytes) {
      await init()
      const b64 = bytes.toString('base64')
      await sql`insert into files (key, bytes) values (${key}, decode(${b64}, 'base64')) on conflict (key) do update set bytes = excluded.bytes`
    },
    async getFile(key) {
      await init()
      const rows = await sql`select encode(bytes, 'base64') as b64 from files where key = ${key}`
      return rows[0] ? Buffer.from(rows[0].b64, 'base64') : null
    },
    async removeFiles(keys) {
      await init()
      for (const key of keys) await sql`delete from files where key = ${key}`
    },
    async secret() {
      if (process.env.VAULT_SECRET) return process.env.VAULT_SECRET
      const saved = await store.readJson('secret')
      if (saved) return saved.value.key
      const key = randomBytes(32).toString('hex')
      try {
        await store.writeJson('secret', { key }, null)
        return key
      } catch (err) {
        // another cold start created it first
        if (err instanceof Conflict) return (await store.readJson('secret')).value.key
        throw err
      }
    },
  }
  return store
}

export function createStorage() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (url) return postgresStorage(url)
  // API_DATA_DIR lets tests run against a scratch folder
  return diskStorage(process.env.API_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'api', 'data'))
}
