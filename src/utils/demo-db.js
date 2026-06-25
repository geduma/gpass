const DB_NAME = 'gpass-demo'
const STORE_NAME = 'entries'
const DB_VERSION = 1
const EXPIRY_MS = 15 * 60 * 1000
const MAX_ENTRIES = 5

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function generateId() {
  return 'demo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function clearAll() {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.clear()
  await new Promise(res => { tx.oncomplete = res })
  db.close()
}

async function removeExpired(db) {
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const all = await new Promise(res => {
    const req = store.getAll()
    req.onsuccess = () => res(req.result)
  })
  const now = Date.now()
  let removed = false
  for (const entry of all) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      store.delete(entry._id)
      removed = true
    }
  }
  await new Promise(res => { tx.oncomplete = res })
  return removed
}

export async function getAll(owner, query) {
  const db = await openDb()
  await removeExpired(db)
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const all = await new Promise(res => {
    const req = store.getAll()
    req.onsuccess = () => res(req.result)
  })
  db.close()
  let filtered = all.filter(e => e.owner === owner)
  if (query) {
    const q = query.toLowerCase()
    filtered = filtered.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q)
    )
  }
  return filtered
}

export async function getById(id) {
  const db = await openDb()
  await removeExpired(db)
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const entry = await new Promise(res => {
    const req = store.get(id)
    req.onsuccess = () => res(req.result)
  })
  db.close()
  return entry || null
}

export async function create(data) {
  const db = await openDb()
  await removeExpired(db)
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const count = await new Promise(res => {
    const req = store.count()
    req.onsuccess = () => res(req.result)
  })
  if (count >= MAX_ENTRIES) {
    db.close()
    throw new Error('Demo limit reached. Maximum ' + MAX_ENTRIES + ' entries allowed.')
  }
  const now = new Date().toISOString()
  const entry = {
    _id: generateId(),
    title: data.title,
    username: data.username || '',
    password: data.password,
    strength: data.strength || 'strong',
    encrypted: data.encrypted !== undefined ? data.encrypted : true,
    iv: data.iv || '',
    owner: data.owner,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
    expiresAt: Date.now() + EXPIRY_MS
  }
  const writeTx = db.transaction(STORE_NAME, 'readwrite')
  const writeStore = writeTx.objectStore(STORE_NAME)
  writeStore.add(entry)
  await new Promise(res => { writeTx.oncomplete = res })
  db.close()
  return entry
}

export async function update(id, fields) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const existing = await new Promise(res => {
    const req = store.get(id)
    req.onsuccess = () => res(req.result)
  })
  if (!existing) {
    db.close()
    throw new Error('Entry not found')
  }
  const updated = {
    ...existing,
    ...fields,
    updatedAt: new Date().toISOString()
  }
  store.put(updated)
  await new Promise(res => { tx.oncomplete = res })
  db.close()
  return updated
}

export async function remove(id) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.delete(id)
  await new Promise(res => { tx.oncomplete = res })
  db.close()
}

export function getSampleTemplates() {
  return [
    {
      title: 'GitHub',
      username: 'demo@github.com',
      password: 'gh_demo_123',
      strength: 'strong',
      tags: ['dev']
    },
    {
      title: 'Example Corp',
      username: 'demo@example.com',
      password: 'example_demo_456',
      strength: 'weak',
      tags: ['work']
    }
  ]
}
