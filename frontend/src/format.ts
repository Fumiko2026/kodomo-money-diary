/** 金額を「1,100円」の形にする。 */
export function formatYen(amount: number): string {
  return `${amount.toLocaleString('ja-JP')}円`
}

/**
 * 入力された金額の文字を、整数にする。
 * 全角の数字とカンマも受け付ける。空は null、数字でないものは NaN を返す。
 */
export function parseYen(input: string): number | null {
  const text = input.normalize('NFKC').replace(/[,\s円]/g, '')
  if (text === '') return null
  if (!/^\d+$/.test(text)) return NaN
  return Number(text)
}

/** 日本時間の今日を、YYYY-MM-DD で返す(ブラウザの時計の場所に関係なく) */
export function todayJst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now)
}

/** 差額などを、「＋400円」「−400円」の形にする(色だけでなく、記号でも伝える) */
export function signedYen(amount: number): string {
  return amount >= 0 ? `＋${formatYen(amount)}` : `−${formatYen(-amount)}`
}
