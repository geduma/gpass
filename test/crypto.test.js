import { describe, it, expect } from 'vitest'
import { encryptField, decryptField, deriveKey } from '../src/utils/crypto'

const EMAIL = 'test@example.com'

describe('crypto', () => {
  it('encrypts and decrypts a password', async () => {
    const password = 'MySecretPassword123!'
    const encrypted = await encryptField(password, EMAIL)
    const decrypted = await decryptField(encrypted, EMAIL)
    expect(decrypted).toBe(password)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    const password = 'test'
    const a = await encryptField(password, EMAIL)
    const b = await encryptField(password, EMAIL)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('handles empty string', async () => {
    const encrypted = await encryptField('', EMAIL)
    const decrypted = await decryptField(encrypted, EMAIL)
    expect(decrypted).toBe('')
  })

  it('deriveKey is deterministic for same email', async () => {
    const keyA = await deriveKey(EMAIL)
    const keyB = await deriveKey(EMAIL)
    expect(keyA).toEqual(keyB)
  })

  it('throws on tampered ciphertext', async () => {
    const encrypted = await encryptField('hello', EMAIL)
    const tampered = {
      ciphertext: encrypted.ciphertext.slice(0, -4) + 'AAAA',
      iv: encrypted.iv
    }
    await expect(decryptField(tampered, EMAIL)).rejects.toThrow()
  })
})
