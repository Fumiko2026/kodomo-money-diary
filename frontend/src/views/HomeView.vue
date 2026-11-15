<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, api } from '../api/client'
import type { Balance, MoneyRecord, Summary, Wish } from '../api/types'
import { auth } from '../auth'
import AppHero from '../components/AppHero.vue'
import PiggyIcon from '../components/PiggyIcon.vue'
import RecordFab from '../components/RecordFab.vue'
import RecordRow from '../components/RecordRow.vue'
import WishProgress from '../components/WishProgress.vue'
import { formatYen, todayJst } from '../format'

const today = todayJst()
const month = today.slice(0, 7)
const monthNumber = Number(month.slice(5))

const balance = ref<Balance | null>(null)
const summary = ref<Summary | null>(null)
const wishes = ref<Wish[] | null>(null)
const recent = ref<MoneyRecord[] | null>(null)
const error = ref('')

const loading = computed(() => !balance.value && !error.value)

// 1 つが失敗しても、ほかは出す
async function load<T>(path: string, target: { value: T | null }) {
  try {
    target.value = await api.get<T>(path)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
  }
}

onMounted(() =>
  Promise.all([
    load('/balance', balance),
    load(`/summary?month=${month}`, summary),
    load('/wishes', wishes),
    load('/records?limit=3', recent),
  ]),
)
</script>

<template>
  <!-- 表紙と同じ見出し -->
  <AppHero />
  <p class="who">{{ auth.me?.nickname }}さん</p>

  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <!-- さいふと貯金は、同じ大きさのカードで並べる -->
  <section class="balances" aria-label="いまのお金">
    <div class="balance wallet">
      <div class="name"><span aria-hidden="true">👛</span> さいふ</div>
      <div class="amount">{{ balance ? formatYen(balance.wallet) : '…' }}</div>
    </div>
    <div class="balance savings">
      <div class="name"><PiggyIcon /> 貯金</div>
      <div class="amount">{{ balance ? formatYen(balance.savings) : '…' }}</div>
    </div>
  </section>

  <p v-if="loading" class="sub">よみこみ中…</p>

  <!-- 今月のまとめ -->
  <section v-if="summary" class="section card" aria-labelledby="summary-title">
    <div class="section-head">
      <h2 id="summary-title">{{ monthNumber }}月のまとめ</h2>
      <router-link to="/summary" class="more-link">くわしく →</router-link>
    </div>
    <p class="line income">
      <span class="mark" aria-hidden="true">＋</span> もらった
      <strong>{{ formatYen(summary.income.total) }}</strong>
    </p>
    <p class="line expense">
      <span class="mark" aria-hidden="true">−</span> つかった
      <strong>{{ formatYen(summary.expense.total) }}</strong>
    </p>
  </section>

  <!-- ほしいもの -->
  <section v-if="wishes" class="section card" aria-labelledby="wish-title">
    <div class="section-head">
      <h2 id="wish-title">ほしいもの</h2>
      <router-link v-if="wishes.length" to="/wishes" class="more-link">くわしく →</router-link>
    </div>

    <template v-if="wishes.length">
      <WishProgress v-for="w in wishes" :key="w.id" :wish="w" />
    </template>
    <router-link v-else to="/wishes" class="button secondary">⭐ ほしいものを 入れてみよう</router-link>
  </section>

  <!-- さいきんの きろく -->
  <section v-if="recent" class="section card" aria-labelledby="recent-title">
    <div class="section-head">
      <h2 id="recent-title">さいきんの きろく</h2>
      <router-link v-if="recent.length" to="/records" class="more-link">ぜんぶ →</router-link>
    </div>
    <p v-if="!recent.length" class="sub">まだ ないよ。右下の「きろくする」から、入れてみよう!</p>
    <ul v-else class="recent">
      <li v-for="r in recent" :key="r.id"><RecordRow :record="r" :today="today" static /></li>
    </ul>
  </section>

  <RecordFab />
</template>

<style scoped>
.who {
  margin: -0.5rem 0.25rem 0;
  font-weight: 800;
  text-align: right;
}
.balances {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin: 0.75rem 0 1.25rem;
}
.balance {
  padding: 1rem;
  border-radius: var(--radius);
}
.wallet {
  background: var(--wallet);
}
.savings {
  background: var(--savings);
}
.name {
  font-weight: 800;
}
.amount {
  font-size: 1.4rem;
  font-weight: 800;
}

.section {
  margin-bottom: 1rem;
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
.section-head h2 {
  margin: 0 0 0.5rem;
}
.more-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap);
  color: var(--accent);
  font-weight: 800;
}

.line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 12px;
}
.line strong {
  margin-left: auto;
}
.line.income {
  background: var(--income);
}
.line.expense {
  background: var(--expense);
}
.mark {
  font-weight: 800;
}

.recent {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
/* 右下のボタンに、いちばん下がかくれないようにする */
.section:last-of-type {
  margin-bottom: 4.5rem;
}
</style>
