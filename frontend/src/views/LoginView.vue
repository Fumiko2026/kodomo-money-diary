<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '../api/client'
import { login } from '../auth'
import AppHero from '../components/AppHero.vue'

const router = useRouter()
const nickname = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (!nickname.value.trim() || !password.value) {
    error.value = 'ニックネームと パスワードを 入れてね'
    return
  }
  busy.value = true
  try {
    await login(nickname.value.trim(), password.value)
    await router.push({ name: 'home' })
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AppHero />
  <h2>ログイン</h2>

  <form novalidate @submit.prevent="submit">
    <div class="field">
      <label for="nickname">ニックネーム</label>
      <input id="nickname" v-model="nickname" autocomplete="username" maxlength="20" />
    </div>
    <div class="field">
      <label for="password">パスワード</label>
      <input id="password" v-model="password" type="password" autocomplete="current-password" />
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <button type="submit" :disabled="busy">ログインする</button>
  </form>

  <p class="switch">
    はじめての人は <router-link to="/register">とうろくする</router-link>
  </p>
</template>

<style scoped>
.switch {
  margin-top: 1.5rem;
}
a {
  color: var(--accent);
}
</style>
