import { useState, useEffect } from 'react'
import { fetchProviders, startLogin } from '../hooks/useAuth'

const APP_ID = import.meta.env.VITE_APP_ID

export default function LoginModal() {
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
        <h2>Iniciar sesión</h2>
        <p className="login-subtitle">Elige un proveedor para continuar</p>

        {loading && <p className="login-loading">Cargando proveedores...</p>}

        {error && <p className="login-error">{error}</p>}

        {!loading && !error && providers.length === 0 && (
          <p className="login-error">No hay proveedores disponibles</p>
        )}

        <div className="login-providers">
          {providers.map(p => (
            <button
              key={p.id}
              className="login-provider-btn"
              onClick={() => handleLogin(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
