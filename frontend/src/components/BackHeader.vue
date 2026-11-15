<script setup lang="ts">
import { useRouter } from 'vue-router'

// 「← もどる」つきの見出し。直接このページを開いたとき(もどる先がないとき)は、fallback へ行く
const props = withDefaults(defineProps<{ title: string; fallback?: string }>(), { fallback: '/' })
const router = useRouter()

function back() {
  if (window.history.state?.back) router.back()
  else void router.push(props.fallback)
}
</script>

<template>
  <header class="back-header">
    <button type="button" class="back secondary" aria-label="もどる" @click="back">←</button>
    <h1>{{ title }}</h1>
  </header>
</template>

<style scoped>
.back-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.back-header h1 {
  margin: 0;
}
.back {
  min-width: var(--tap);
  padding: 0.25rem 0.75rem;
  font-size: 1.3rem;
}
</style>
