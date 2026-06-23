import { useState, useEffect, useCallback } from 'react'
import { sha256 } from '../utils/hash'

const AUTH_API = 'https://api.geduma.com/auth'
const APP_ID = import.meta.env.VITE_APP_ID
const STORAGE_KEY = 'gpass_user'

export async function fetchProviders(appId) {
  const res = await fetch(`${AUTH_API}/providers/${appId}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Error al obtener providers')
  return json.data
}

export async function startLogin(appId, providerId) {
  const res = await fetch(`${AUTH_API}/login/${appId}/${providerId}`, {
    method: 'POST'
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.msg || 'Error al iniciar login')
  window.location.href = json.data.redirect
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [providers, setProviders] = useState([])

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
    setProviders([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { user, providers, setProviders, logout }
}
