import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { todayJst } from '../format'
import { shiftMonth } from '../recordDisplay'
import SummaryView from './SummaryView.vue'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { get },
}))

const THIS = todayJst().slice(0, 7)
const PREV = shiftMonth(THIS, -1)

const SUMMARY = {
  month: THIS,
  income: { total: 3500, allowance: 500, otoshidama: 3000 },
  expense: {
    total: 650,
    by_category: [
      { category_id: 2, name: 'おもちゃ', color: 'yellow1', amount: 400 },
      { category_id: 1, name: 'おやつ', color: 'red1', amount: 250 },
    ],
  },
  deposit: 300, withdraw: 50, diff: 2850,
}

async function setup(path = '/summary') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/summary', component: SummaryView }],
  })
  await router.push(path)
  const wrapper = mount(SummaryView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  get.mockResolvedValue(SUMMARY)
})

describe('月のまとめ', () => {
  it('はじめは今月。API に月を渡す', async () => {
    const { wrapper } = await setup()
    expect(get).toHaveBeenCalledWith(`/summary?month=${THIS}`)
    expect(wrapper.get('.current').text()).toBe(`${THIS.slice(0, 4)}年 ${Number(THIS.slice(5))}月`)
  })

  it('もらった(種類別)・つかった・貯金・さ を出す', async () => {
    const { wrapper } = await setup()
    const text = wrapper.text()
    expect(wrapper.get('.income').text()).toContain('3,500円')
    expect(text).toContain('おこづかい 500円 / お年玉 3,000円')
    expect(wrapper.get('.expense').text()).toContain('650円')
    expect(wrapper.get('.savings').text()).toContain('貯金へ入れた')
    expect(wrapper.get('.savings').text()).toContain('300円')
    expect(wrapper.get('.savings').text()).toContain('貯金からだした 50円')
    expect(wrapper.get('.diff').text()).toContain('＋2,850円')
  })

  it('貯金からだした額が 0 のときは、その行を出さない', async () => {
    get.mockResolvedValue({ ...SUMMARY, withdraw: 0 })
    const { wrapper } = await setup()
    expect(wrapper.text()).not.toContain('貯金からだした')
  })

  it('さ が マイナスのときは、「−」の記号で出す', async () => {
    get.mockResolvedValue({ ...SUMMARY, diff: -400 })
    const { wrapper } = await setup()
    expect(wrapper.get('.diff').text()).toContain('−400円')
  })

  it('しゅるい別の棒は、多い順。いちばん多いものが、いちばん長い', async () => {
    const { wrapper } = await setup()
    const rows = wrapper.findAll('.bars li')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('おもちゃ')
    expect(rows[0].text()).toContain('400円')
    expect(rows[0].get('.bar').attributes('style')).toContain('width: 100%')
    expect(rows[0].get('.bar').attributes('style')).toContain('var(--c-yellow1)')
    expect(rows[1].get('.bar').attributes('style')).toContain('width: 63%') // 250 / 400
  })

  it('つかっていない月は、言葉で伝える', async () => {
    get.mockResolvedValue({ ...SUMMARY, expense: { total: 0, by_category: [] } })
    const { wrapper } = await setup()
    expect(wrapper.text()).toContain('つかって いないよ')
    expect(wrapper.findAll('.bars li')).toHaveLength(0)
  })
})

describe('月の切りかえ', () => {
  it('◀ で前の月、▶ でもどる', async () => {
    const { wrapper } = await setup()
    await wrapper.get('[aria-label="前の月"]').trigger('click')
    await flushPromises()
    expect(get).toHaveBeenLastCalledWith(`/summary?month=${PREV}`)

    await wrapper.get('[aria-label="つぎの月"]').trigger('click')
    await flushPromises()
    expect(get).toHaveBeenLastCalledWith(`/summary?month=${THIS}`)
  })

  it('今月のときは、▶ を押せない(未来の月は見られない)', async () => {
    const { wrapper } = await setup()
    expect(wrapper.get('[aria-label="つぎの月"]').attributes('disabled')).toBeDefined()
    await setup()
    expect(get).not.toHaveBeenCalledWith(`/summary?month=${shiftMonth(THIS, 1)}`)
  })

  it('アドレスの月で開く。未来やおかしな月は、今月にする', async () => {
    await setup('/summary?month=2025-03')
    expect(get).toHaveBeenLastCalledWith('/summary?month=2025-03')

    await setup(`/summary?month=${shiftMonth(THIS, 2)}`)
    expect(get).toHaveBeenLastCalledWith(`/summary?month=${THIS}`)

    await setup('/summary?month=abc')
    expect(get).toHaveBeenLastCalledWith(`/summary?month=${THIS}`)
  })

  it('エラーは言葉で出す', async () => {
    const { ApiError } = await import('../api/client')
    get.mockRejectedValue(new ApiError(0, 'つながらなかったよ。もういちど ためしてね'))
    const { wrapper } = await setup()
    expect(wrapper.text()).toContain('つながらなかったよ')
  })
})
