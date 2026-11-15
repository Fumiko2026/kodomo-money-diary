import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WishesView from './WishesView.vue'

const { get, post, patch, del } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { get, post, patch, delete: del },
}))

function wish(id: number, over: object = {}) {
  return { id, name: `ほしい${id}`, target_amount: 5000, otoshidama_plan: null, monthly_plan: null, saved: 300, months_left: null, ...over }
}

async function setup(list: object[] = []) {
  get.mockResolvedValue(list)
  post.mockResolvedValue({})
  patch.mockResolvedValue({})
  del.mockResolvedValue(undefined)
  const wrapper = mount(WishesView, { attachTo: document.body })
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

describe('ほしいもの', () => {
  it('0 件のときは、すすめの言葉と、追加のボタンを出す', async () => {
    const w = await setup([])
    expect(w.text()).toContain('ほしいものを 入れて')
    expect(buttonWith('ほしいものを 入れる')).toBeTruthy()
  })

  it('カードに、進み具合と計画を出す', async () => {
    const w = await setup([wish(1, { otoshidama_plan: 2000, monthly_plan: 800, months_left: 6 })])
    expect(w.text()).toContain('300 / 5,000円')
    expect(w.text()).toContain('あと 6 か月くらい')
    expect(w.text()).toContain('お年玉から 2,000円')
    expect(w.text()).toContain('毎月のおこづかいから 800円')
  })

  it('計画が両方とも空のときは、「計画は まだ ないよ」', async () => {
    const w = await setup([wish(1)])
    expect(w.text()).toContain('計画は まだ ないよ')
  })

  it('3 つあるときは、追加のボタンを出さず、理由を文字で伝える', async () => {
    const w = await setup([wish(1), wish(2), wish(3)])
    expect(w.text()).toContain('ほしいものは 3 つまでだよ')
    expect(buttonWith('ほしいものを 入れる')).toBeUndefined()
  })

  it('2 つのときは、まだ追加できる', async () => {
    await setup([wish(1), wish(2)])
    expect(buttonWith('ほしいものを 入れる')).toBeTruthy()
  })
})

describe('入れる', () => {
  it('名前と金がくを入れて送ると、送ったあとに読みなおす', async () => {
    const w = await setup([])
    await click(buttonWith('ほしいものを 入れる'))
    await w.get('#wish-name').setValue('ゲームソフト')
    await w.get('#wish-target').setValue('5000')
    await w.get('#wish-monthly').setValue('800')
    await w.get('form').trigger('submit')
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/wishes', {
      name: 'ゲームソフト', target_amount: 5000, otoshidama_plan: null, monthly_plan: 800,
    })
    expect(get).toHaveBeenCalledTimes(2) // 最初 + 送ったあと
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })

  it('入力がまちがっているときは、送らずに、言葉で伝える', async () => {
    const w = await setup([])
    await click(buttonWith('ほしいものを 入れる'))
    await w.get('form').trigger('submit')
    expect(w.text()).toContain('名前を 入れてね')
    await w.get('#wish-name').setValue('本')
    await w.get('form').trigger('submit')
    expect(w.text()).toContain('ほしい金がくを 入れてね')
    expect(post).not.toHaveBeenCalled()
  })

  it('「やめる」で、送らずに閉じる', async () => {
    await setup([])
    await click(buttonWith('ほしいものを 入れる'))
    await click(buttonWith('やめる'))
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect(post).not.toHaveBeenCalled()
  })

  it('サーバーが「3 つまで」と断ったら、その言葉を出す', async () => {
    const { ApiError } = await import('../api/client')
    const w = await setup([])
    post.mockRejectedValue(new ApiError(409, 'ほしいものは 3 つまでだよ'))
    await click(buttonWith('ほしいものを 入れる'))
    await w.get('#wish-name').setValue('本')
    await w.get('#wish-target').setValue('900')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(document.body.textContent).toContain('ほしいものは 3 つまでだよ')
  })
})

describe('直す・消す', () => {
  it('直す画面に、いまの内容が入っていて、計画を空にして送れる', async () => {
    const w = await setup([wish(7, { name: '本', target_amount: 900, monthly_plan: 300 })])
    await click(buttonWith('直す'))
    expect((w.get('#wish-name').element as HTMLInputElement).value).toBe('本')
    expect((w.get('#wish-target').element as HTMLInputElement).value).toBe('900')
    expect((w.get('#wish-monthly').element as HTMLInputElement).value).toBe('300')

    await w.get('#wish-monthly').setValue('')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/wishes/7', {
      name: '本', target_amount: 900, otoshidama_plan: null, monthly_plan: null,
    })
  })

  it('「消す」は、確認を出す。「やめる」なら消さない', async () => {
    await setup([wish(1, { name: '本' })])
    await click(buttonWith('消す'))
    expect(document.body.textContent).toContain('「本」を ほんとうに 消す?')
    expect(del).not.toHaveBeenCalled()
    await click(buttonWith('やめる'))
    expect(del).not.toHaveBeenCalled()
  })

  it('確認で「消す」を押したら、消して、読みなおす', async () => {
    await setup([wish(1, { name: '本' })])
    await click(buttonWith('消す')) // カードの「消す」
    await click(document.querySelector('[role=alertdialog] button:last-child'))
    expect(del).toHaveBeenCalledWith('/wishes/1')
    expect(get).toHaveBeenCalledTimes(2)
  })
})
