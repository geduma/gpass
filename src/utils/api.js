import { encryptField, decryptField } from './crypto'

const AUTH_BASE = 'https://api.geduma.com/auth'
const CRUD_BASE = 'https://api.geduma.com/gpass'
const AUTH = {
  name: 'gpass',
  user: 'geduma',
  key: import.meta.env.VITE_API_AUTH_KEY
}

async function getToken() {
  const res = await fetch(`${AUTH_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AUTH)
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg)
  return json.data.token
}

function normalizeEntry(entry, plainPassword) {
  return {
    _id: entry._id,
    title: entry.title,
    username: entry.username || '',
    password: plainPassword || '',
    strength: entry.strength,
    encrypted: entry.encrypted,
    iv: entry.iv,
    owner: entry.owner,
    createdAt: entry.createdAt || entry.created,
    updatedAt: entry.updatedAt || entry.updated
  }
}

async function decryptEntry(entry, email) {
  const plain = entry.encrypted
    ? await decryptField({ ciphertext: entry.password, iv: entry.iv }, email)
    : entry.password
  return normalizeEntry(entry, plain)
}

export async function fetchEntries(owner, query, email) {
  const token = await getToken()
  const params = new URLSearchParams({ owner })
  if (query) params.set('q', query)

  const res = await fetch(`${CRUD_BASE}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.status === 204) return []
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to fetch entries')

  const decrypted = await Promise.all(json.data.map(e => decryptEntry(e, email)))
  return decrypted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function getEntry(id, owner, email) {
  const token = await getToken()
  const res = await fetch(`${CRUD_BASE}/${id}?owner=${owner}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to fetch entry')
  return decryptEntry(json.data, email)
}

export async function createEntry({ title, username, password, strength, owner }, email) {
  const { ciphertext, iv } = await encryptField(password, email)
  const now = new Date().toISOString()

  const token = await getToken()
  const body = {
    title,
    username: username || '',
    password: ciphertext,
    strength: strength || 'strong',
    encrypted: "true",
    iv,
    owner
  }
  const res = await fetch(`${CRUD_BASE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to create entry')

  return {
    _id: json.data.id,
    title,
    username: username || '',
    password,
    strength: strength || 'strong',
    encrypted: "true",
    iv,
    owner,
    createdAt: now,
    updatedAt: now
  }
}

export async function updateEntry(id, fields, email) {
  const body = { ...fields }

  if (body.password) {
    const { ciphertext, iv } = await encryptField(body.password, email)
    body.password = ciphertext
    body.encrypted = "true"
    body.iv = iv
  }

  const token = await getToken()
  const res = await fetch(`${CRUD_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to update entry')

  return decryptEntry(json.data, email)
}

export async function deleteEntry(id, owner) {
  const token = await getToken()
  const res = await fetch(`${CRUD_BASE}/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ owner })
  })
  if (res.status === 204) return
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to delete entry')
}
