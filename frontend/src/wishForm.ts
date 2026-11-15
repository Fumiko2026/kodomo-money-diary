/** 「ほしいもの」の入力のチェックと、API に送る形(画面から切りはなして、テストしやすくする)。 */
import type { Wish } from './api/types'
import { parseYen } from './format'

export const MAX_YEN = 99_999_999

export interface WishFormState {
  name: string
  target: string // 入力した文字のまま
  otoshidama: string // 「お年玉から ○円」。空でもよい
  monthly: string // 「毎月のおこづかいから ○円」。空でもよい
}

export function emptyWishForm(): WishFormState {
  return { name: '', target: '', otoshidama: '', monthly: '' }
}

export function wishToForm(w: Wish): WishFormState {
  return {
    name: w.name,
    target: String(w.target_amount),
    otoshidama: w.otoshidama_plan === null ? '' : String(w.otoshidama_plan),
    monthly: w.monthly_plan === null ? '' : String(w.monthly_plan),
  }
}

const RANGE = '0 から 99,999,999 の 数字で 入れてね'

/** 入力のまちがいを、やさしい言葉で返す。問題なければ null */
export function validateWishForm(f: WishFormState): string | null {
  const name = f.name.trim()
  if (!name) return 'ほしいものの 名前を 入れてね'
  if (name.length > 20) return '名前は 20 文字までだよ'

  const target = parseYen(f.target)
  if (target === null || target === 0) return 'ほしい金がくを 入れてね'
  if (Number.isNaN(target) || target > MAX_YEN) return `ほしい金がくは 1 から 99,999,999 の 数字で 入れてね`

  for (const [text, label] of [[f.otoshidama, 'お年玉から'], [f.monthly, '毎月のおこづかいから']] as const) {
    const n = parseYen(text)
    if (n !== null && (Number.isNaN(n) || n > MAX_YEN)) return `${label}は、${RANGE}`
  }
  return null
}

/** 空の計画は null(計画なし)。直すときも、空にすれば、計画を消せる */
export function toWishPayload(f: WishFormState) {
  const plan = (text: string) => {
    const n = parseYen(text)
    return n === null ? null : n
  }
  return {
    name: f.name.trim(),
    target_amount: parseYen(f.target) as number,
    otoshidama_plan: plan(f.otoshidama),
    monthly_plan: plan(f.monthly),
  }
}
