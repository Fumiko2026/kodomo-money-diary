<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError, api } from '../api/client'
import type { Category, ColorKey } from '../api/types'
import { COLOR_OPTIONS } from '../palette'

// しゅるい(項目)を、新しく作る・直す入力の画面。
// 「きろくする」画面の中と、「しゅるい」画面の、両方で使う。category があれば、直す
const props = defineProps<{ category?: Category | null }>()
const emit = defineEmits<{ saved: [category: Category]; close: [] }>()

const name = ref(props.category?.name ?? '')
const color = ref<ColorKey>(props.category?.color ?? 'blue1')
const error = ref('')
const busy = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

onMounted(() => nameInput.value?.focus())

async function submit() {
  error.value = ''
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = '名前を 入れてね'
    return
  }
  busy.value = true
  try {
    const body = { name: trimmed, color: color.value }
    const saved = props.category
      ? await api.patch<Category>(`/categories/${props.category.id}`, body)
      : await api.post<Category>('/categories', body)
    emit('saved', saved)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')" @keydown.esc="emit('close')">
    <form class="sheet card" role="dialog" aria-modal="true" aria-labelledby="category-sheet-title" novalidate @submit.prevent="submit">
      <h2 id="category-sheet-title">{{ category ? 'しゅるいを 直す' : 'あたらしい しゅるい' }}</h2>

      <div class="field">
        <label for="category-name">名前</label>
        <input id="category-name" ref="nameInput" v-model="name" maxlength="10" autocomplete="off" />
      </div>

      <fieldset>
        <legend>色</legend>
        <div class="colors">
          <label
            v-for="c in COLOR_OPTIONS"
            :key="c.key"
            class="swatch"
            :class="{ selected: color === c.key }"
            :style="{ background: `var(--c-${c.key})` }"
          >
            <input v-model="color" type="radio" name="category-color" :value="c.key" class="visually-hidden" />
            {{ c.label }}
            <span v-if="color === c.key" aria-hidden="true">✓</span>
          </label>
        </div>
      </fieldset>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="buttons">
        <button type="button" class="secondary" @click="emit('close')">やめる</button>
        <button type="submit" :disabled="busy">{{ category ? 'なおす' : '作る' }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(59, 47, 47, 0.45);
}
.sheet {
  width: 100%;
  max-width: 440px;
}
fieldset {
  min-width: 0;
  margin: 0 0 1rem;
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: 0.4rem;
  padding: 0;
  font-weight: 800;
}
.colors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}
/* えらんだ色は、太いわくと ✓ で伝える(色だけにしない) */
.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  margin: 0;
  padding: 0.2rem;
  border: 3px solid transparent;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
}
.swatch:has(input:focus-visible) {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
.swatch.selected {
  border-color: var(--text);
  box-shadow: 0 3px 0 rgba(59, 47, 47, 0.3);
}
.buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  opacity: 0;
  clip-path: inset(50%);
}
</style>
