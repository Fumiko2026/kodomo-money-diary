<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

// 「ほんとうに 消す?」「それでも きろくする?」のような、確認を出す部品。
// まちがえて押しても大丈夫なように、さいしょに「やめる」のボタンへ、カーソルを置く。
const props = defineProps<{ open: boolean; message: string; okLabel: string; cancelLabel?: string }>()
const emit = defineEmits<{ ok: []; cancel: [] }>()

const cancelButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    cancelButton.value?.focus()
  },
)
</script>

<template>
  <div v-if="open" class="overlay" @keydown.esc="emit('cancel')">
    <div class="dialog card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-message">
      <p id="confirm-message" class="message">{{ message }}</p>
      <div class="buttons">
        <button ref="cancelButton" type="button" class="secondary" @click="emit('cancel')">
          {{ cancelLabel ?? 'やめる' }}
        </button>
        <button type="button" @click="emit('ok')">{{ okLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(59, 47, 47, 0.45);
}
.dialog {
  width: 100%;
  max-width: 420px;
}
.message {
  font-size: 1.1rem;
  font-weight: 800;
}
.buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
