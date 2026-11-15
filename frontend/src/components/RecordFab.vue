<template>
  <!-- 毎日使う操作なので、いちばん押しやすい、右下に置く(ホームと一覧) -->
  <router-link to="/records/new" class="fab button">✏️ きろくする</router-link>
</template>

<style scoped>
.fab {
  position: fixed;
  /* 画面の幅が 480px より広いときも、中央の画面の右下に合わせる */
  right: max(1rem, calc((100vw - 480px) / 2 + 1rem));
  bottom: calc(var(--tab-height) + 1rem);
  min-height: 52px;
  padding: 0.6rem 1.4rem;
  font-size: 1.1rem;
  box-shadow: 0 4px 0 rgba(59, 47, 47, 0.25);
}
</style>
