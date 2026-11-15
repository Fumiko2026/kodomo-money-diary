<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, api } from '../api/client'
import type { Me } from '../api/types'
import { auth, logout } from '../auth'
import BackHeader from '../components/BackHeader.vue'
import PiggyIcon from '../components/PiggyIcon.vue'
import { parseYen } from '../format'
import { MAX_YEN } from '../recordForm'

const router = useRouter()

const wallet = ref(String(auth.me?.initial_wallet ?? 0))
const savings = ref(String(auth.me?.initial_savings ?? 0))
const error = ref('')
const done = ref(false)
const busy = ref(false)

/** 空は 0 円。数字でないときや、大きすぎるときは、文字で伝える */
function money(input: string, label: string): number | null {
  const n = parseYen(input)
  if (n === null) return 0
  if (Number.isNaN(n) || n > MAX_YEN) {
    error.value = `${label}は、0 から 99,999,999 の 数字で 入れてね`
    return null
  }
  return n
}

async function save() {
  error.value = ''
  done.value = false
  const w = money(wallet.value, 'はじめの さいふ')
  const s = money(savings.value, 'はじめの 貯金')
  if (w === null || s === null) return

  busy.value = true
  try {
    auth.me = await api.patch<Me>('/me', { initial_wallet: w, initial_savings: s })
    done.value = true
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
  } finally {
    busy.value = false
  }
}

async function onLogout() {
  await logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <BackHeader title="せってい" fallback="/more" />

  <p class="nickname">ニックネーム: <strong>{{ auth.me?.nickname }}</strong></p>

  <form novalidate @submit.prevent="save">
    <h2>はじめの お金</h2>
    <p class="sub">つかい始めた ときの 金がくだよ。直すと、いまの さいふと 貯金も、同じ だけ かわるよ。</p>

    <div class="field">
      <label for="wallet"><span aria-hidden="true">👛</span> はじめの さいふ</label>
      <div class="yen-row">
        <input id="wallet" v-model="wallet" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <span class="yen">円</span>
      </div>
    </div>
    <div class="field">
      <label for="savings"><PiggyIcon /> はじめの 貯金</label>
      <div class="yen-row">
        <input id="savings" v-model="savings" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
        <span class="yen">円</span>
      </div>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="done" class="done" role="status">✓ なおしたよ</p>

    <button type="submit" :disabled="busy">なおす</button>
  </form>

  <hr />

  <button type="button" class="secondary" @click="onLogout">ログアウト</button>
</template>

<style scoped>
.nickname {
  margin-bottom: 1.5rem;
}
.yen-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.yen {
  font-weight: 800;
}
.done {
  font-weight: 800;
}
hr {
  margin: 2rem 0 1.25rem;
  border: 0;
  border-top: 2px solid var(--line);
}
</style>
