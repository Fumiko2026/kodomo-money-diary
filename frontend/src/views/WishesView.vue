<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiError, api } from '../api/client'
import type { Wish } from '../api/types'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import WishProgress from '../components/WishProgress.vue'
import { formatYen } from '../format'
import { emptyWishForm, toWishPayload, validateWishForm, wishToForm } from '../wishForm'

const MAX_WISHES = 3

const wishes = ref<Wish[]>([])
const loading = ref(true)
const error = ref('')

// 入力の画面(新しく / 直す)
const sheetOpen = ref(false)
const editing = ref<Wish | null>(null)
const form = reactive(emptyWishForm())
const formError = ref('')
const busy = ref(false)

const deleting = ref<Wish | null>(null)

const isFull = computed(() => wishes.value.length >= MAX_WISHES)

async function load() {
  try {
    wishes.value = await api.get<Wish[]>('/wishes')
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
  Object.assign(form, emptyWishForm())
  formError.value = ''
  sheetOpen.value = true
}

function openEdit(w: Wish) {
  editing.value = w
  Object.assign(form, wishToForm(w))
  formError.value = ''
  sheetOpen.value = true
}

async function save() {
  formError.value = ''
  const problem = validateWishForm(form)
  if (problem) {
    formError.value = problem
    return
  }
  busy.value = true
  try {
    if (editing.value) await api.patch(`/wishes/${editing.value.id}`, toWishPayload(form))
    else await api.post('/wishes', toWishPayload(form))
    sheetOpen.value = false
    await load() // 貯金のあて方が変わるので、ぜんぶ読みなおす
  } catch (e) {
    formError.value = messageOf(e)
  } finally {
    busy.value = false
  }
}

async function remove() {
  const target = deleting.value
  deleting.value = null
  if (!target) return
  try {
    await api.delete(`/wishes/${target.id}`)
    await load()
  } catch (e) {
    error.value = messageOf(e)
  }
}
</script>

<template>
  <h1>ほしいもの</h1>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading" class="sub">よみこみ中…</p>

  <template v-else>
    <p v-if="!wishes.length && !error" class="empty">
      ほしいものを 入れて、貯金の 計画を 立てよう!
    </p>

    <ul class="cards">
      <li v-for="w in wishes" :key="w.id" class="card wish-card">
        <WishProgress :wish="w" />
        <ul class="plans">
          <li v-if="w.otoshidama_plan !== null">お年玉から {{ formatYen(w.otoshidama_plan) }}</li>
          <li v-if="w.monthly_plan !== null">毎月のおこづかいから {{ formatYen(w.monthly_plan) }}</li>
          <li v-if="w.otoshidama_plan === null && w.monthly_plan === null" class="sub">計画は まだ ないよ</li>
        </ul>
        <div class="actions">
          <button type="button" class="secondary" @click="openEdit(w)">直す</button>
          <button type="button" class="secondary" @click="deleting = w">消す</button>
        </div>
      </li>
    </ul>

    <!-- 3 つあるときは、追加のボタンを出さず、理由を文字で伝える -->
    <p v-if="isFull" class="limit">ほしいものは 3 つまでだよ</p>
    <button v-else type="button" class="add" @click="openNew">＋ ほしいものを 入れる</button>
  </template>

  <!-- 入れる・直す -->
  <div v-if="sheetOpen" class="overlay" @click.self="sheetOpen = false" @keydown.esc="sheetOpen = false">
    <form class="sheet card" role="dialog" aria-modal="true" aria-labelledby="sheet-title" novalidate @submit.prevent="save">
      <h2 id="sheet-title">{{ editing ? 'ほしいものを 直す' : 'ほしいものを 入れる' }}</h2>

      <div class="field">
        <label for="wish-name">ほしいものの 名前</label>
        <input id="wish-name" v-model="form.name" maxlength="20" autocomplete="off" />
      </div>
      <div class="field">
        <label for="wish-target">ほしい金がく</label>
        <div class="yen-row">
          <input id="wish-target" v-model="form.target" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0" />
          <span class="yen">円</span>
        </div>
      </div>

      <fieldset>
        <legend>貯金の 計画(どちらか、または 両方。空でもいいよ)</legend>
        <div class="field">
          <label for="wish-otoshidama">お年玉から</label>
          <div class="yen-row">
            <input id="wish-otoshidama" v-model="form.otoshidama" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
            <span class="yen">円</span>
          </div>
        </div>
        <div class="field">
          <label for="wish-monthly">毎月のおこづかいから</label>
          <div class="yen-row">
            <input id="wish-monthly" v-model="form.monthly" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
            <span class="yen">円</span>
          </div>
        </div>
      </fieldset>

      <p v-if="formError" class="error" role="alert">{{ formError }}</p>

      <div class="sheet-buttons">
        <button type="button" class="secondary" @click="sheetOpen = false">やめる</button>
        <button type="submit" :disabled="busy">{{ editing ? 'なおす' : 'いれる' }}</button>
      </div>
    </form>
  </div>

  <ConfirmDialog
    :open="deleting !== null"
    :message="`「${deleting?.name}」を ほんとうに 消す?`"
    ok-label="消す"
    @ok="remove"
    @cancel="deleting = null"
  />
</template>

<style scoped>
.empty {
  padding: 1rem 0;
  text-align: center;
}
.cards {
  display: grid;
  gap: 0.75rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}
.plans {
  margin: 0 0 0.75rem;
  padding: 0;
  font-size: 0.95rem;
  list-style: none;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.add {
  width: 100%;
  min-height: 56px;
  font-size: 1.1rem;
}
.limit {
  padding: 0.75rem;
  border: 2px dashed var(--text-sub);
  border-radius: var(--radius);
  font-weight: 800;
  text-align: center;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(59, 47, 47, 0.45);
}
.sheet {
  width: 100%;
  max-width: 440px;
}
fieldset {
  min-width: 0;
  margin: 0 0 0.5rem;
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: 0.5rem;
  padding: 0;
  font-weight: 800;
}
.yen-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.yen {
  font-weight: 800;
}
.sheet-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
