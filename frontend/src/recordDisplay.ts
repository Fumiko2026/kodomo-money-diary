/** 一覧などで、記録を表示するための言葉と形。 */
import type { IncomeKind, MoneyRecord, RecordType } from './api/types'

export const TYPE_NAME: Record<RecordType, string> = {
  income: 'もらった',
  expense: 'つかった',
  deposit: '貯金へ入れた',
  withdraw: '貯金からだした',
}

export const INCOME_KIND_NAME: Record<IncomeKind, string> = {
  allowance: 'おこづかい',
  otoshidama: 'お年玉',
}

/** 一覧の 1 行に出す名前。「もらった」はおこづかい/お年玉、「つかった」はしゅるい */
export function recordTitle(r: MoneyRecord): string {
  if (r.type === 'income') return INCOME_KIND_NAME[r.income_kind ?? 'allowance']
  if (r.type === 'expense') return r.category_name ?? 'その他'
  return TYPE_NAME[r.type]
}

/** 「11/13」。今年でないときは「2025/11/13」 */
export function shortDate(date: string, today: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return today.startsWith(`${y}-`) ? `${m}/${d}` : `${y}/${m}/${d}`
}

/** 今月から、さかのぼって count か月ぶん(新しい月が先) */
export function recentMonths(today: string, count = 24): { value: string; label: string }[] {
  let [year, month] = today.split('-').map(Number)
  const months = []
  for (let i = 0; i < count; i++) {
    months.push({ value: `${year}-${String(month).padStart(2, '0')}`, label: monthLabel(`${year}-${month}`) })
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return months
}

/** '2026-11' → '2026年 11月' */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${y}年 ${m}月`
}

/** '2026-12' の 1 か月あと → '2027-01'。マイナスで、前の月 */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}
