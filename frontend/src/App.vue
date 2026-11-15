<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import { auth } from './auth'

const route = useRoute()
const showTabs = computed(() => !!auth.me && !route.meta.hideTabs)
</script>

<template>
  <main class="page" :class="{ 'with-tabs': showTabs }">
    <router-view />
  </main>
  <TabBar v-if="showTabs" />
</template>

<style scoped>
.page {
  padding: 1rem;
}
/* 下のタブに、内容がかくれないようにする */
.with-tabs {
  padding-bottom: calc(var(--tab-height) + 1.5rem);
}
</style>
