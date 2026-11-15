import { describe, expect, it } from 'vitest'
import type { Wish } from './api/types'
import { progressPercent, wishNote } from './wishDisplay'

function wish(over: Partial<Wish>): Wish {
  return { id: 1, name: 'ゲーム', target_amount: 5000, otoshidama_plan: null, monthly_plan: null, saved: 0, months_left: null, ...over }
}

describe('progressPercent', () => {
  it('貯金 ÷ 目標を、整数の % にする', () => {
    expect(progressPercent(300, 5000)).toBe(6)
    expect(progressPercent(2500, 5000)).toBe(50)
    expect(progressPercent(0, 5000)).toBe(0)
  })
  it('目標をこえても、100 まで', () => {
    expect(progressPercent(9000, 5000)).toBe(100)
  })
  it('目標が 0 や、マイナスの貯金でも、こわれない', () => {
    expect(progressPercent(100, 0)).toBe(0)
    expect(progressPercent(-50, 5000)).toBe(0)
  })
})

describe('wishNote', () => {
  it('あと何か月かを出す', () => {
    expect(wishNote(wish({ saved: 300, months_left: 6 }))).toBe('あと 6 か月くらい')
  })
  it('計画が空のときは、出さない', () => {
    expect(wishNote(wish({ saved: 300, months_left: null }))).toBeNull()
  })
  it('貯まったときは、よろこぶ', () => {
    expect(wishNote(wish({ saved: 5000, months_left: 0 }))).toBe('もう 貯まったよ!')
    expect(wishNote(wish({ saved: 6000, months_left: null }))).toBe('もう 貯まったよ!')
  })
})
