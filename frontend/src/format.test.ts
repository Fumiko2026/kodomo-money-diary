import { describe, expect, it } from 'vitest'
import { formatYen, parseYen, signedYen, todayJst } from './format'

describe('formatYen', () => {
  it('3 けたごとに、カンマを入れる', () => {
    expect(formatYen(1100)).toBe('1,100円')
    expect(formatYen(0)).toBe('0円')
    expect(formatYen(-400)).toBe('-400円')
  })
})

describe('parseYen', () => {
  it('数字を、整数にする', () => {
    expect(parseYen('1500')).toBe(1500)
    expect(parseYen('1,500円')).toBe(1500)
  })
  it('全角の数字も、受け付ける', () => {
    expect(parseYen('１２００')).toBe(1200)
  })
  it('空は null', () => {
    expect(parseYen('')).toBeNull()
    expect(parseYen('  ')).toBeNull()
  })
  it('数字でないものは NaN', () => {
    expect(parseYen('abc')).toBeNaN()
    expect(parseYen('-5')).toBeNaN()
    expect(parseYen('1.5')).toBeNaN()
  })
})

describe('todayJst', () => {
  it('日本時間の日づけを返す(UTC の夜は、日本では次の日)', () => {
    expect(todayJst(new Date('2026-11-14T16:30:00Z'))).toBe('2026-11-15')
    expect(todayJst(new Date('2026-11-15T14:59:00Z'))).toBe('2026-11-15')
  })
})

describe('signedYen', () => {
  it('記号をつける。0 円は、＋', () => {
    expect(signedYen(400)).toBe('＋400円')
    expect(signedYen(-1200)).toBe('−1,200円')
    expect(signedYen(0)).toBe('＋0円')
  })
})
