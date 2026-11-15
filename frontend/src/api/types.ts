/** バックエンドの応答の形(docs/api.md)。 */

export type RecordType = 'income' | 'expense' | 'deposit' | 'withdraw'
export type IncomeKind = 'allowance' | 'otoshidama'
export type ColorKey =
  | 'red1'
  | 'orange1'
  | 'yellow1'
  | 'green1'
  | 'blue1'
  | 'purple1'
  | 'pink1'
  | 'gray1'

export interface Me {
  nickname: string
  initial_wallet: number
  initial_savings: number
}

export interface Balance {
  wallet: number
  savings: number
}

export interface MoneyRecord {
  id: number
  record_date: string
  type: RecordType
  amount: number
  income_kind: IncomeKind | null
  category_id: number | null
  category_name: string | null
  category_color: ColorKey | null
  memo: string
}

export interface Category {
  id: number
  name: string
  color: ColorKey
  is_default: boolean
}

export interface Summary {
  month: string
  income: { total: number; allowance: number; otoshidama: number }
  expense: {
    total: number
    by_category: { category_id: number; name: string; color: ColorKey; amount: number }[]
  }
  deposit: number
  withdraw: number
  diff: number
}

export interface Wish {
  id: number
  name: string
  target_amount: number
  otoshidama_plan: number | null
  monthly_plan: number | null
  saved: number
  months_left: number | null
}
