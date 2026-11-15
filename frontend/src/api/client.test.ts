import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, messageFrom, setUnauthorizedHandler } from './client'

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

/** 失敗するはずの呼び出しから、ApiError を取り出す */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (e) {
    return e as ApiError
  }
  throw new Error('失敗するはずが、成功した')
}

afterEach(() => {
  vi.unstubAllGlobals()
  setUnauthorizedHandler(() => {})
})

describe('messageFrom', () => {
  it('文字のエラーは、そのまま使う', () => {
    expect(messageFrom({ detail: 'ログインしてね' })).toBe('ログインしてね')
  })
  it('入力のチェックのエラー(配列)は、やさしい言葉にする', () => {
    expect(messageFrom({ detail: [{ msg: 'x' }] })).toContain('たしかめて')
  })
  it('よく分からないときも、言葉を返す', () => {
    expect(messageFrom(null)).toContain('もういちど')
  })
})

describe('api', () => {
  it('/api を付けて、JSON を送る', async () => {
    const fetchMock = mockFetch(200, { ok: 1 })
    await api.post('/auth/login', { a: 1 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect(init.credentials).toBe('same-origin')
  })

  it('204 は、空で返す', async () => {
    mockFetch(204, undefined)
    await expect(api.delete('/records/1')).resolves.toBeUndefined()
  })

  it('エラーは ApiError にして、状態コードを持たせる', async () => {
    mockFetch(409, { detail: 'おなじ名前が あるよ' })
    const err = await failure(api.post('/categories', {}))
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.message).toBe('おなじ名前が あるよ')
  })

  it('使っている途中の 401 は、ログイン切れとして伝える', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch(401, { detail: 'ログインしてね' })
    await api.get('/balance').catch(() => {})
    expect(handler).toHaveBeenCalledOnce()
  })

  it('ログインの失敗(401)は、ログイン切れとは扱わない', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch(401, { detail: 'ニックネームか パスワードが ちがうよ' })
    await api.post('/auth/login', {}).catch(() => {})
    expect(handler).not.toHaveBeenCalled()
  })

  it('つながらないときも、ApiError にする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
    const err = await failure(api.get('/me'))
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
  })
})
