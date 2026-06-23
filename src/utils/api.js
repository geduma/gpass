import { sha256 } from './hash'
import { encryptField, decryptField } from './crypto'

const API_BASE = 'https://api.geduma.com'
const AUTH = {
  name: 'gpass',
  user: 'geduma',
  key: import.meta.env.VITE_API_AUTH_KEY
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

let mockStore = []

async function getToken() {
  const res = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AUTH)
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg)
  return json.data.token
}

function mockDelay() {
  return new Promise(r => setTimeout(r, 200 + Math.random() * 300))
}

export async function fetchEntries(owner, query, securityOnly, email) {
  if (USE_MOCK) {
    await mockDelay()
    let result = [...mockStore]
    result = result.filter(e => e.owner === owner)
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q)
      )
    }
    if (securityOnly) {
      result = result.filter(e => e.strength === 'weak' || e.compromised)
    }
    const decrypted = await Promise.all(result.map(async e => {
      if (e.encrypted) {
        const plain = await decryptField(
          { ciphertext: e.password, iv: e.iv },
          email
        )
        return { ...e, password: plain }
      }
      return e
    }))
    return decrypted.sort((a, b) => new Date(b.updated) - new Date(a.updated))
  }

  const token = await getToken()
  const params = new URLSearchParams({ owner })
  if (query) params.set('q', query)
  if (securityOnly) params.set('security', 'true')

  const res = await fetch(`${API_BASE}/gpass?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.status === 204) return []
  if (res.status === 429) throw new Error('Demasiadas solicitudes. Intenta de nuevo.')
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Error al obtener entradas')

  const decrypted = await Promise.all(json.data.map(async entry => {
    if (entry.encrypted) {
      const plain = await decryptField(
        { ciphertext: entry.password, iv: entry.iv },
        email
      )
      return { ...entry, password: plain }
    }
    return entry
  }))
  return decrypted.sort((a, b) => new Date(b.updated) - new Date(a.updated))
}

export async function getEntry(id, owner, email) {
  if (USE_MOCK) {
    await mockDelay()
    const entry = mockStore.find(e => e._id === id && e.owner === owner)
    if (!entry) throw new Error('Entry not found')
    if (entry.encrypted) {
      const plain = await decryptField(
        { ciphertext: entry.password, iv: entry.iv },
        email
      )
      return { ...entry, password: plain }
    }
    return { ...entry }
  }

  const token = await getToken()
  const res = await fetch(`${API_BASE}/gpass/${id}?owner=${owner}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Error al obtener entrada')
  const entry = json.data
  if (entry.encrypted) {
    const plain = await decryptField(
      { ciphertext: entry.password, iv: entry.iv },
      email
    )
    return { ...entry, password: plain }
  }
  return entry
}

export async function createEntry({ title, username, password, strength, owner }, email) {
  const { ciphertext, iv } = await encryptField(password, email)

  if (USE_MOCK) {
    await mockDelay()
    const entry = {
      _id: crypto.randomUUID(),
      title,
      username,
      password: ciphertext,
      strength: strength || 'strong',
      compromised: false,
      encrypted: true,
      iv,
      owner,
      created: new Date().toISOString().split('T')[0],
      updated: new Date().toISOString().split('T')[0]
    }
    mockStore.push(entry)
    return { ...entry, password }
  }

  const token = await getToken()
  const body = {
    title,
    username,
    password: ciphertext,
    strength: strength || 'strong',
    encrypted: true,
    iv,
    owner
  }
  const res = await fetch(`${API_BASE}/gpass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Error al crear entrada')
  return { ...json.data, password }
}

export async function updateEntry(id, fields, email) {
  const body = { ...fields }

  if (body.password) {
    const { ciphertext, iv } = await encryptField(body.password, email)
    body.password = ciphertext
    body.encrypted = true
    body.iv = iv
  }

  if (USE_MOCK) {
    await mockDelay()
    const idx = mockStore.findIndex(e => e._id === id)
    if (idx === -1) throw new Error('Entry not found')
    const updated = {
      ...mockStore[idx],
      ...body,
      updated: new Date().toISOString().split('T')[0]
    }
    mockStore[idx] = updated
    const plainPass = fields.password || await decryptField(
      { ciphertext: updated.password, iv: updated.iv },
      email
    )
    return { ...updated, password: plainPass }
  }

  const token = await getToken()
  body.updated = new Date().toISOString().split('T')[0]
  const res = await fetch(`${API_BASE}/gpass/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Error al actualizar entrada')
  const plainPass = fields.password || await decryptField(
    { ciphertext: json.data.password, iv: json.data.iv },
    email
  )
  return { ...json.data, password: plainPass }
}

export async function deleteEntry(id, owner) {
  if (USE_MOCK) {
    await mockDelay()
    mockStore = mockStore.filter(e => e._id !== id)
    return
  }

  const token = await getToken()
  const res = await fetch(`${API_BASE}/gpass/${id}?owner=${owner}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Error al eliminar entrada')
}
