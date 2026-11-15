<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, api } from '../api/client'
import type { Balance, Category, IncomeKind, MoneyRecord, RecordType } from '../api/types'
import BackHeader from '../components/BackHeader.vue'
import CategorySheet from '../components/CategorySheet.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PiggyIcon from '../components/PiggyIcon.vue'
import { todayJst } from '../format'
import { emptyForm, exceedsWallet, toPayload, validateRecordForm } from '../recordForm'

const route = useRoute()
const router = useRouter()

const today = todayJst()
const editId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => editId.value !== null)

const form = reactive(emptyForm(today))
const categories = ref<Category[]>([])
const balance = ref<Balance | null>(null)
const original = ref<MoneyRecord | null>(null)

const loading = ref(true)
const loadError = ref('')
const error = ref('')
const busy = ref(false)
const confirmOpen = ref(false)
const categorySheetOpen = ref(false)

// 「なにを した?」の 4 つ。色だけでなく、記号と文字でも種類を伝える
const types: { value: RecordType; label: string }[] = [
  { value: 'income', label: 'もらった' },
  { value: 'expense', label: 'つかった' },
  { value: 'deposit', label: '貯金へ入れた' },
  { value: 'withdraw', label: '貯金からだした' },
]
const incomeKinds: { value: IncomeKind; label: string }[] = [
  { value: 'allowance', label: 'おこづかい' },
  { value: 'otoshidama', label: 'お年玉' },
]

onMounted(async () => {
  try {
    const [cats, bal, rec] = await Promise.all([
      api.get<Category[]>('/categories'),
      api.get<Balance>('/balance'),
      editId.value === null ? Promise.resolve(null) : api.get<MoneyRecord>(`/records/${editId.value}`),
    ])
    categories.value = cats
    balance.value = bal
    if (rec) {
      original.value = rec
      form.type = rec.type
      form.date = rec.record_date
      form.amount = String(rec.amount)
      form.incomeKind = rec.income_kind ?? 'allowance'
      form.categoryId = rec.category_id
      form.memo = rec.memo
    }
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
  } finally {
    loading.value = false
  }
})

/** その場で作ったしゅるいを、一覧に足して、えらんだ状態にする(入力した内容は、そのまま) */
function onCategoryCreated(category: Category) {
  categories.value.push(category)
  form.categoryId = category.id
  categorySheetOpen.value = false
}

function submit() {
  error.value = ''
  const problem = validateRecordForm(form, today)
  if (problem) {
    error.value = problem
    return
  }
  // さいふより多いときは、エラーにせず、確認を出す(お金は、借りることもあるため)
  if (balance.value && exceedsWallet(form, balance.value.wallet, original.value ?? undefined)) {
    confirmOpen.value = true
    return
  }
  void save()
}

