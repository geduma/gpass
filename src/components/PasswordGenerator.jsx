import { useState, useCallback } from 'react'

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

function generatePassword(length, charsets) {
  const pool = charsets.join('')
  if (!pool) return ''
  let password = ''
  for (let i = 0; i < length; i++) {
    password += pool[Math.floor(Math.random() * pool.length)]
  }
  return password
}

export default function PasswordGenerator({ onUse }) {
  const [length, setLength] = useState(16)
  const [useUpper, setUseUpper] = useState(true)
  const [useLower, setUseLower] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [password, setPassword] = useState('')

  const generate = useCallback(() => {
    const charsets = []
    if (useUpper) charsets.push(UPPERCASE)
    if (useLower) charsets.push(LOWERCASE)
    if (useNumbers) charsets.push(NUMBERS)
    if (useSymbols) charsets.push(SYMBOLS)
    setPassword(generatePassword(length, charsets))
  }, [length, useUpper, useLower, useNumbers, useSymbols])

  function handleUse() {
    if (password) onUse(password)
  }

  async function handleCopy() {
    if (password) {
      await navigator.clipboard.writeText(password)
    }
  }

  const canGenerate = useUpper || useLower || useNumbers || useSymbols

  return (
    <div className="modal-overlay" onClick={() => onUse('')}>
      <div className="modal-content password-generator" onClick={e => e.stopPropagation()}>
        <h2>Generate Password</h2>

        <div className="pg-password">
          <input
            type="text"
            readOnly
            value={password}
            placeholder="Click Generate"
            className="pg-input"
          />
          <div className="pg-actions">
            <button className="btn btn-secondary" onClick={handleCopy} disabled={!password}>
              Copy
            </button>
            <button className="btn btn-primary" onClick={generate} disabled={!canGenerate}>
              Generate
            </button>
          </div>
        </div>

        <div className="pg-options">
          <div className="pg-option">
            <label>Length: {length}</label>
            <input
              type="range"
              min="8"
              max="32"
              value={length}
              onChange={e => setLength(Number(e.target.value))}
              className="pg-slider"
            />
          </div>
          <label className="pg-check">
            <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} />
            Mayúsculas
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} />
            Minúsculas
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} />
            Números
          </label>
          <label className="pg-check">
            <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} />
            Símbolos
          </label>
        </div>

        <button
          className="btn btn-primary pg-use"
          onClick={handleUse}
          disabled={!password}
        >
          Use This Password
        </button>
      </div>
    </div>
  )
}
