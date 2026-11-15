<script setup lang="ts">
// 貯金箱の絵。「貯金」を表す絵は、すべての画面でこれにそろえる(docs/screens.md 第 3 節)。
// coin を付けると、入れ口の上でコインがふわふわする(表紙で使う)。
withDefaults(defineProps<{ size?: string; coin?: boolean }>(), {
  size: '1.45em',
  coin: false,
})
</script>

<template>
  <span class="piggy" :style="{ '--piggy-size': size }" aria-hidden="true">
    <svg :viewBox="coin ? '0 0 160 124' : '0 14 160 108'" focusable="false">
      <!-- コイン(入れ口の上で、ゆっくり上下する) -->
      <g v-if="coin" class="coin">
        <circle cx="79" cy="15" r="12" fill="#ffd34d" stroke="#3b2f2f" stroke-width="3" />
        <circle cx="79" cy="15" r="7.5" fill="none" stroke="#e0a800" stroke-width="2" />
        <text x="79" y="19.5" text-anchor="middle" font-size="11" font-weight="800" fill="#3b2f2f">円</text>
      </g>

      <!-- しっぽ -->
      <path d="M26 70 C10 70 8 52 20 54 C28 55 24 64 17 62" fill="none" stroke="#3b2f2f" stroke-width="3.5" stroke-linecap="round" />
      <!-- あし -->
      <rect x="44" y="94" width="20" height="22" rx="8" fill="#ee8fb2" stroke="#3b2f2f" stroke-width="3" />
      <rect x="98" y="94" width="20" height="22" rx="8" fill="#ee8fb2" stroke="#3b2f2f" stroke-width="3" />
      <!-- みみ -->
      <path d="M100 38 L108 18 L126 40 Z" fill="#ee8fb2" stroke="#3b2f2f" stroke-width="3" stroke-linejoin="round" />
      <!-- からだ -->
      <ellipse cx="80" cy="70" rx="58" ry="40" fill="#f7a8c4" stroke="#3b2f2f" stroke-width="3" />
      <!-- つや -->
      <path d="M38 58 C42 46 54 40 66 40" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.8" />
      <!-- コインの入れ口 -->
      <rect x="62" y="30" width="36" height="9" rx="4.5" fill="#3b2f2f" />
      <!-- はな -->
      <ellipse cx="138" cy="74" rx="15" ry="12" fill="#ee8fb2" stroke="#3b2f2f" stroke-width="3" />
      <circle cx="133" cy="74" r="2.5" fill="#3b2f2f" />
      <circle cx="143" cy="74" r="2.5" fill="#3b2f2f" />
      <!-- め・ほっぺ -->
      <circle cx="116" cy="58" r="4.5" fill="#3b2f2f" />
      <circle cx="114" cy="78" r="7" fill="#f8d0cc" opacity="0.9" />
    </svg>
  </span>
</template>

<style scoped>
.piggy {
  display: inline-block;
  width: var(--piggy-size);
  vertical-align: -0.3em;
  line-height: 0;
}
svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.coin {
  animation: coin-bob 3s ease-in-out infinite;
}
@keyframes coin-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}
</style>
