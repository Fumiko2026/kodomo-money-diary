<script setup lang="ts">
import { useRoute } from 'vue-router'

// 下のタブ 5 つ(docs/screens.md 第 2 節)。絵と文字の両方を出す
const tabs = [
  { to: '/', icon: '🏠', label: 'ホーム' },
  { to: '/records', icon: '📒', label: 'きろく' },
  { to: '/summary', icon: '📊', label: 'まとめ' },
  { to: '/wishes', icon: '⭐', label: 'ほしい' },
  // 「もっと」の中の、しゅるい・せってい のときも、もっと を強調する
  { to: '/more', icon: '⋯', label: 'もっと', also: ['/categories', '/settings'] },
]

const route = useRoute()

function isActive(tab: { to: string; also?: string[] }): boolean {
  if (tab.to === '/') return route.path === '/'
  return [tab.to, ...(tab.also ?? [])].some((p) => route.path.startsWith(p))
}
</script>

<template>
  <nav class="tabs" aria-label="メニュー">
    <router-link
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="tab"
      :class="{ active: isActive(tab) }"
      :aria-current="isActive(tab) ? 'page' : undefined"
    >
      <span class="icon" aria-hidden="true">{{ tab.icon }}</span>
      <span class="label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.tabs {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  max-width: 480px;
  height: var(--tab-height);
  margin: 0 auto;
  background: #fff;
  border-top: 2px solid var(--line);
}
.tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: var(--tap);
  color: var(--text);
  font-size: 0.7rem; /* 小さい画面でも 5 つ並ぶ大きさ */
  font-weight: 800;
  text-decoration: none;
  line-height: 1.2;
}
.icon {
  font-size: 1.3rem;
}
/* 色だけでなく、下の線と太さでも、いまの画面を伝える */
.tab.active {
  background: var(--wallet);
  box-shadow: inset 0 -4px 0 var(--accent);
}
</style>
