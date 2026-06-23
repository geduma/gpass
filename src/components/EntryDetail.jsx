import { useState, useEffect } from 'react'
import PasswordGenerator from './PasswordGenerator'

export default function EntryDetail({ entry, onClose, onSave, onDelete }) {
  const [mode, setMode] = useState('view')
  const [showPassword, setShowPassword] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    if (entry) {
      setForm({
        title: entry.title || '',
        username: entry.username || '',
        password: entry.password || '',
        strength: entry.strength || 'strong'
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
    setMode('view')
  }

  function handleSave() {
    onSave({
      ...form,
      _id: entry._id
    })
  }

  function handleFieldChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleUsePassword(password) {
    if (password) {
      handleFieldChange('password', password)
    }
    setShowGenerator(false)
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
        <div className="detail-header">
          {mode === 'view' ? (
            <>
              {!isNew && (
                <button className="btn btn-secondary" onClick={handleEdit}>Edit</button>
              )}
              {!isNew && (
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              )}
              <button className="btn btn-close" onClick={onClose}>✕</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
            </>
          )}
        </div>

        {(entry.strength === 'weak' || entry.compromised) && mode === 'view' && (
          <div className="detail-alerts">
            {entry.compromised && <span className="strength-badge compromised">Compromised</span>}
            {entry.strength === 'weak' && <span className="strength-badge weak">Weak</span>}
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
                  {entry.strength === 'strong' ? 'Strong' : entry.strength}
                </span>
                <span className="detail-date">Updated: {entry.updated}</span>
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
                <label className="field-label">Password</label>
                <div className="field-edit-with-btn">
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => handleFieldChange('password', e.target.value)}
                    />
                    <button className="btn btn-icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setShowGenerator(true)}>
                    Generate
                  </button>
                </div>
              </div>

              <div className="field-row edit">
                <label className="field-label">Strength</label>
                <select
                  value={form.strength}
                  onChange={e => handleFieldChange('strength', e.target.value)}
                  className="field-select"
                >
                  <option value="strong">Strong</option>
                  <option value="weak">Weak</option>
                </select>
              </div>

              {isNew && (
                <p className="detail-hint">The slug and dates will be generated automatically.</p>
              )}
            </>
          )}
        </div>

        {showGenerator && (
          <PasswordGenerator onUse={handleUsePassword} />
        )}
      </div>
    </div>
  )
}
