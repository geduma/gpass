import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

let api
const email = 'test@example.com'
const ownerHash = '2e99758548972a8e8822ad47fa1017ff72f06f3ff6a016851f45c398732bc50c'
const entryId = '665f1a2b3c4d5e6f7a8b9c0d'

function fetchMockFactory(responses) {
  let callCount = 0
  return vi.fn().mockImplementation(() => {
    const idx = Math.min(callCount, responses.length - 1)
    const resp = responses[idx]
    callCount++
    const r = { status: resp.status }
    if (resp.json !== undefined) {
      r.json = () => Promise.resolve(resp.json)
    }
    return Promise.resolve(r)
  })
}

beforeAll(async () => {
  api = await import('../src/utils/api')
})

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('api', () => {
  it('createEntry encrypts password and sends POST', async () => {
    const mock = fetchMockFactory([
      { status: 200, json: { ok: true, data: { token: 'jwt' } } },
      { status: 201, json: { ok: true, data: { id: entryId } } }
    ])
    vi.stubGlobal('fetch', mock)

    const result = await api.createEntry({
      title: 'GitHub',
      username: 'test@example.com',
      password: 'secret123',
      strength: 'strong',
      owner: ownerHash
    }, email)

    expect(result._id).toBe(entryId)
    expect(result.title).toBe('GitHub')
    expect(result.password).toBe('secret123')

    const postCall = mock.mock.calls[1]
    expect(postCall[0]).toBe('https://api.geduma.com/gpass')
    expect(postCall[1].method).toBe('POST')
    const sentBody = JSON.parse(postCall[1].body)
    expect(sentBody.title).toBe('GitHub')
    expect(sentBody.encrypted).toBe("true")
    expect(sentBody.iv).toBeTruthy()
    expect(sentBody.password).not.toBe('secret123')
  })

  it('fetchEntries sends GET with query params', async () => {
    const mock = fetchMockFactory([
      { status: 200, json: { ok: true, data: { token: 'jwt' } } },
      { status: 200, json: { ok: true, data: [] } }
    ])
    vi.stubGlobal('fetch', mock)

    const result = await api.fetchEntries(ownerHash, 'test', email)

    const getCall = mock.mock.calls[1]
    expect(getCall[0]).toContain('owner=')
    expect(getCall[0]).toContain('q=test')
    expect(getCall[1].headers.Authorization).toBe('Bearer jwt')
    expect(result).toEqual([])
  })

  it('fetchEntries returns empty array on 204', async () => {
    const mock = fetchMockFactory([
      { status: 200, json: { ok: true, data: { token: 'jwt' } } },
      { status: 204, json: undefined }
    ])
    vi.stubGlobal('fetch', mock)

    const result = await api.fetchEntries(ownerHash, '', email)
    expect(result).toEqual([])
  })

  it('updateEntry sends PUT with correct url', async () => {
    const mock = fetchMockFactory([
      { status: 200, json: { ok: true, data: { token: 'jwt' } } },
      { status: 200, json: {
        ok: true,
        data: {
          _id: entryId, title: 'Updated', username: 'user',
          password: 'plain-text', strength: 'strong',
          encrypted: false, iv: '',
          owner: ownerHash, createdAt: '2026-06-23', updatedAt: '2026-06-23'
        }
      }}
    ])
    vi.stubGlobal('fetch', mock)

    await api.updateEntry(entryId, { title: 'Updated', strength: 'strong' }, email)

    const putCall = mock.mock.calls[1]
    expect(putCall[0]).toBe(`https://api.geduma.com/gpass/${entryId}`)
    expect(putCall[1].method).toBe('PUT')
  })

  it('deleteEntry sends DELETE with owner as query param', async () => {
    const mock = fetchMockFactory([
      { status: 200, json: { ok: true, data: { token: 'jwt' } } },
      { status: 204, json: undefined }
    ])
    vi.stubGlobal('fetch', mock)

    await api.deleteEntry(entryId, ownerHash, email)

    const deleteCall = mock.mock.calls[1]
    expect(deleteCall[0]).toBe(`https://api.geduma.com/gpass/${entryId}?owner=${ownerHash}`)
    expect(deleteCall[1].method).toBe('DELETE')
    expect(deleteCall[1].body).toBeUndefined()
  })
})
