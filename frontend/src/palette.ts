/** 項目の 8 色。キーは、バックエンドの app/palette.py と同じ。色の値は style.css の --c-キー。 */
import type { ColorKey } from './api/types'

// 色だけでなく、名前の文字でも伝える(色が分かりにくい人のため)
export const COLOR_OPTIONS: { key: ColorKey; label: string }[] = [
  { key: 'red1', label: 'あか' },
  { key: 'orange1', label: 'だいだい' },
  { key: 'yellow1', label: 'きいろ' },
  { key: 'green1', label: 'みどり' },
  { key: 'blue1', label: 'あお' },
  { key: 'purple1', label: 'むらさき' },
  { key: 'pink1', label: 'ピンク' },
  { key: 'gray1', label: 'はいいろ' },
]
