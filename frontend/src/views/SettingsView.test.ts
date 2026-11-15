import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { auth } from '../auth'
import SettingsView from './SettingsView.vue'

const { patch, post } = vi.hoisted(() => ({ patch: vi.fn(), post: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { patch, post },
}))

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: SettingsView },
      { path: '/login', name: 'login', component: { template: '<p>login</p>' } },
      { path: '/more', component: { template: '<p/>' } },
    ],
  })
  await router.push('/')
  const wrapper = mount(SettingsView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.me = { nickname: 'ふみ', initial_wallet: 1000, initial_savings: 250 }
})

describe('せってい', () => {
  it('ニックネームと、いまの はじめの金がくを出す', async () => {
    const { wrapper } = await setup()
    expect(wrapper.text()).toContain('ふみ')
    expect((wrapper.get('#wallet').element as HTMLInputElement).value).toBe('1000')
    expect((wrapper.get('#savings').element as HTMLInputElement).value).toBe('250')
  })

  it('直して送ると、PATCH して、「なおしたよ」を出す', async () => {
    patch.mockResolvedValue({ nickname: 'ふみ', initial_wallet: 2000, initial_savings: 0 })
    const { wrapper } = await setup()
    await wrapper.get('#wallet').setValue('２,０００')
    await wrapper.get('#savings').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith('/me', { initial_wallet: 2000, initial_savings: 0 })
    expect(wrapper.text()).toContain('なおしたよ')
    expect(auth.me?.initial_wallet).toBe(2000)
  })

  it('数字でないときは、送らずに、言葉で伝える', async () => {
    const { wrapper } = await setup()
    await wrapper.get('#wallet').setValue('abc')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('はじめの さいふは、0 から 99,999,999 の 数字で 入れてね')
    expect(patch).not.toHaveBeenCalled()
  })

  it('ログアウトすると、ログイン画面へ', async () => {
    post.mockResolvedValue(undefined)
    const { wrapper, router } = await setup()
    await wrapper.get('button.secondary').trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/auth/logout')
    expect(auth.me).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
  })
})
