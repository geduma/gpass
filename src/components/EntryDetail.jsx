import { useState, useEffect, useRef } from 'react'

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

function generatePassword() {
  const pool = UPPERCASE + LOWERCASE + NUMBERS + SYMBOLS
  const poolLen = pool.length
  const maxValid = 256 - (256 % poolLen)
  const length = 16
  let password = ''
  while (password.length < length) {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    for (let i = 0; i < length && password.length < length; i++) {
      if (bytes[i] < maxValid) {
        password += pool[bytes[i] % poolLen]
      }
    }
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
  const showTimerRef = useRef(null)
  const [form, setForm] = useState({})
  const [copied, setCopied] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [clearTimer, setClearTimer] = useState(null)

  useEffect(() => {
    if (entry) {
      const password = entry.password || ''
      setForm({
        title: entry.title || '',
        username: entry.username || '',
        password,
        strength: entry.strength || evaluateStrength(password),
        tags: entry.tags || []
      })
      setMode(entry._id ? 'view' : 'edit')
      setShowPassword(false)
    }
  }, [entry])

  useEffect(() => {
    if (showPassword) {
      showTimerRef.current = setTimeout(() => setShowPassword(false), 10000)
    }
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
    }
  }, [showPassword])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleEdit() {
    setForm({
      title: entry.title,
      username: entry.username,
      password: entry.password,
      strength: entry.strength,
      tags: entry.tags || []
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

  async function copyToClipboard(text, field) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
      setTimeout(() => setCopied(null), 1500)

      if (clearTimer) clearTimeout(clearTimer)
      const timer = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('')
        } catch {}
      }, 30000)
      setClearTimer(timer)
    } catch {}
  }

  function handleDelete() {
    onDelete(entry._id)
  }

  function addTag(value) {
    const trimmed = value.trim().slice(0, 50)
    if (!trimmed) return
    setForm(prev => ({
      ...prev,
      tags: [...(prev.tags || []), trimmed]
    }))
    setTagInput('')
  }

  function removeTag(index) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(e.target.value)
    }
  }

  if (!entry) return null

  const isNew = !entry._id

  return (
    <div className="entry-detail-backdrop">
      <div className={`entry-detail ${mode}`} onClick={e => e.stopPropagation()}>
        <div className="detail-body">
          {mode === 'view' ? (
            <>
              <div className="field-row edit">
                <label className="field-label">Title</label>
                  <input
                    type="text"
                    value={entry.title}
                    readOnly
                  />
                </div>

              {entry.tags && entry.tags.length > 0 && (
                <div className="field-row">
                  <label className="field-label">Tags</label>
                  <div className="tags-row">
                    {entry.tags.map((tag, i) => (
                      <span key={i} className="tag-chip">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="field-row edit">
                <label className="field-label">Username</label>
                <div className="field-edit-with-btn">
                  <input
                    type="text"
                    value={entry.username}
                    readOnly
                  />
                  <button className="btn btn-secondary" onClick={() => copyToClipboard(entry.username, 'username')}>
                    {copied === 'username' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="field-row edit">
                <div className="field-label-row">
                  <label className="field-label">Password</label>
                  {entry.strength && (
                    <span className={`strength-badge ${entry.strength}`}>
                      {strengthLabel(entry.strength)}
                    </span>
                  )}
                </div>
                <div className="field-edit-with-btn">
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={entry.password}
                      readOnly
                    />
                    <button className="btn btn-secondary" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <button className="btn btn-secondary" onClick={() => copyToClipboard(entry.password, 'password')}>
                    {copied === 'password' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="detail-footer">
                <div className="detail-footer-left">
                  {!isNew && (
                    <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                  )}
                  {!isNew && (
                    <button className="btn btn-warning" onClick={handleEdit}>Edit</button>
                  )}
                </div>
                <button className="btn btn-secondary detail-footer-close" onClick={onClose}>Close</button>
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
                  maxLength={100}
                />
              </div>

              <div className="field-row">
                <div className="tags-row">
                  {(form.tags || []).map((tag, i) => (
                    <span key={i} className="tag-chip tag-chip-removable">
                      {tag}
                      <button className="tag-remove" onClick={() => removeTag(i)} type="button">×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  className="tag-input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add tag..."
                  maxLength={30}
                />
              </div>

              <div className="field-row edit">
                <label className="field-label">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => handleFieldChange('username', e.target.value)}
                  maxLength={100}
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

              {mode === 'edit' && (
                <div className="detail-footer">
                  <div className="detail-footer-left">
                    <button className="btn btn-primary" onClick={handleSave}>Save</button>
                  </div>
                  <button className="btn btn-secondary detail-footer-close" onClick={handleCancel}>Cancel</button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
