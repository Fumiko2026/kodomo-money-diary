<script setup lang="ts">
import PiggyIcon from './PiggyIcon.vue'

// 表紙。「こどもマネー日記」を、1 文字ずつ色のついたカードにして、大きく出す。
// 色は、項目の 8 色(style.css)から使う。文字は濃い茶色なので、読みやすさは変わらない
const TITLE = 'こどもマネー日記'
const colors = ['red1', 'yellow1', 'green1', 'blue1', 'orange1', 'purple1', 'pink1', 'green1']

const letters = [...TITLE].map((char, i) => ({
  char,
  color: `var(--c-${colors[i % colors.length]})`,
  // 少しだけ、かたむける(動きではなく、形のたのしさ)
  tilt: i % 2 === 0 ? '-3deg' : '3deg',
}))
</script>

<template>
  <header class="hero">
    <span class="deco coin1" aria-hidden="true">🪙</span>
    <span class="deco coin2" aria-hidden="true">🪙</span>
    <span class="deco star1" aria-hidden="true">⭐</span>
    <span class="deco star2" aria-hidden="true">✨</span>

    <PiggyIcon class="hero-piggy" size="clamp(130px, 40vw, 170px)" coin />

    <!-- 画面を読み上げるときは、1 文字ずつではなく、名前をそのまま読む -->
    <h1 class="title" aria-label="こどもマネー日記">
      <span
        v-for="(l, i) in letters"
        :key="i"
        class="letter"
        aria-hidden="true"
        :style="{ background: l.color, '--tilt': l.tilt }"
        >{{ l.char }}</span
      >
    </h1>

    <p class="catch">おこづかいを きろくして、<br />ほしいものを ためよう!</p>
  </header>
</template>

<style scoped>
.hero {
  position: relative;
  margin: 0 0 1.5rem;
  padding: 1.5rem 0.75rem 1.25rem;
  overflow: hidden;
  border: 3px solid #fff;
  border-radius: 28px;
  background:
    radial-gradient(circle at 12% 18%, #fff 0 6px, transparent 7px),
    radial-gradient(circle at 88% 30%, #fff 0 5px, transparent 6px),
    radial-gradient(circle at 20% 85%, #fff 0 4px, transparent 5px),
    linear-gradient(160deg, var(--wallet) 0%, var(--income) 100%);
  box-shadow: 0 6px 0 rgba(59, 47, 47, 0.15);
  text-align: center;
}

.hero-piggy {
  filter: drop-shadow(0 4px 0 rgba(59, 47, 47, 0.15));
}

.title {
  display: flex;
  justify-content: center;
  gap: clamp(2px, 1vw, 6px);
  margin: 0.75rem 0 0.75rem;
}

.letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 画面の幅に合わせて、大きさを変える(小さい画面でも 8 文字が 1 行に入る) */
  width: clamp(34px, 10vw, 48px);
  height: clamp(42px, 12.5vw, 58px);
  border: 3px solid #fff;
  border-radius: 14px;
  box-shadow: 0 4px 0 rgba(59, 47, 47, 0.2);
  color: var(--text);
  font-size: clamp(1.4rem, 6.5vw, 2rem);
  font-weight: 800;
  line-height: 1;
  transform: rotate(var(--tilt));
}

.catch {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

/* かざり。ゆっくり、ふわふわさせる(「動きを減らす」設定のときは、style.css で止まる) */
.deco {
  position: absolute;
  font-size: 1.6rem;
  line-height: 1;
  animation: float 4s ease-in-out infinite;
}
.coin1 {
  top: 14%;
  left: 8%;
}
.coin2 {
  top: 52%;
  right: 7%;
  animation-delay: -1.5s;
}
.star1 {
  top: 12%;
  right: 12%;
  animation-delay: -3s;
}
.star2 {
  bottom: 14%;
  left: 9%;
  animation-delay: -2s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
