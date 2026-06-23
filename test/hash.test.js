import { describe, it, expect } from 'vitest'
import { sha256 } from '../src/utils/hash'

describe('sha256', () => {
  it('produces a 64-character hex string', async () => {
    const hash = await sha256('hello')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns same hash for same input', async () => {
    const a = await sha256('test@example.com')
    const b = await sha256('test@example.com')
    expect(a).toBe(b)
  })

  it('returns different hash for different input', async () => {
    const a = await sha256('a@a.com')
    const b = await sha256('b@b.com')
    expect(a).not.toBe(b)
  })

  it('produces correct known hash', async () => {
    const hash = await sha256('')
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})
