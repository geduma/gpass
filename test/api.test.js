import { describe, it, expect, beforeAll } from 'vitest'
import { sha256 } from '../src/utils/hash'

let api
let owner
const email = 'test@example.com'

beforeAll(async () => {
  owner = await sha256(email)
  api = await import('../src/utils/api')
})

describe('api (mock)', () => {
  it('creates and fetches entries', async () => {
    const created = await api.createEntry({
      title: 'GitHub',
      username: 'test@example.com',
      password: 'secret123',
      strength: 'strong',
      owner
    }, email)

    expect(created.title).toBe('GitHub')
    expect(created.username).toBe('test@example.com')
    expect(created.password).toBe('secret123')
    expect(created.encrypted).toBe(true)
    expect(created.iv).toBeTruthy()
    expect(created._id).toBeTruthy()

    const entries = await api.fetchEntries(owner, '', false, email)
    const match = entries.find(e => e._id === created._id)
    expect(match).toBeTruthy()
    expect(match.password).toBe('secret123')
  })

  it('searches entries by query', async () => {
    await api.createEntry({
      title: 'Example',
      username: 'admin@example.com',
      password: 'pass456',
      strength: 'weak',
      owner
    }, email)

    const result = await api.fetchEntries(owner, 'Example', false, email)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some(e => e.title === 'Example')).toBe(true)
  })

  it('filters by security', async () => {
    const result = await api.fetchEntries(owner, '', true, email)
    for (const entry of result) {
      expect(entry.strength === 'weak' || entry.compromised).toBe(true)
    }
  })

  it('gets a single entry by id', async () => {
    const created = await api.createEntry({
      title: 'Single',
      username: 'single@test.com',
      password: 'singlepass',
      strength: 'strong',
      owner
    }, email)

    const fetched = await api.getEntry(created._id, owner, email)
    expect(fetched.title).toBe('Single')
    expect(fetched.password).toBe('singlepass')
  })

  it('updates an entry', async () => {
    const created = await api.createEntry({
      title: 'UpdateMe',
      username: 'update@test.com',
      password: 'oldpass',
      strength: 'weak',
      owner
    }, email)

    const updated = await api.updateEntry(created._id, {
      title: 'Updated',
      password: 'newpass',
      strength: 'strong'
    }, email)

    expect(updated.title).toBe('Updated')
    expect(updated.password).toBe('newpass')
    expect(updated.strength).toBe('strong')
  })

  it('deletes an entry', async () => {
    const created = await api.createEntry({
      title: 'DeleteMe',
      username: 'delete@test.com',
      password: 'delpass',
      strength: 'strong',
      owner
    }, email)

    await api.deleteEntry(created._id, owner)
    const entries = await api.fetchEntries(owner, '', false, email)
    const found = entries.find(e => e._id === created._id)
    expect(found).toBeUndefined()
  })
})
