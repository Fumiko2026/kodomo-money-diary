import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { auth } from '../auth'
import { todayJst } from '../format'
import HomeView from './HomeView.vue'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { get },
}))

const MONTH = todayJst().slice(0, 7)

const SUMMARY = {
  month: MONTH,
  income: { total: 500, allowance: 500, otoshidama: 0 },
  expense: { total: 100, by_category: [] },
  deposit: 300, withdraw: 0, diff: 400,
}
const RECENT = [
  { id: 3, record_date: `${MONTH}-13`, type: 'deposit', amount: 300, income_kind: null, category_id: null, category_name: null, category_color: null, memo: '' },
  { id: 2, record_date: `${MONTH}-12`, type: 'expense', amount: 100, income_kind: null, category_id: 1, category_name: 'おやつ', category_color: 'red1', memo: '' },
]
const WISH = { id: 1, name: 'ゲームソフト', target_amount: 5000, otoshidama_plan: null, monthly_plan: 800, saved: 300, months_left: 6 }

function stub(over: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    '/balance': { wallet: 1100, savings: 300 },
    [`/summary?month=${MONTH}`]: SUMMARY,
    '/wishes': [WISH],
    '/records?limit=3': RECENT,
    ...over,
  }
  get.mockImplementation(async (path: string) => {
    const value = data[path]
    if (value instanceof Error) throw value
    if (value === undefined) throw new Error(`想定していない: ${path}`)
    return value
  })
}

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/summary', '/wishes', '/records', '/records/new'].map((path) => ({ path, component: { template: '<p/>' } })),
  })
  await router.push('/')
  const wrapper = mount(HomeView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.me = { nickname: 'ふみ', initial_wallet: 0, initial_savings: 0 }
})

describe('ホーム', () => {
  it('さいふと貯金を、同じ大きさのカードで出す', async () => {
    stub()
    const w = await setup()
    const cards = w.findAll('.balance')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('さいふ')
    expect(cards[0].text()).toContain('1,100円')
    expect(cards[1].text()).toContain('貯金')
    expect(cards[1].text()).toContain('300円')
    expect(cards[1].find('svg').exists()).toBe(true) // 貯金箱の絵
  })

  it('今月のまとめ(もらった・つかった)を出す', async () => {
    stub()
    const w = await setup()
    const month = Number(MONTH.slice(5))
    expect(w.text()).toContain(`${month}月のまとめ`)
    expect(w.get('.line.income').text()).toContain('500円')
    expect(w.get('.line.expense').text()).toContain('100円')
  })

  it('ほしいものの進み具合を、棒と文字で出す', async () => {
    stub()
    const w = await setup()
    expect(w.text()).toContain('ゲームソフト')
    expect(w.text()).toContain('300 / 5,000円')
    expect(w.text()).toContain('あと 6 か月くらい')
    const bar = w.get('[role=progressbar]')
    expect(bar.attributes('aria-valuenow')).toBe('300')
    expect(bar.attributes('aria-valuemax')).toBe('5000')
    expect(w.get('.fill').attributes('style')).toContain('width: 6%')
  })

  it('計画が空のときは「あと何か月」を出さない。貯まったら、よろこぶ', async () => {
    stub({ '/wishes': [
      { ...WISH, months_left: null },
      { ...WISH, id: 2, name: 'ぼうし', target_amount: 300, saved: 300, months_left: 0 },
    ] })
    const w = await setup()
    expect(w.text()).not.toContain('あと null')
    expect(w.text()).not.toContain('か月くらい')
    expect(w.text()).toContain('もう 貯まったよ!')
  })

  it('ほしいものが 0 件のときは、「入れてみよう」のボタンを出す', async () => {
    stub({ '/wishes': [] })
    const w = await setup()
    const button = w.get('[aria-labelledby=wish-title] a.button')
    expect(button.text()).toContain('ほしいものを 入れてみよう')
    expect(button.attributes('href')).toBe('/wishes')
  })

  it('さいきんの きろくを、押せない行で出す', async () => {
    stub()
    const w = await setup()
    const rows = w.findAll('.recent .row')
    expect(rows).toHaveLength(2)
    expect(rows[0].element.tagName).toBe('DIV') // ボタンではない
    expect(rows[0].text()).toContain('貯金へ入れた')
    expect(rows[1].text()).toContain('おやつ')
  })

  it('きろくが 0 件のときは、すすめの言葉を出す', async () => {
    stub({ '/records?limit=3': [] })
    const w = await setup()
    expect(w.text()).toContain('まだ ないよ')
    expect(w.findAll('.recent .row')).toHaveLength(0)
  })

  it('1 つが失敗しても、ほかは出す', async () => {
    const { ApiError } = await import('../api/client')
    stub({ '/wishes': new ApiError(0, 'つながらなかったよ。もういちど ためしてね') })
    const w = await setup()
    expect(w.text()).toContain('つながらなかったよ')
    expect(w.text()).toContain('1,100円')
    expect(w.text()).toContain('さいきんの きろく')
  })
})
