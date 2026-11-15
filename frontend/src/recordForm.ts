/** 「きろくする」画面の、入力のチェックと計算(画面から切りはなして、テストしやすくする)。 */
import type { IncomeKind, RecordType } from './api/types'
import { parseYen } from './format'

export const MAX_YEN = 99_999_999

export interface RecordFormState {
  type: RecordType
  date: string // YYYY-MM-DD
  amount: string // 入力した文字のまま
  incomeKind: IncomeKind
  categoryId: number | null
  memo: string
}

export function emptyForm(today: string): RecordFormState {
  return { type: 'expense', date: today, amount: '', incomeKind: 'allowance', categoryId: null, memo: '' }
}

/** 入力のまちがいを、やさしい言葉で返す。問題なければ null */
export function validateRecordForm(f: RecordFormState, today: string): string | null {
  const amount = parseYen(f.amount)
  if (amount === null || amount === 0) return '金がくを 入れてね'
  if (Number.isNaN(amount) || amount > MAX_YEN) {
    return '金がくは 1 から 99,999,999 の 数字で 入れてね'
  }
  if (!f.date) return 'ひづけを えらんでね'
  if (f.date > today) return 'あしたより あとの ひづけは えらべないよ'
  if (f.type === 'expense' && f.categoryId === null) return 'しゅるいを えらんでね'
  return null
}

/** API に送る形。種類に関係のない欄は、送らない(null) */
export function toPayload(f: RecordFormState) {
  return {
    record_date: f.date,
    type: f.type,
    amount: parseYen(f.amount) as number,
    income_kind: f.type === 'income' ? f.incomeKind : null,
    category_id: f.type === 'expense' ? f.categoryId : null,
    memo: f.memo.trim(),
  }
}

/** その記録が、さいふの金額に与える変化(さいふ = もらった − つかった − 貯金へ入れた + 貯金からだした) */
export function walletEffect(type: RecordType, amount: number): number {
  return type === 'income' || type === 'withdraw' ? amount : -amount
}

/**
 * 「つかった」「貯金へ入れた」が、さいふより多いか。
 * 直すときは、直す前の記録の分を、先にもどしてから比べる。
 */
export function exceedsWallet(
  f: RecordFormState,
  currentWallet: number,
  original?: { type: RecordType; amount: number },
): boolean {
  if (f.type !== 'expense' && f.type !== 'deposit') return false
  const available = currentWallet - (original ? walletEffect(original.type, original.amount) : 0)
  return (parseYen(f.amount) as number) > available
}
