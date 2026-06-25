import { useState, useEffect, useCallback } from 'react'
import { sha256 } from '../utils/hash'

const AUTH_API = 'https://api.geduma.com/auth'
const APP_ID = import.meta.env.VITE_APP_ID
const STORAGE_KEY = 'gpass_user'

export async function fetchProviders(appId) {
  const res = await fetch(`${AUTH_API}/providers/${appId}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to get providers')
  return json.data
}

export async function startLogin(appId, providerId) {
  const res = await fetch(`${AUTH_API}/login/${appId}/${providerId}`, {
    method: 'POST'
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Failed to start login')
  window.location.href = json.data.redirect
}

export async function startDemo() {
  const ownerHash = await sha256('demo@demo.local')
  const userData = {
    email: 'demo@demo.local',
    displayName: 'Demo User',
    picture: '',
    provider: 'demo',
    ownerHash,
    demo: true
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
  return userData
}

export function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionToken = params.get('session_token')

    if (sessionToken) {
      window.history.replaceState({}, '', window.location.pathname)
      fetch(`${AUTH_API}/session/${sessionToken}`)
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
    } else {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { user, logout, setUser }
}
