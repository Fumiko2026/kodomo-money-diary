import { describe, expect, it } from 'vitest'
import type { Wish } from './api/types'
import { emptyWishForm, toWishPayload, validateWishForm, wishToForm } from './wishForm'

const ok = { name: 'ゲームソフト', target: '5000', otoshidama: '', monthly: '' }

describe('validateWishForm', () => {
  it('名前と金がくがあれば、計画は空でもよい', () => {
    expect(validateWishForm(ok)).toBeNull()
    expect(validateWishForm({ ...ok, otoshidama: '2000', monthly: '800' })).toBeNull()
    expect(validateWishForm({ ...ok, monthly: '0' })).toBeNull()
  })
  it('名前が空・長すぎるときは、言葉で伝える', () => {
    expect(validateWishForm({ ...ok, name: '  ' })).toContain('名前')
    expect(validateWishForm({ ...ok, name: 'あ'.repeat(21) })).toContain('20 文字')
  })
  it('ほしい金がくが、空・0・数字でない・大きすぎるとき', () => {
    expect(validateWishForm({ ...ok, target: '' })).toBe('ほしい金がくを 入れてね')
    expect(validateWishForm({ ...ok, target: '0' })).toBe('ほしい金がくを 入れてね')
    expect(validateWishForm({ ...ok, target: 'abc' })).toContain('数字')
    expect(validateWishForm({ ...ok, target: '100000000' })).toContain('数字')
  })
  it('計画が数字でないとき、どの欄かが分かる', () => {
    expect(validateWishForm({ ...ok, otoshidama: 'x' })).toContain('お年玉から')
    expect(validateWishForm({ ...ok, monthly: '-5' })).toContain('毎月のおこづかいから')
  })
})

describe('toWishPayload', () => {
  it('空の計画は null。全角やカンマも受け付ける', () => {
    expect(toWishPayload({ name: ' ゲーム ', target: '５,０００', otoshidama: '', monthly: '800' })).toEqual({
      name: 'ゲーム', target_amount: 5000, otoshidama_plan: null, monthly_plan: 800,
    })
  })
  it('0 円の計画は、0 のまま送る(空とは区別する)', () => {
    expect(toWishPayload({ ...ok, monthly: '0' }).monthly_plan).toBe(0)
  })
})

describe('wishToForm', () => {
  it('直す画面に、いまの内容を入れる。計画がなければ空', () => {
    const w: Wish = { id: 1, name: '本', target_amount: 900, otoshidama_plan: null, monthly_plan: 300, saved: 0, months_left: 3 }
    expect(wishToForm(w)).toEqual({ name: '本', target: '900', otoshidama: '', monthly: '300' })
    expect(emptyWishForm()).toEqual({ name: '', target: '', otoshidama: '', monthly: '' })
  })
})
