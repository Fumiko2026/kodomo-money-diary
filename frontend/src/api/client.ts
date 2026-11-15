/** バックエンド(/api)への、共通の通り道。エラーは ApiError にそろえる。 */

const FALLBACK = 'うまく いかなかったよ。もういちど ためしてね'
const INVALID = '入れた ないようを たしかめてね'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** ログイン中に 401 が返ったとき(セッションが切れたとき)の処理。main.ts で設定する */
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export function messageFrom(data: unknown): string {
  const detail = (data as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return INVALID // 入力のチェックで引っかかった(422)
  return FALLBACK
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'つながらなかったよ。もういちど ためしてね')
  }

  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    // ログイン・とうろくの 401/409 は、画面で言葉を出すので、ここでは戻さない
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    throw new ApiError(res.status, messageFrom(data))
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
