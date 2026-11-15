<script setup lang="ts">
import { useRouter } from 'vue-router'
import { logout } from '../auth'

const router = useRouter()

async function onLogout() {
  await logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <h1>もっと</h1>
  <nav class="menu">
    <router-link to="/categories" class="button secondary">🏷️ しゅるい</router-link>
    <router-link to="/settings" class="button secondary">⚙️ せってい</router-link>
    <button type="button" class="secondary" @click="onLogout">ログアウト</button>
  </nav>
</template>

<style scoped>
.menu {
  display: grid;
  gap: 0.75rem;
}
</style>
