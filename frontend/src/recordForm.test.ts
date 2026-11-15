import { describe, expect, it } from 'vitest'
import { emptyForm, exceedsWallet, toPayload, validateRecordForm, walletEffect } from './recordForm'

const TODAY = '2026-11-15'

function form(over: Partial<ReturnType<typeof emptyForm>> = {}) {
  return { ...emptyForm(TODAY), amount: '100', categoryId: 1, ...over }
}

describe('validateRecordForm', () => {
  it('ふつうの「つかった」は、問題なし', () => {
    expect(validateRecordForm(form(), TODAY)).toBeNull()
  })
  it('金がくが、空・0 円・数字でないときは、言葉で伝える', () => {
    expect(validateRecordForm(form({ amount: '' }), TODAY)).toBe('金がくを 入れてね')
    expect(validateRecordForm(form({ amount: '0' }), TODAY)).toBe('金がくを 入れてね')
    expect(validateRecordForm(form({ amount: 'abc' }), TODAY)).toContain('数字')
    expect(validateRecordForm(form({ amount: '100000000' }), TODAY)).toContain('数字')
  })
  it('未来の日づけは、だめ。今日は、よい', () => {
    expect(validateRecordForm(form({ date: '2026-11-16' }), TODAY)).toContain('あした')
    expect(validateRecordForm(form({ date: TODAY }), TODAY)).toBeNull()
    expect(validateRecordForm(form({ date: '' }), TODAY)).toContain('ひづけ')
  })
  it('「つかった」は、しゅるいが必要。ほかの種類は、いらない', () => {
    expect(validateRecordForm(form({ categoryId: null }), TODAY)).toContain('しゅるい')
    expect(validateRecordForm(form({ type: 'deposit', categoryId: null }), TODAY)).toBeNull()
    expect(validateRecordForm(form({ type: 'income', categoryId: null }), TODAY)).toBeNull()
  })
})

describe('toPayload', () => {
  it('種類に関係のない欄は、送らない', () => {
    expect(toPayload(form({ type: 'expense', memo: ' ガム ' }))).toEqual({
      record_date: TODAY, type: 'expense', amount: 100, income_kind: null, category_id: 1, memo: 'ガム',
    })
    expect(toPayload(form({ type: 'income', incomeKind: 'otoshidama' }))).toMatchObject({
      income_kind: 'otoshidama', category_id: null,
    })
    expect(toPayload(form({ type: 'deposit' }))).toMatchObject({ income_kind: null, category_id: null })
  })
  it('金がくの、カンマと全角も受け付ける', () => {
    expect(toPayload(form({ amount: '１,２００' })).amount).toBe(1200)
  })
})

describe('walletEffect', () => {
  it('さいふが増えるのは、もらった・貯金からだした', () => {
    expect(walletEffect('income', 100)).toBe(100)
    expect(walletEffect('withdraw', 100)).toBe(100)
    expect(walletEffect('expense', 100)).toBe(-100)
    expect(walletEffect('deposit', 100)).toBe(-100)
  })
})

describe('exceedsWallet', () => {
  it('さいふより多い「つかった」「貯金へ入れた」は、true', () => {
    expect(exceedsWallet(form({ amount: '1101' }), 1100)).toBe(true)
    expect(exceedsWallet(form({ amount: '1100' }), 1100)).toBe(false)
    expect(exceedsWallet(form({ type: 'deposit', amount: '2000' }), 1100)).toBe(true)
  })
  it('「もらった」「貯金からだした」は、いつも false', () => {
    expect(exceedsWallet(form({ type: 'income', amount: '99999' }), 0)).toBe(false)
    expect(exceedsWallet(form({ type: 'withdraw', amount: '99999' }), 0)).toBe(false)
  })
  it('直すときは、直す前の分を、先にもどして比べる', () => {
    // さいふ 700 円。いまの記録は「つかった 300 円」(前は 1,000 円あった)。
    // 1,000 円に直すのは、さいふを こえない。
    expect(exceedsWallet(form({ amount: '1000' }), 700, { type: 'expense', amount: 300 })).toBe(false)
    expect(exceedsWallet(form({ amount: '1001' }), 700, { type: 'expense', amount: 300 })).toBe(true)
    // 「もらった 500 円」を「つかった 600 円」に直すと、さいふは 700 − 500 = 200 円のところから
    expect(exceedsWallet(form({ amount: '600' }), 700, { type: 'income', amount: 500 })).toBe(true)
  })
})
