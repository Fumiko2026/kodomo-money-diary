import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COLOR_OPTIONS } from '../palette'
import CategorySheet from './CategorySheet.vue'

const { post, patch } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }))

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: { post, patch },
}))

beforeEach(() => vi.clearAllMocks())

describe('CategorySheet', () => {
  it('8 色を、名前の文字つきで出す', () => {
    const w = mount(CategorySheet)
    expect(w.findAll('.swatch')).toHaveLength(8)
    expect(COLOR_OPTIONS.map((c) => c.label).every((label) => w.text().includes(label))).toBe(true)
    expect(w.get('.swatch.selected').text()).toContain('あお') // はじめの色
    expect(w.get('.swatch.selected').text()).toContain('✓')
  })

  it('名前と色を入れて作ると、POST して、できたものを伝える', async () => {
    post.mockResolvedValue({ id: 9, name: 'ゲーム', color: 'green1', is_default: false })
    const w = mount(CategorySheet)
    await w.get('#category-name').setValue('  ゲーム ')
    await w.get('input[value=green1]').setValue()
    await w.get('form').trigger('submit')
    await flushPromises()

    expect(post).toHaveBeenCalledWith('/categories', { name: 'ゲーム', color: 'green1' })
    expect(w.emitted('saved')![0][0]).toMatchObject({ id: 9, name: 'ゲーム' })
  })

  it('名前が空のときは、送らずに、言葉で伝える', async () => {
    const w = mount(CategorySheet)
    await w.get('form').trigger('submit')
    expect(w.text()).toContain('名前を 入れてね')
    expect(post).not.toHaveBeenCalled()
  })

  it('直すときは、いまの内容が入っていて、PATCH する', async () => {
    patch.mockResolvedValue({ id: 5, name: '本', color: 'pink1', is_default: false })
    const w = mount(CategorySheet, { props: { category: { id: 5, name: 'ほん', color: 'red1', is_default: false } } })
    expect((w.get('#category-name').element as HTMLInputElement).value).toBe('ほん')
    expect(w.get('.swatch.selected').text()).toContain('あか')

    await w.get('#category-name').setValue('本')
    await w.get('input[value=pink1]').setValue()
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(patch).toHaveBeenCalledWith('/categories/5', { name: '本', color: 'pink1' })
  })

  it('同じ名前だと断られたら、その言葉を出して、閉じない', async () => {
    const { ApiError } = await import('../api/client')
    post.mockRejectedValue(new ApiError(409, 'おなじ名前の しゅるいが あるよ'))
    const w = mount(CategorySheet)
    await w.get('#category-name').setValue('おやつ')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('おなじ名前の しゅるいが あるよ')
    expect(w.emitted('saved')).toBeUndefined()
  })

  it('「やめる」で閉じる', async () => {
    const w = mount(CategorySheet)
    await w.get('button.secondary').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})
