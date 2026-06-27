import { encryptField, decryptField } from './crypto'
import * as demoDb from './demo-db'

const AUTH_BASE = 'https://api.geduma.com/auth'
const CRUD_BASE = 'https://api.geduma.com/gpass'
const KEY = import.meta.env.VITE_API_AUTH_KEY
const FETCH_TIMEOUT = 10000

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

function isDemoMode() {
  try {
    const stored = localStorage.getItem('gpass_user')
    if (!stored) return false
    return JSON.parse(stored).demo === true
  } catch {
    return false
  }
}

async function getToken(email) {
  const res = await fetchWithTimeout(`${AUTH_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'gpass', user: email, key: KEY })
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
    tags: entry.tags || [],
    createdAt: entry.createdAt || entry.created,
    updatedAt: entry.updatedAt || entry.updated
  }
}

async function decryptEntry(entry, email, salt) {
  const plain = entry.encrypted
    ? await decryptField({ ciphertext: entry.password, iv: entry.iv }, email, salt)
    : entry.password
  return normalizeEntry(entry, plain)
}

export async function fetchEntries(owner, query, email, salt) {
  if (isDemoMode()) {
    let entries = await demoDb.getAll(owner, query)
    if (entries.length === 0) {
      const samples = demoDb.getSampleTemplates()
      for (const s of samples) {
        const { ciphertext, iv } = await encryptField(s.password, email, salt)
        await demoDb.create({ ...s, password: ciphertext, encrypted: true, iv, owner })
      }
      entries = await demoDb.getAll(owner, query)
    }
    const decrypted = await Promise.all(entries.map(e => decryptEntry(e, email, salt)))
    return decrypted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  const token = await getToken(email)
  const params = new URLSearchParams({ owner })
  if (query) params.set('q', query)

  const res = await fetchWithTimeout(`${CRUD_BASE}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.status === 204) return []
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to fetch entries')

  const decrypted = await Promise.all(json.data.map(e => decryptEntry(e, email, salt)))
  return decrypted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function createEntry({ title, username, password, strength, owner, tags }, email, salt) {
  const { ciphertext, iv } = await encryptField(password, email, salt)

  if (isDemoMode()) {
    const entry = await demoDb.create({
      title, username: username || '', password: ciphertext,
      strength: strength || 'strong', encrypted: true, iv, owner, tags
    })
    return {
      _id: entry._id,
      title,
      username: username || '',
      password,
      strength: strength || 'strong',
      encrypted: "true",
      iv,
      owner,
      tags: tags || [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }
  }

  const now = new Date().toISOString()
  const token = await getToken(email)
  const body = {
    title,
    username: username || '',
    password: ciphertext,
    strength: strength || 'strong',
    encrypted: "true",
    iv,
    owner,
    ...(tags && { tags })
  }
  const res = await fetchWithTimeout(`${CRUD_BASE}`, {
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
    tags: tags || [],
    createdAt: now,
    updatedAt: now
  }
}

export async function updateEntry(id, fields, email, salt) {
  const body = { ...fields }

  if (body.password) {
    const { ciphertext, iv } = await encryptField(body.password, email, salt)
    body.password = ciphertext
    body.encrypted = "true"
    body.iv = iv
  }

  if (isDemoMode()) {
    const updated = await demoDb.update(id, body)
    return decryptEntry(updated, email, salt)
  }

  const token = await getToken(email)
  const res = await fetchWithTimeout(`${CRUD_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to update entry')

  return decryptEntry(json.data, email, salt)
}

export async function deleteEntry(id, owner, email) {
  if (isDemoMode()) {
    await demoDb.remove(id)
    return
  }
  const token = await getToken(email)
  const res = await fetchWithTimeout(`${CRUD_BASE}/${id}?owner=${encodeURIComponent(owner)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (res.status === 204) return
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to delete entry')
}
