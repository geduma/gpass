import { useState, useEffect, useCallback } from 'react'
import { sha256 } from '../utils/hash'

const AUTH_API = 'https://api.geduma.com/auth'
const APP_ID = import.meta.env.VITE_APP_ID
const STORAGE_KEY = 'gpass_user'
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

export async function fetchProviders(appId) {
  const res = await fetchWithTimeout(`${AUTH_API}/providers/${appId}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to get providers')
  return json.data
}

export async function startLogin(appId, providerId) {
  const res = await fetchWithTimeout(`${AUTH_API}/login/${appId}/${providerId}`, {
    method: 'POST'
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to start login')
  window.location.href = json.data.redirect
}

export async function startDemo() {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const salt = btoa(String.fromCharCode(...saltBytes))
  const ownerHash = await sha256('demo@demo.local')
  const userData = {
    email: 'demo@demo.local',
    displayName: 'Demo User',
    picture: '',
    provider: 'demo',
    ownerHash,
    salt,
    demo: true
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
  return userData
}

async function restoreSession() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    const data = JSON.parse(stored)
    if (!data.demo && !data.salt) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const sessionToken = params.get('session_token')

    if (sessionToken) {
      window.history.replaceState({}, '', window.location.pathname)
      fetchWithTimeout(`${AUTH_API}/session/${sessionToken}`)
        .then(res => res.json())
        .then(async json => {
          if (!json.ok) throw new Error(json.msg)
          const data = json.data
          const ownerHash = await sha256(data.email)
          const userData = { ...data, ownerHash }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
          setUser(userData)
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY)
        })
        .finally(() => setLoading(false))
    } else {
      restoreSession()
        .then(u => setUser(u))
        .finally(() => setLoading(false))
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { user, loading, logout, setUser }
}
