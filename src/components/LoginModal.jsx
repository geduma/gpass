import { useState, useEffect } from 'react'
import { fetchProviders, startLogin } from '../hooks/useAuth'

const APP_ID = import.meta.env.VITE_APP_ID

export default function LoginModal({ restrictedMsg }) {
  const [providers, setProviders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProviders(APP_ID)
      .then(data => {
        setProviders(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function handleLogin(providerId) {
    startLogin(APP_ID, providerId)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content login-modal">
        <h2>Sign In</h2>
        <p className="login-subtitle">Choose a provider to continue</p>

        {loading && <p className="login-loading">Loading providers...</p>}

        {error && <p className="login-error">{error}</p>}

        {!loading && !error && providers.length === 0 && (
          <p className="login-error">No providers available</p>
        )}

        {restrictedMsg && <p className="login-error restricted-banner">{restrictedMsg}</p>}

        <p className="login-restricted">Access is restricted to permitted users</p>

        <div className="login-providers">
          {providers.map(p => (
            <button
              key={p.providerId}
              className="login-provider-btn"
              onClick={() => handleLogin(p.providerId)}
            >
              {p.icon && <img src={p.icon} alt="" className="provider-icon" />}
              {p.displayName || p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
