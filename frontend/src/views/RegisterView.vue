<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '../api/client'
import { register } from '../auth'
import AppHero from '../components/AppHero.vue'
import PiggyIcon from '../components/PiggyIcon.vue'
import { parseYen } from '../format'

const MAX_YEN = 99_999_999

const router = useRouter()
const nickname = ref('')
const password = ref('')
const password2 = ref('')
const wallet = ref('')
const savings = ref('')
const error = ref('')
const busy = ref(false)

/** 金額の欄。空は 0 円。数字でないときや、大きすぎるときは、文字で伝える */
function money(input: string, label: string): number | null {
  const n = parseYen(input)
  if (n === null) return 0
  if (Number.isNaN(n) || n > MAX_YEN) {
    error.value = `${label}は、0 から 99,999,999 の 数字で 入れてね`
    return null
  }
  return n
}

async function submit() {
  error.value = ''
  if (!nickname.value.trim()) {
    error.value = 'ニックネームを 入れてね'
    return
  }
  if (password.value.length < 4) {
    error.value = 'パスワードは 4 文字 いじょうで 入れてね'
    return
  }
  if (password.value !== password2.value) {
    error.value = 'パスワードが 2 回とも おなじに なるように 入れてね'
    return
  }
  const w = money(wallet.value, 'さいふ')
  const s = money(savings.value, '貯金')
  if (w === null || s === null) return

  busy.value = true
  try {
    await register({
      nickname: nickname.value.trim(),
      password: password.value,
      initial_wallet: w,
      initial_savings: s,
    })
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
  <h2>とうろく</h2>

  <form novalidate @submit.prevent="submit">
    <div class="field">
      <label for="nickname">ニックネーム</label>
      <input id="nickname" v-model="nickname" autocomplete="username" maxlength="20" />
      <p class="sub">本名は 入れないでね</p>
    </div>
    <div class="field">
      <label for="password">パスワード</label>
      <input id="password" v-model="password" type="password" autocomplete="new-password" />
    </div>
    <div class="field">
      <label for="password2">パスワード(もういちど)</label>
      <input id="password2" v-model="password2" type="password" autocomplete="new-password" />
      <p class="sub">わすれても もとに もどせないよ。おぼえておいてね</p>
    </div>
    <div class="field">
      <label for="wallet"><span aria-hidden="true">👛</span> さいふ</label>
      <input id="wallet" v-model="wallet" inputmode="numeric" pattern="[0-9]*" placeholder="0" />
      <p class="sub">いま、さいふに 入っているお金(円)</p>
    </div>
    <div class="field">
      <label for="savings"><PiggyIcon /> 貯金</label>
      <input id="savings" v-model="savings" inputmode="numeric" pattern="[0-9]*" placeholder="0" />
      <p class="sub">いま、貯金箱に 入れているお金(円)</p>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <button type="submit" :disabled="busy">とうろくする</button>
  </form>

  <p class="switch">
    もう とうろくした人は <router-link to="/login">ログイン</router-link>
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
