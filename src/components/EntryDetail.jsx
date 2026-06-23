import { useState, useEffect } from 'react'

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

function generatePassword() {
  const pool = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS
  const length = 16
  let password = ''
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < length; i++) {
    password += pool[bytes[i] % pool.length]
  }
  return password
}

function evaluateStrength(password) {
  if (!password || password.length < 6) return 'weak'
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const types = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length
  if (password.length >= 12 && types >= 3) return 'strong'
  if (password.length >= 8 && types >= 2) return 'medium'
  return 'weak'
}

function strengthLabel(s) {
  if (s === 'strong') return 'Strong'
  if (s === 'medium') return 'Medium'
  if (s === 'weak') return 'Weak'
  return s
}

export default function EntryDetail({ entry, onClose, onSave, onDelete }) {
  const [mode, setMode] = useState('view')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    if (entry) {
      const password = entry.password || ''
      setForm({
        title: entry.title || '',
        username: entry.username || '',
        password,
        strength: entry.strength || evaluateStrength(password)
      })
      setMode(entry._id ? 'view' : 'edit')
      setShowPassword(false)
    }
  }, [entry])

  if (!entry) return null

  function handleEdit() {
    setForm({
      title: entry.title,
      username: entry.username,
      password: entry.password,
      strength: entry.strength
    })
    setMode('edit')
  }

  function handleCancel() {
    onClose()
  }

  function handleSave() {
    onSave({
      ...form,
      _id: entry._id
    })
  }

  function handleFieldChange(field, value) {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'password') {
        updated.strength = evaluateStrength(value)
      }
      return updated
    })
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {}
  }

  function handleDelete() {
    onDelete(entry._id)
  }

  const isNew = !entry._id

  return (
    <div className="entry-detail-backdrop" onClick={onClose}>
      <div className={`entry-detail ${mode}`} onClick={e => e.stopPropagation()}>
        {mode === 'view' && (
          <div className="detail-header">
            {!isNew && (
              <button className="btn btn-secondary" onClick={handleEdit}>Edit</button>
            )}
            {!isNew && (
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            )}
            <button className="btn btn-close" onClick={onClose}>✕</button>
          </div>
        )}

        {mode === 'view' && entry.strength === 'weak' && (
          <div className="detail-alerts">
            <span className="strength-badge weak">Weak</span>
          </div>
        )}

        <div className="detail-body">
          {mode === 'view' ? (
            <>
              <h2 className="detail-title">{entry.title}</h2>

              <div className="field-row">
                <label className="field-label">Username</label>
                <div className="field-value">
                  <span>{entry.username}</span>
                  <button className="btn btn-icon" onClick={() => copyToClipboard(entry.username)} title="Copy">
                    Copy
                  </button>
                </div>
              </div>

              <div className="field-row">
                <label className="field-label">Password</label>
                <div className="field-value">
                  <span className="password-text">
                    {showPassword ? entry.password : '•'.repeat(20)}
                  </span>
                  <button className="btn btn-icon" onClick={() => setShowPassword(!showPassword)} title="Show/Hide">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button className="btn btn-icon" onClick={() => copyToClipboard(entry.password)} title="Copy">
                    Copy
                  </button>
                </div>
              </div>

              <div className="detail-meta">
                <span className={`strength-badge ${entry.strength}`}>
                  {strengthLabel(entry.strength)}
                </span>
                <span className="detail-date">
                  Updated: {entry.updatedAt ? entry.updatedAt.split('T')[0] || entry.updatedAt : ''}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="field-row edit">
                <label className="field-label">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleFieldChange('title', e.target.value)}
                />
              </div>

              <div className="field-row edit">
                <label className="field-label">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => handleFieldChange('username', e.target.value)}
                />
              </div>

              <div className="field-row edit">
                <div className="field-label-row">
                  <label className="field-label">Password</label>
                  {form.password && (
                    <span className={`strength-badge ${form.strength}`}>
                      {strengthLabel(form.strength)}
                    </span>
                  )}
                </div>
                <div className="field-edit-with-btn">
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => handleFieldChange('password', e.target.value)}
                    />
                    <button className="btn btn-secondary" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button className="btn btn-secondary" onClick={() => handleFieldChange('password', generatePassword())}>
                    Generate
                  </button>
                </div>
              </div>

              {isNew && (
                <p className="detail-hint">The dates will be generated server-side.</p>
              )}

              {mode === 'edit' && (
                <div className="detail-footer">
                  <button className="btn btn-cancel" onClick={handleCancel}>Cancel</button>
                  <button className="btn btn-save" onClick={handleSave}>Save</button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
