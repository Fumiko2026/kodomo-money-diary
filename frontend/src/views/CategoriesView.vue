<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, api } from '../api/client'
import type { Category } from '../api/types'
import BackHeader from '../components/BackHeader.vue'
import CategorySheet from '../components/CategorySheet.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')

const sheetOpen = ref(false)
const editing = ref<Category | null>(null)
const deleting = ref<{ category: Category; count: number } | null>(null)

async function load() {
  try {
    categories.value = await api.get<Category[]>('/categories')
    error.value = ''
  } catch (e) {
    error.value = messageOf(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function messageOf(e: unknown): string {
  return e instanceof ApiError ? e.message : 'うまく いかなかったよ'
}

function openNew() {
  editing.value = null
  sheetOpen.value = true
}
function openEdit(c: Category) {
  editing.value = c
  sheetOpen.value = true
}
async function onSaved() {
  sheetOpen.value = false
  await load()
}

// 消すまえに、そのしゅるいを使っているきろくの数を聞いて、確認を出す
async function askDelete(category: Category) {
  try {
    const { record_count } = await api.get<{ record_count: number }>(`/categories/${category.id}/usage`)
    deleting.value = { category, count: record_count }
  } catch (e) {
    error.value = messageOf(e)
  }
}

const deleteMessage = computed(() => {
  if (!deleting.value) return ''
  const { category, count } = deleting.value
  return count > 0
    ? `「${category.name}」を 消すよ。この しゅるいの きろく(${count} 件)は『その他』に なるよ。いいかな?`
    : `「${category.name}」を ほんとうに 消す?`
})

async function remove() {
  const target = deleting.value
  deleting.value = null
  if (!target) return
  try {
    await api.delete(`/categories/${target.category.id}`)
    await load()
  } catch (e) {
    error.value = messageOf(e)
  }
}
</script>

<template>
  <BackHeader title="しゅるい" fallback="/more" />

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="sub">よみこみ中…</p>

  <template v-else>
    <p class="sub">お金を つかったときに えらぶ、しゅるいだよ。</p>

    <ul class="list">
      <li v-for="c in categories" :key="c.id" class="item" :style="{ background: `var(--c-${c.color})` }">
        <span class="name">{{ c.name }}</span>
        <span v-if="c.is_default" class="fixed">はじめから あるよ</span>
        <span v-else class="actions">
          <button type="button" class="secondary" :aria-label="`${c.name}を 直す`" @click="openEdit(c)">直す</button>
          <button type="button" class="secondary" :aria-label="`${c.name}を 消す`" @click="askDelete(c)">消す</button>
        </span>
      </li>
    </ul>

    <button type="button" class="add" @click="openNew">＋ あたらしく作る</button>
  </template>

  <CategorySheet v-if="sheetOpen" :category="editing" @saved="onSaved" @close="sheetOpen = false" />

  <ConfirmDialog :open="deleting !== null" :message="deleteMessage" ok-label="消す" @ok="remove" @cancel="deleting = null" />
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.5rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 56px;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius);
}
.name {
  font-weight: 800;
}
.fixed {
  font-size: 0.85rem;
}
.actions {
  display: flex;
  gap: 0.4rem;
}
/* 色のついた行の上でも、ボタンを読みやすくする */
.actions button {
  background: #fff;
}
.add {
  width: 100%;
  min-height: 56px;
  font-size: 1.1rem;
}
</style>
