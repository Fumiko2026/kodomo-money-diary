<script setup lang="ts">
import type { Wish } from '../api/types'
import { formatYen } from '../format'
import { progressPercent, wishNote } from '../wishDisplay'

// ほしいものの、名前と進み具合(ホームと「ほしいもの」画面で同じものを使う)。
// 棒の色だけでなく、数字と文字でも進み具合を伝える
defineProps<{ wish: Wish }>()
</script>

<template>
  <div class="wish">
    <div class="wish-name">{{ wish.name }}</div>
    <div
      class="bar"
      role="progressbar"
      :aria-label="`${wish.name}の 進み具合`"
      aria-valuemin="0"
      :aria-valuemax="wish.target_amount"
      :aria-valuenow="Math.min(wish.saved, wish.target_amount)"
    >
      <div
        class="fill"
        :class="{ empty: progressPercent(wish.saved, wish.target_amount) === 0 }"
        :style="{ width: `${progressPercent(wish.saved, wish.target_amount)}%` }"
      ></div>
    </div>
    <div class="wish-detail">
      <span>{{ wish.saved.toLocaleString('ja-JP') }} / {{ formatYen(wish.target_amount) }}</span>
      <span v-if="wishNote(wish)">{{ wishNote(wish) }}</span>
    </div>
  </div>
</template>

<style scoped>
.wish {
  margin-bottom: 0.9rem;
}
.wish-name {
  font-weight: 800;
}
.bar {
  height: 18px;
  margin: 0.3rem 0;
  overflow: hidden;
  border: 2px solid var(--text);
  border-radius: 999px;
  background: #fff;
}
.fill {
  height: 100%;
  background: var(--savings);
  border-right: 2px solid var(--text);
}
.fill.empty {
  border-right: 0;
}
.wish-detail {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  font-size: 0.95rem;
}
</style>
