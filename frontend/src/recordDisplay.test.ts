import { describe, expect, it } from 'vitest'
import type { MoneyRecord } from './api/types'
import { monthLabel, recentMonths, recordTitle, shiftMonth, shortDate } from './recordDisplay'

function rec(over: Partial<MoneyRecord>): MoneyRecord {
  return {
    id: 1, record_date: '2026-11-13', type: 'expense', amount: 100, income_kind: null,
    category_id: null, category_name: null, category_color: null, memo: '', ...over,
  }
}

describe('recordTitle', () => {
  it('種類ごとの名前を返す', () => {
    expect(recordTitle(rec({ type: 'income', income_kind: 'allowance' }))).toBe('おこづかい')
    expect(recordTitle(rec({ type: 'income', income_kind: 'otoshidama' }))).toBe('お年玉')
    expect(recordTitle(rec({ type: 'expense', category_name: 'おやつ' }))).toBe('おやつ')
    expect(recordTitle(rec({ type: 'deposit' }))).toBe('貯金へ入れた')
    expect(recordTitle(rec({ type: 'withdraw' }))).toBe('貯金からだした')
  })
})

describe('shortDate', () => {
  it('今年は「月/日」、ほかの年は年も出す', () => {
    expect(shortDate('2026-11-03', '2026-11-15')).toBe('11/3')
    expect(shortDate('2025-12-31', '2026-11-15')).toBe('2025/12/31')
  })
})

describe('recentMonths', () => {
  it('今月から、年をまたいで、さかのぼる', () => {
    const m = recentMonths('2026-02-10', 4)
    expect(m.map((x) => x.value)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11'])
    expect(m[0].label).toBe('2026年 2月')
  })
  it('既定は 24 か月', () => {
    expect(recentMonths('2026-11-15')).toHaveLength(24)
  })
})

describe('monthLabel', () => {
  it('月の名前にする', () => {
    expect(monthLabel('2026-11')).toBe('2026年 11月')
  })
})

describe('shiftMonth', () => {
  it('年をまたいで、前後に動かす', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-11', 0)).toBe('2026-11')
    expect(shiftMonth('2026-03', -14)).toBe('2025-01')
  })
})
