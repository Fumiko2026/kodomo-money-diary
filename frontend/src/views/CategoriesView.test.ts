import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import CategoriesView from './CategoriesView.vue'

const { get, del } = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { get, delete: del, post: vi.fn(), patch: vi.fn() },
}))

const LIST = [
  { id: 1, name: 'おやつ', color: 'red1', is_default: true },
  { id: 2, name: 'おもちゃ', color: 'yellow1', is_default: true },
  { id: 3, name: 'その他', color: 'gray1', is_default: true },
  { id: 10, name: 'ゲーム', color: 'blue1', is_default: false },
]

async function setup(usage = 0) {
  get.mockImplementation(async (path: string) => (path.endsWith('/usage') ? { record_count: usage } : LIST))
  del.mockResolvedValue(undefined)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: CategoriesView }, { path: '/more', component: { template: '<p/>' } }] })
  await router.push('/')
  const wrapper = mount(CategoriesView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}
const buttonWith = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
const click = async (el: Element | null | undefined) => {
  ;(el as HTMLElement).click()
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('しゅるい', () => {
  it('はじめから あるものは、直せない・消せない。自分で作ったものだけ、ボタンがある', async () => {
    const w = await setup()
    const items = w.findAll('.item')
    expect(items).toHaveLength(4)
    for (const i of [0, 1, 2]) {
      expect(items[i].text()).toContain('はじめから あるよ')
      expect(items[i].findAll('button')).toHaveLength(0)
    }
    expect(items[3].text()).toContain('ゲーム')
    expect(items[3].findAll('button')).toHaveLength(2)
  })

  it('消すとき、使われている記録があれば、「その他」になると伝える', async () => {
    const w = await setup(3)
    await w.get('[aria-label="ゲームを 消す"]').trigger('click')
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/categories/10/usage')
    expect(document.body.textContent).toContain('きろく(3 件)は『その他』に なるよ')
    expect(del).not.toHaveBeenCalled()
  })

  it('使われていないときは、ふつうの確認。「やめる」なら消さない', async () => {
    const w = await setup(0)
    await w.get('[aria-label="ゲームを 消す"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('「ゲーム」を ほんとうに 消す?')
    await click(buttonWith('やめる'))
    expect(del).not.toHaveBeenCalled()
  })

  it('確認で「消す」を押したら、消して、読みなおす', async () => {
    const w = await setup(2)
    await w.get('[aria-label="ゲームを 消す"]').trigger('click')
    await flushPromises()
    await click(document.querySelector('[role=alertdialog] button:last-child'))
    expect(del).toHaveBeenCalledWith('/categories/10')
    expect(get.mock.calls.filter(([p]) => p === '/categories')).toHaveLength(2)
  })

  it('「あたらしく作る」で、入力の画面が開く。直すでも開く', async () => {
    const w = await setup()
    await click(buttonWith('あたらしく作る'))
    expect(document.querySelector('[role=dialog]')).not.toBeNull()
    await click(buttonWith('やめる'))
    expect(document.querySelector('[role=dialog]')).toBeNull()

    await w.get('[aria-label="ゲームを 直す"]').trigger('click')
    expect((document.querySelector('#category-name') as HTMLInputElement).value).toBe('ゲーム')
  })
})
