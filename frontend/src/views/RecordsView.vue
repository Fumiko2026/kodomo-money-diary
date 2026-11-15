<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, api } from '../api/client'
import type { MoneyRecord } from '../api/types'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import RecordRow from '../components/RecordRow.vue'
import RecordFab from '../components/RecordFab.vue'
import { formatYen, todayJst } from '../format'
import { monthLabel, recentMonths, recordTitle, shortDate } from '../recordDisplay'

const PAGE = 50
const ALL = 'all'

const route = useRoute()
const router = useRouter()
const today = todayJst()

// 見る月は、アドレスに入れておく(直す画面から戻っても、同じ月が開く)
const selected = computed(() => {
  const m = route.query.month
  return typeof m === 'string' && (m === ALL || /^\d{4}-(0[1-9]|1[0-2])$/.test(m)) ? m : today.slice(0, 7)
})
const monthOptions = computed(() => {
  const options = recentMonths(today)
  // 古い月をアドレスで開いたときも、選べる月に入れる
  if (selected.value !== ALL && !options.some((o) => o.value === selected.value)) {
    options.push({ value: selected.value, label: monthLabel(selected.value) })
  }
  return options
})

const items = ref<MoneyRecord[]>([])
const hasMore = ref(false)
const loading = ref(true)
const error = ref('')

const active = ref<MoneyRecord | null>(null) // 「直す」「消す」を選んでいる記録
const confirmDelete = ref(false)

let seq = 0 // 月を切りかえたあとに、前の月の答えが来ても、使わない

async function load(reset: boolean) {
  const mine = ++seq
  loading.value = true
  error.value = ''
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(reset ? 0 : items.value.length) })
  if (selected.value !== ALL) params.set('month', selected.value)
  try {
    const page = await api.get<MoneyRecord[]>(`/records?${params}`)
    if (mine !== seq) return
    items.value = reset ? page : [...items.value, ...page]
    hasMore.value = page.length === PAGE
  } catch (e) {
    if (mine !== seq) return
    error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
  } finally {
    if (mine === seq) loading.value = false
  }
}

watch(selected, () => load(true), { immediate: true })

function changeMonth(event: Event) {
  const month = (event.target as HTMLSelectElement).value
  void router.replace({ query: { month } })
}

function edit() {
  if (!active.value) return
  void router.push({ name: 'record-edit', params: { id: active.value.id } })
}

async function remove() {
  const target = active.value
  confirmDelete.value = false
  if (!target) return
  try {
    await api.delete(`/records/${target.id}`)
    items.value = items.value.filter((r) => r.id !== target.id)
    active.value = null
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
    active.value = null
  }
}
</script>

<template>
  <header class="head">
    <h1>きろく</h1>
    <label class="month">
      <span class="sr-only">見る月</span>
      <select :value="selected" @change="changeMonth">
        <option :value="ALL">ぜんぶ</option>
        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </label>
  </header>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-if="loading && items.length === 0" class="sub">よみこみ中…</p>

  <p v-else-if="!error && items.length === 0" class="empty">
    きろくは まだ ないよ。<br />右下の「きろくする」から、入れてみよう!
  </p>

  <ul v-else class="list">
    <li v-for="r in items" :key="r.id">
      <RecordRow :record="r" :today="today" @select="active = r" />
    </li>
  </ul>

  <div v-if="hasMore" class="more">
    <button type="button" class="secondary" :disabled="loading" @click="load(false)">もっと 見る</button>
  </div>

  <!-- 1 件を押したら、「直す」「消す」を選ぶ -->
  <div v-if="active && !confirmDelete" class="overlay" @click.self="active = null" @keydown.esc="active = null">
    <div class="sheet card" role="dialog" aria-modal="true" aria-label="きろくを どうする?">
      <p class="sheet-title">
        {{ shortDate(active.record_date, today) }}　{{ recordTitle(active) }}　{{ formatYen(active.amount) }}
      </p>
      <div class="sheet-buttons">
        <button type="button" @click="edit">直す</button>
        <button type="button" class="secondary" @click="confirmDelete = true">消す</button>
        <button type="button" class="secondary" @click="active = null">とじる</button>
      </div>
    </div>
  </div>

  <ConfirmDialog
    :open="confirmDelete"
    message="ほんとうに 消す? 消すと、もとに もどせないよ。"
    ok-label="消す"
    @ok="remove"
    @cancel="confirmDelete = false"
  />

  <RecordFab />
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.head h1 {
  margin: 0;
}
select {
  min-height: var(--tap);
  padding: 0.4rem 0.75rem;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  font: inherit;
}

.empty {
  padding: 2rem 0;
  text-align: center;
}

.list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  /* 右下のボタンに、いちばん下の行がかくれないようにする */
  padding: 0 0 4.5rem;
  list-style: none;
}
.more {
  margin-bottom: 4.5rem;
  text-align: center;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  background: rgba(59, 47, 47, 0.45);
}
.sheet {
  width: 100%;
  max-width: 440px;
}
.sheet-title {
  font-weight: 800;
}
.sheet-buttons {
  display: grid;
  gap: 0.5rem;
}
</style>
