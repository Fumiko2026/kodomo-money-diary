import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { todayJst } from '../format'
import RecordsView from './RecordsView.vue'

const { get, del } = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { get, delete: del },
}))

const THIS_MONTH = todayJst().slice(0, 7)

function rec(id: number, over: object = {}) {
  return {
    id, record_date: `${THIS_MONTH}-01`, type: 'expense', amount: 100, income_kind: null,
    category_id: 1, category_name: 'おやつ', category_color: 'red1', memo: '', ...over,
  }
}

const SAMPLE = [
  rec(3, { type: 'deposit', amount: 300, category_id: null, category_name: null, category_color: null }),
  rec(2, { type: 'expense', amount: 100, category_name: 'おやつ', memo: 'ガム' }),
  rec(1, { type: 'income', amount: 500, income_kind: 'otoshidama', category_id: null, category_name: null, category_color: null }),
]

async function setup(path = '/records') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/records', name: 'records', component: RecordsView },
      { path: '/records/new', component: { template: '<p>new</p>' } },
      { path: '/records/:id/edit', name: 'record-edit', component: { template: '<p>edit</p>' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(RecordsView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

const click = async (el: Element | null | undefined) => {
  ;(el as HTMLElement).click()
  await flushPromises()
}
const buttonWith = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
  get.mockResolvedValue(SAMPLE)
})

describe('きろくの一覧', () => {
  it('今月の記録を、API の順(新しい順)のまま出す', async () => {
    const { wrapper } = await setup()
    expect(get).toHaveBeenCalledWith(`/records?limit=50&offset=0&month=${THIS_MONTH}`)
    const rows = wrapper.findAll('.row')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('貯金へ入れた')
    expect(rows[0].text()).toContain('300円')
    expect(rows[1].text()).toContain('おやつ')
    expect(rows[1].text()).toContain('ガム')
    expect(rows[2].text()).toContain('お年玉')
  })

  it('種類は、色だけでなく、記号と文字でも伝える', async () => {
    const { wrapper } = await setup()
    const rows = wrapper.findAll('.row')
    expect(rows[0].find('.mark svg').exists()).toBe(true) // 貯金箱の絵
    expect(rows[1].find('.mark').text()).toBe('−')
    expect(rows[2].find('.mark').text()).toBe('＋')
    // 読み上げ用に、「つかった」などの文字もある
    expect(rows[1].find('.sr-only').text()).toContain('つかった')
    expect(rows[2].find('.sr-only').text()).toContain('もらった')
  })

  it('記録がないときは、やさしい言葉を出す', async () => {
    get.mockResolvedValue([])
    const { wrapper } = await setup()
    expect(wrapper.text()).toContain('きろくは まだ ないよ')
    expect(wrapper.findAll('.row')).toHaveLength(0)
  })

  it('月を変えると、その月で取りなおす。「ぜんぶ」は月を付けない', async () => {
    const { wrapper } = await setup()
    await wrapper.get('select').setValue('2025-10')
    await flushPromises() // アドレスの更新 → 読み込み、の順に進むのを待つ
    expect(get).toHaveBeenLastCalledWith('/records?limit=50&offset=0&month=2025-10')

    await wrapper.get('select').setValue('all')
    await flushPromises()
    expect(get).toHaveBeenLastCalledWith('/records?limit=50&offset=0')
  })

  it('アドレスの月で開く(直す画面から戻っても、同じ月)', async () => {
    await setup('/records?month=2025-03')
    expect(get).toHaveBeenCalledWith('/records?limit=50&offset=0&month=2025-03')
  })

  it('50 件ちょうどのときは「もっと 見る」を出し、続きを足す', async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => rec(100 - i))
    get.mockResolvedValueOnce(page1).mockResolvedValueOnce([rec(1)])
    const { wrapper } = await setup()
    expect(wrapper.findAll('.row')).toHaveLength(50)

    await click(buttonWith('もっと 見る'))
    expect(get).toHaveBeenLastCalledWith(`/records?limit=50&offset=50&month=${THIS_MONTH}`)
    expect(wrapper.findAll('.row')).toHaveLength(51)
    expect(wrapper.text()).not.toContain('もっと 見る') // 最後まで来た
  })

  it('3 件のときは「もっと 見る」を出さない', async () => {
    const { wrapper } = await setup()
    expect(wrapper.text()).not.toContain('もっと 見る')
  })

  it('エラーは言葉で出す', async () => {
    const { ApiError } = await import('../api/client')
    get.mockRejectedValue(new ApiError(0, 'つながらなかったよ。もういちど ためしてね'))
    const { wrapper } = await setup()
    expect(wrapper.text()).toContain('つながらなかったよ')
  })
})

describe('直す・消す', () => {
  it('1 件を押すと「直す」「消す」が出て、「直す」で直す画面へ', async () => {
    const { wrapper, router } = await setup()
    await wrapper.findAll('.row')[1].trigger('click')
    expect(document.body.textContent).toContain('直す')
    expect(document.body.textContent).toContain('消す')

    await click(buttonWith('直す'))
    expect(router.currentRoute.value.name).toBe('record-edit')
    expect(router.currentRoute.value.params.id).toBe('2')
  })

  it('「消す」を押しても、すぐには消さず、確認を出す。「やめる」なら消さない', async () => {
    const { wrapper } = await setup()
    await wrapper.findAll('.row')[1].trigger('click')
    await click(buttonWith('消す'))

    expect(document.body.textContent).toContain('ほんとうに 消す?')
    expect(del).not.toHaveBeenCalled()

    await click(buttonWith('やめる'))
    expect(del).not.toHaveBeenCalled()
    expect(wrapper.findAll('.row')).toHaveLength(3)
  })

  it('確認で「消す」を押したら、消して、一覧から外す', async () => {
    del.mockResolvedValue(undefined)
    const { wrapper } = await setup()
    await wrapper.findAll('.row')[1].trigger('click')
    await click(buttonWith('消す')) // 「消す」の選択
    await click(document.querySelector('[role=alertdialog] button:last-child')) // 確認の「消す」

    expect(del).toHaveBeenCalledWith('/records/2')
    expect(wrapper.findAll('.row')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('ガム')
  })

  it('「とじる」で、何もしないで閉じる', async () => {
    const { wrapper } = await setup()
    await wrapper.findAll('.row')[0].trigger('click')
    await click(buttonWith('とじる'))
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect(del).not.toHaveBeenCalled()
  })

  it('消すのに失敗したら、一覧はそのままで、言葉で伝える', async () => {
    const { ApiError } = await import('../api/client')
    del.mockRejectedValue(new ApiError(404, 'きろくが みつからないよ'))
    const { wrapper } = await setup()
    await wrapper.findAll('.row')[1].trigger('click')
    await click(buttonWith('消す'))
    await click(document.querySelector('[role=alertdialog] button:last-child'))
    expect(wrapper.text()).toContain('きろくが みつからないよ')
    expect(wrapper.findAll('.row')).toHaveLength(3)
  })
})
