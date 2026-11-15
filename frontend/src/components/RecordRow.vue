<script setup lang="ts">
import type { MoneyRecord } from '../api/types'
import { formatYen } from '../format'
import { TYPE_NAME, recordTitle, shortDate } from '../recordDisplay'
import PiggyIcon from './PiggyIcon.vue'

// 記録の 1 行(一覧とホームで同じものを使う)。
// 種類は、色だけでなく、記号と文字でも伝える。static のときは、押せない行にする
defineProps<{ record: MoneyRecord; today: string; static?: boolean }>()
defineEmits<{ select: [] }>()
</script>

<template>
  <component
    :is="static ? 'div' : 'button'"
    :type="static ? undefined : 'button'"
    class="row"
    :class="[`type-${record.type}`, { fixed: static }]"
    @click="!static && $emit('select')"
  >
    <span class="date">{{ shortDate(record.record_date, today) }}</span>
    <span class="mark" aria-hidden="true">
      <template v-if="record.type === 'income'">＋</template>
      <template v-else-if="record.type === 'expense'">−</template>
      <PiggyIcon v-else-if="record.type === 'deposit'" />
      <template v-else>👛</template>
    </span>
    <span class="body">
      <span class="sr-only">{{ TYPE_NAME[record.type] }}、</span>
      <span class="title">{{ recordTitle(record) }}</span>
      <span v-if="record.memo" class="memo">{{ record.memo }}</span>
    </span>
    <span class="amount">{{ formatYen(record.amount) }}</span>
  </component>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 4.2rem 1.6rem 1fr auto;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 56px;
  padding: 0.4rem 0.75rem;
  border: 2px solid transparent;
  border-radius: var(--radius);
  background: #fff;
  color: var(--text);
  font: inherit;
  font-weight: 600;
  text-align: left;
}
button.row {
  cursor: pointer;
}
button.row:hover {
  border-color: var(--text);
}
.type-income {
  background: var(--income);
}
.type-expense {
  background: var(--expense);
}
.type-deposit {
  background: var(--savings);
}
.type-withdraw {
  background: var(--wallet);
}

.date {
  font-size: 0.9rem;
}
.mark {
  font-size: 1.2rem;
  font-weight: 800;
  text-align: center;
}
.body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.title {
  font-weight: 800;
}
.memo {
  overflow: hidden;
  font-size: 0.85rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.amount {
  font-weight: 800;
  white-space: nowrap;
}
</style>