async function save() {
  confirmOpen.value = false
  busy.value = true
  try {
    if (editId.value === null) {
      await api.post('/records', toPayload(form))
      await router.push({ name: 'home' })
    } else {
      await api.put(`/records/${editId.value}`, toPayload(form))
      await router.push({ name: 'records' })
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'うまく いかなかったよ'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BackHeader :title="isEdit ? 'きろくを 直す' : 'きろくする'" :fallback="isEdit ? '/records' : '/'" />

  <p v-if="loading" class="sub">よみこみ中…</p>
  <p v-else-if="loadError" class="error" role="alert">{{ loadError }}</p>

  <form v-else novalidate @submit.prevent="submit">
    <fieldset class="field group">
      <legend>なにを した?</legend>
      <div class="types">
        <label
          v-for="t in types"
          :key="t.value"
          class="choice"
          :class="[`type-${t.value}`, { selected: form.type === t.value }]"
        >
          <input v-model="form.type" type="radio" name="type" :value="t.value" class="visually-hidden" />
          <span class="mark" aria-hidden="true">
            <template v-if="t.value === 'income'">＋</template>
            <template v-else-if="t.value === 'expense'">−</template>
            <PiggyIcon v-else-if="t.value === 'deposit'" />
            <template v-else>👛</template>
          </span>
          {{ t.label }}
          <span v-if="form.type === t.value" class="check" aria-hidden="true">✓</span>
        </label>
      </div>
    </fieldset>

    <div class="field">
      <label for="date">ひづけ</label>
      <input id="date" v-model="form.date" type="date" :max="today" />
    </div>

    <div class="field">
      <label for="amount">金がく</label>
      <div class="amount-row">
        <input id="amount" v-model="form.amount" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0" />
        <span class="yen">円</span>
      </div>
    </div>

    <!-- もらったのとき -->
    <fieldset v-if="form.type === 'income'" class="field group">
      <legend>しゅるい</legend>
      <div class="chips">
        <label v-for="k in incomeKinds" :key="k.value" class="choice chip" :class="{ selected: form.incomeKind === k.value }">
          <input v-model="form.incomeKind" type="radio" name="income-kind" :value="k.value" class="visually-hidden" />
          {{ k.label }}
          <span v-if="form.incomeKind === k.value" class="check" aria-hidden="true">✓</span>
        </label>
      </div>
    </fieldset>

    <!-- つかったのとき -->
    <fieldset v-if="form.type === 'expense'" class="field group">
      <legend>しゅるい</legend>
      <div class="chips">
        <label
          v-for="c in categories"
          :key="c.id"
          class="choice chip"
          :class="{ selected: form.categoryId === c.id }"
          :style="{ background: `var(--c-${c.color})` }"
        >
          <input v-model="form.categoryId" type="radio" name="category" :value="c.id" class="visually-hidden" />
          {{ c.name }}
          <span v-if="form.categoryId === c.id" class="check" aria-hidden="true">✓</span>
        </label>
        <button type="button" class="choice chip add" @click="categorySheetOpen = true">＋ あたらしく作る</button>
      </div>
    </fieldset>

    <div class="field">
      <label for="memo">メモ</label>
      <input id="memo" v-model="form.memo" maxlength="200" autocomplete="off" />
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <button type="submit" class="submit" :disabled="busy">{{ isEdit ? 'なおす' : 'きろくする' }}</button>
  </form>

  <CategorySheet v-if="categorySheetOpen" @saved="onCategoryCreated" @close="categorySheetOpen = false" />

  <ConfirmDialog
    :open="confirmOpen"
    message="さいふより 多いよ。それでも きろくする?"
    ok-label="きろくする"
    @ok="save"
    @cancel="confirmOpen = false"
  />
</template>

<style scoped>
fieldset {
  min-width: 0;
  margin: 0 0 1rem;
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: 0.25rem;
  padding: 0;
  font-weight: 800;
}

.types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* えらぶボタン。えらんだものは、太いわくと ✓ で伝える(色だけにしない) */
.choice {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 52px;
  margin: 0;
  padding: 0.4rem 0.75rem;
  border: 3px solid transparent;
  border-radius: var(--radius);
  background: #fff;
  color: var(--text);
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}
.chip {
  display: inline-flex;
  min-width: var(--tap);
}
.choice:has(input:focus-visible) {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
.choice.selected {
  border-color: var(--text);
  box-shadow: 0 3px 0 rgba(59, 47, 47, 0.3);
}
.check {
  font-weight: 800;
}
.mark {
  font-size: 1.2rem;
  font-weight: 800;
}

.type-income {
  background: var(--income);
}
.type-expense {
  background: var(--expense);
}
.type-deposit {
  background: var(--savings);
}
.type-withdraw {
  background: var(--wallet);
}
.add {
  border: 3px dashed var(--text-sub);
  background: transparent;
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.yen {
  font-weight: 800;
}

.submit {
  width: 100%;
  min-height: 56px;
  font-size: 1.15rem;
}

/* 画面には出さず、読み上げとキーボードでは使える */
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
