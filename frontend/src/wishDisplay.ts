/** ほしいものの、進み具合の表示用の言葉と数字。 */
import type { Wish } from './api/types'

/** 進み具合(0〜100 の整数)。貯金 ÷ ほしい金がく。目標をこえても 100 まで */
export function progressPercent(saved: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.max(0, Math.floor((saved / target) * 100)))
}

/** 「あと 6 か月くらい」。計画が空のときは、出さない(null) */
export function wishNote(wish: Wish): string | null {
  if (wish.saved >= wish.target_amount) return 'もう 貯まったよ!'
  if (wish.months_left === null) return null
  return `あと ${wish.months_left} か月くらい`
}
