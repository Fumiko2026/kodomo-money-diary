import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { todayJst } from '../format'
import RecordFormView from './RecordFormView.vue'

const { get, post, put } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { get, post, put },
}))

const CATEGORIES = [
  { id: 1, name: 'おやつ', color: 'red1', is_default: true },
  { id: 2, name: 'おもちゃ', color: 'yellow1', is_default: true },
]

function stubApi(wallet = 1100, record?: object) {
  get.mockImplementation(async (path: string) => {
    if (path === '/categories') return CATEGORIES
    if (path === '/balance') return { wallet, savings: 300 }
    if (path.startsWith('/records/')) return record
    throw new Error(`想定していない: ${path}`)
  })
  post.mockResolvedValue({})
  put.mockResolvedValue({})
}

async function setup(path = '/records/new') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<p>home</p>' } },
      { path: '/records', name: 'records', component: { template: '<p>records</p>' } },
      { path: '/categories', component: { template: '<p>c</p>' } },
      { path: '/records/new', component: RecordFormView },
      { path: '/records/:id/edit', component: RecordFormView },
    ],
  })
  await router.push(path)
  const wrapper = mount(RecordFormView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

const text = (w: Awaited<ReturnType<typeof setup>>['wrapper']) => w.text()

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('きろくする(新しく)', () => {
  it('日づけの初期値は、日本時間の今日。未来は選べない', async () => {
    stubApi()
    const { wrapper } = await setup()
    const date = wrapper.get('input[type=date]')
    expect((date.element as HTMLInputElement).value).toBe(todayJst())
    expect(date.attributes('max')).toBe(todayJst())
  })

  it('「つかった」のときは、しゅるいを出す。「もらった」では、おこづかい / お年玉', async () => {
    stubApi()
    const { wrapper } = await setup()
    expect(text(wrapper)).toContain('おやつ')
    expect(text(wrapper)).toContain('あたらしく作る')

    await wrapper.get('input[value=income]').setValue()
    expect(text(wrapper)).toContain('おこづかい')
    expect(text(wrapper)).toContain('お年玉')
    expect(text(wrapper)).not.toContain('おやつ')

    await wrapper.get('input[value=deposit]').setValue()
    expect(text(wrapper)).not.toContain('おこづかい')
    expect(text(wrapper)).not.toContain('おやつ')
  })

  it('金がくが空のときは、文字で伝えて、送らない', async () => {
    stubApi()
    const { wrapper } = await setup()
    await wrapper.get('form').trigger('submit')
    expect(text(wrapper)).toContain('金がくを 入れてね')
    expect(post).not.toHaveBeenCalled()
  })

  it('「つかった」は、しゅるいを えらぶまで送れない', async () => {
    stubApi()
    const { wrapper } = await setup()
    await wrapper.get('#amount').setValue('100')
    await wrapper.get('form').trigger('submit')
    expect(text(wrapper)).toContain('しゅるいを えらんでね')
    expect(post).not.toHaveBeenCalled()
  })

  it('入力できたら、送って、ホームへ戻る', async () => {
    stubApi()
    const { wrapper, router } = await setup()
    await wrapper.get('input[name=category][value="1"]').setValue()
    await wrapper.get('#amount').setValue('100')
    await wrapper.get('#memo').setValue('ガム')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/records', {
      record_date: todayJst(), type: 'expense', amount: 100, income_kind: null, category_id: 1, memo: 'ガム',
    })
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('さいふより多いときは、確認を出す。「やめる」なら送らない', async () => {
    stubApi(1100)
    const { wrapper } = await setup()
    await wrapper.get('input[name=category][value="2"]').setValue()
    await wrapper.get('#amount').setValue('1101')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(document.body.textContent).toContain('さいふより 多いよ。それでも きろくする?')
    expect(post).not.toHaveBeenCalled()

    const cancel = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('やめる'))!
    cancel.click()
    await flushPromises()
    expect(document.body.textContent).not.toContain('それでも')
    expect(post).not.toHaveBeenCalled()
  })

  it('確認で「きろくする」を押したら、送る(エラーにはしない)', async () => {
    stubApi(1100)
    const { wrapper, router } = await setup()
    await wrapper.get('input[name=category][value="2"]').setValue()
    await wrapper.get('#amount').setValue('5000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const ok = [...document.querySelectorAll('.dialog button')].find((b) => b.textContent?.includes('きろくする'))!
    ;(ok as HTMLButtonElement).click()
    await flushPromises()

    expect(post).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('「もらった」は、さいふより多くても、確認を出さない', async () => {
    stubApi(0)
    const { wrapper } = await setup()
    await wrapper.get('input[value=income]').setValue()
    await wrapper.get('#amount').setValue('500')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(document.body.textContent).not.toContain('それでも')
    expect(post).toHaveBeenCalledWith('/records', expect.objectContaining({ type: 'income', income_kind: 'allowance', category_id: null }))
  })

  it('サーバーのエラーは、言葉で出す', async () => {
    stubApi()
    const { ApiError } = await import('../api/client')
    post.mockRejectedValue(new ApiError(422, 'そのしゅるいは つかえないよ'))
    const { wrapper } = await setup()
    await wrapper.get('input[value=deposit]').setValue()
    await wrapper.get('#amount').setValue('50')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(text(wrapper)).toContain('そのしゅるいは つかえないよ')
  })
})

describe('その場で しゅるいを作る', () => {
  it('「あたらしく作る」で作ると、一覧に足して、えらんだ状態になる(入力は、そのまま)', async () => {
    stubApi()
    post.mockResolvedValue({ id: 9, name: 'ゲーム', color: 'green1', is_default: false })
    const { wrapper } = await setup()
    await wrapper.get('#amount').setValue('300')
    await wrapper.get('#memo').setValue('ソフト')

    await [...wrapper.findAll('button')].find((b) => b.text().includes('あたらしく作る'))!.trigger('click')
    const name = document.querySelector('#category-name') as HTMLInputElement
    name.value = 'ゲーム'
    name.dispatchEvent(new Event('input'))
    ;(document.querySelector('input[value=green1]') as HTMLInputElement).click()
    ;(document.querySelector('[role=dialog] button[type=submit]') as HTMLButtonElement).click()
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/categories', { name: 'ゲーム', color: 'green1' })
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect((wrapper.get('input[name=category][value="9"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.get('#amount').element as HTMLInputElement).value).toBe('300') // 入力は消えない
    expect((wrapper.get('#memo').element as HTMLInputElement).value).toBe('ソフト')
  })
})

describe('きろくを 直す', () => {
  const record = {
    id: 7, record_date: '2026-11-10', type: 'expense', amount: 300,
    income_kind: null, category_id: 2, category_name: 'おもちゃ', category_color: 'yellow1', memo: 'カード',
  }

  it('いまの内容が入っていて、直したら PUT で送り、一覧へ戻る', async () => {
    stubApi(700, record)
    const { wrapper, router } = await setup('/records/7/edit')
    expect((wrapper.get('#amount').element as HTMLInputElement).value).toBe('300')
    expect((wrapper.get('#memo').element as HTMLInputElement).value).toBe('カード')
    expect((wrapper.get('input[name=category][value="2"]').element as HTMLInputElement).checked).toBe(true)

    await wrapper.get('#amount').setValue('1000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    // さいふ 700 円 + 直す前の 300 円 = 1,000 円まで。ちょうどなので、確認は出ない
    expect(document.body.textContent).not.toContain('それでも')
    expect(put).toHaveBeenCalledWith('/records/7', expect.objectContaining({ amount: 1000, category_id: 2 }))
    expect(router.currentRoute.value.name).toBe('records')
  })

  it('見つからないときは、言葉で伝える', async () => {
    const { ApiError } = await import('../api/client')
    get.mockImplementation(async (path: string) => {
      if (path.startsWith('/records/')) throw new ApiError(404, 'きろくが みつからないよ')
      return path === '/balance' ? { wallet: 0, savings: 0 } : CATEGORIES
    })
    const { wrapper } = await setup('/records/99/edit')
    expect(text(wrapper)).toContain('きろくが みつからないよ')
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
