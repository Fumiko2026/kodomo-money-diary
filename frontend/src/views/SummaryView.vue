<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, api } from '../api/client'
import type { Summary } from '../api/types'
import PiggyIcon from '../components/PiggyIcon.vue'
import { formatYen, signedYen, todayJst } from '../format'
import { monthLabel, shiftMonth } from '../recordDisplay'

const route = useRoute()
const router = useRouter()
const thisMonth = todayJst().slice(0, 7)

// 見る月は、アドレスに入れておく。毎月 1 日から月末まで
const month = computed(() => {
  const m = route.query.month
  return typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= thisMonth ? m : thisMonth
})
const isCurrent = computed(() => month.value === thisMonth)

const summary = ref<Summary | null>(null)
const loading = ref(true)
const error = ref('')
let seq = 0 // 月を切りかえたあとに、前の月の答えが来ても、使わない

watch(
  month,
  async (value) => {
    const mine = ++seq
    loading.value = true
    error.value = ''
    try {
      const result = await api.get<Summary>(`/summary?month=${value}`)
      if (mine === seq) summary.value = result
    } catch (e) {
      if (mine !== seq) return
      summary.value = null
      error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
    } finally {
      if (mine === seq) loading.value = false
    }
  },
  { immediate: true },
)

function go(delta: number) {
  void router.replace({ query: { month: shiftMonth(month.value, delta) } })
}

// 項目ごとの棒。いちばん多い項目を、いちばん長くする(少ない項目も見えるように、少しだけ下げ止めをつける)
const categories = computed(() => {
  const list = summary.value?.expense.by_category ?? []
  const max = Math.max(...list.map((c) => c.amount), 1)
  return list.map((c) => ({ ...c, width: Math.max(4, Math.round((c.amount / max) * 100)) }))
})
</script>

<template>
  <h1>月の まとめ</h1>

  <!-- 月を、前後に切りかえる -->
  <div class="months">
    <button type="button" class="secondary" aria-label="前の月" @click="go(-1)">◀</button>
    <h2 class="current" aria-live="polite">{{ monthLabel(month) }}</h2>
    <button type="button" class="secondary" aria-label="つぎの月" :disabled="isCurrent" @click="go(1)">▶</button>
  </div>

  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p v-else-if="loading && !summary" class="sub">よみこみ中…</p>

  <template v-else-if="summary">
    <section class="card block income" aria-label="もらった">
      <p class="big"><span class="mark" aria-hidden="true">＋</span> もらった <strong>{{ formatYen(summary.income.total) }}</strong></p>
      <p class="detail">おこづかい {{ formatYen(summary.income.allowance) }} / お年玉 {{ formatYen(summary.income.otoshidama) }}</p>
    </section>

    <section class="card block expense" aria-label="つかった">
      <p class="big"><span class="mark" aria-hidden="true">−</span> つかった <strong>{{ formatYen(summary.expense.total) }}</strong></p>
    </section>

    <section class="card block savings" aria-label="貯金">
      <p class="big"><PiggyIcon /> 貯金へ入れた <strong>{{ formatYen(summary.deposit) }}</strong></p>
      <p v-if="summary.withdraw > 0" class="detail">貯金からだした {{ formatYen(summary.withdraw) }}</p>
    </section>

    <p class="diff">
      この月の さ(もらった − つかった)
      <strong>{{ signedYen(summary.diff) }}</strong>
    </p>

    <section aria-labelledby="by-category">
      <h2 id="by-category">つかった しゅるい別</h2>
      <p v-if="!categories.length" class="sub">この月は、つかって いないよ。</p>
      <ul v-else class="bars">
        <li v-for="c in categories" :key="c.category_id">
          <span class="cat-name">{{ c.name }}</span>
          <span class="track">
            <span class="bar" :style="{ width: `${c.width}%`, background: `var(--c-${c.color})` }"></span>
          </span>
          <span class="cat-amount">{{ formatYen(c.amount) }}</span>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.months {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.months button {
  min-width: 52px;
  min-height: 52px;
}
.current {
  margin: 0;
  font-size: 1.3rem;
}

.block {
  margin-bottom: 0.75rem;
  border-color: transparent;
}
.income {
  background: var(--income);
}
.expense {
  background: var(--expense);
}
.savings {
  background: var(--savings);
}
.big {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}
.big strong {
  margin-left: auto;
  font-size: 1.3rem;
}
.detail {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
}
.mark {
  font-weight: 800;
}
.diff {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  margin: 0.5rem 0 1.5rem;
  padding: 0 0.25rem;
  font-weight: 800;
}

.bars {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.bars li {
  display: grid;
  grid-template-columns: 5.5rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
}
.cat-name {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.track {
  display: block;
  height: 24px;
  border-radius: 999px;
  background: rgba(59, 47, 47, 0.08);
}
/* 項目の色に、濃い枠をつけて、うすい色でも、長さが見えるようにする */
.bar {
  display: block;
  height: 100%;
  border: 2px solid var(--text);
  border-radius: 999px;
}
.cat-amount {
  font-weight: 800;
  white-space: nowrap;
}
</style>
