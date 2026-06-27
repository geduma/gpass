import { describe, it, expect } from 'vitest'
import { encryptField, decryptField, deriveKey } from '../src/utils/crypto'

const EMAIL = 'test@example.com'
const SALT = 'Z3Bhc3MtdGVzdC1zYWx0LTE2Yg=='

describe('crypto', () => {
  it('encrypts and decrypts a password', async () => {
    const password = 'MySecretPassword123!'
    const encrypted = await encryptField(password, EMAIL, SALT)
    const decrypted = await decryptField(encrypted, EMAIL, SALT)
    expect(decrypted).toBe(password)
  })

  it('produces different ciphertext each time (random IV)', async () => {
    const password = 'test'
    const a = await encryptField(password, EMAIL, SALT)
    const b = await encryptField(password, EMAIL, SALT)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('handles empty string', async () => {
    const encrypted = await encryptField('', EMAIL, SALT)
    const decrypted = await decryptField(encrypted, EMAIL, SALT)
    expect(decrypted).toBe('')
  })

  it('deriveKey is deterministic for same email', async () => {
    const keyA = await deriveKey(EMAIL, SALT)
    const keyB = await deriveKey(EMAIL, SALT)
    expect(keyA).toEqual(keyB)
  })

  it('produces different keys for different emails', async () => {
    const encrypted = await encryptField('secret', 'user1@mail.com', SALT)
    await expect(decryptField(encrypted, 'user2@mail.com', SALT)).rejects.toThrow()
  })

  it('throws on tampered ciphertext', async () => {
    const encrypted = await encryptField('hello', EMAIL, SALT)
    const tampered = {
      ciphertext: encrypted.ciphertext.slice(0, -4) + 'AAAA',
      iv: encrypted.iv
    }
    await expect(decryptField(tampered, EMAIL, SALT)).rejects.toThrow()
  })
})
