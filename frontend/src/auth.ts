import { reactive } from 'vue'
import { ApiError, api } from './api/client'
import type { Me } from './api/types'

/** ログイン中の人。画面のどこからでも読める(小さいアプリなので、専用の道具は使わない) */
export const auth = reactive<{ me: Me | null; loaded: boolean }>({ me: null, loaded: false })

/** 起動したとき、ログイン中かどうかをサーバーに聞く */
export async function loadMe(): Promise<void> {
  try {
    auth.me = await api.get<Me>('/me')
  } catch (e) {
    if (!(e instanceof ApiError)) throw e
    auth.me = null
  }
  auth.loaded = true
}

export async function login(nickname: string, password: string): Promise<void> {
  auth.me = await api.post<Me>('/auth/login', { nickname, password })
}

export async function register(input: {
  nickname: string
  password: string
  initial_wallet: number
  initial_savings: number
}): Promise<void> {
  auth.me = await api.post<Me>('/auth/register', input)
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
  auth.me = null
}
