<script setup>
import { ref, watch } from 'vue'
import './Dialog.css'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'add' },
  book: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'adjust'])
const quantity = ref('')
const validationError = ref('')

watch(() => [props.open, props.mode, props.book?.maSach], () => {
  quantity.value = ''
  validationError.value = ''
}, { immediate: true })

function submit() {
  if (props.busy) return
  const amount = Number(quantity.value)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    validationError.value = 'Vui lòng nhập số nguyên dương.'
    return
  }
  if (props.mode === 'destroy' && amount > props.book?.soQuyenConLai) {
    validationError.value = 'Số lượng tiêu hủy vượt quá số sách còn khả dụng.'
    return
  }
  validationError.value = ''
  emit('adjust', amount)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && emit('close')" @keydown.esc="!busy && emit('close')">
      <section class="entity-dialog stock-adjustment-dialog" role="dialog" aria-modal="true" aria-labelledby="stock-dialog-title">
        <header class="entity-dialog__header">
          <div>
            <p class="dialog-kicker">QUẢN LÝ TỒN KHO</p>
            <h2 id="stock-dialog-title">{{ mode === 'add' ? 'Bổ sung số lượng' : 'Tiêu hủy số lượng' }}</h2>
          </div>
          <button class="dialog-close" type="button" aria-label="Đóng" :disabled="busy" @click="emit('close')">×</button>
        </header>

        <form class="entity-form" novalidate @submit.prevent="submit">
          <div class="stock-book-summary">
            <strong>{{ book?.tenSach }}</strong>
            <span>Mã sách: {{ book?.maSach }}</span>
            <span>Tổng số lượng: {{ book?.soQuyen }} · Còn khả dụng: {{ book?.soQuyenConLai }}</span>
          </div>
          <label class="form-field" for="stock-adjustment-quantity">
            <span>Số lượng cần {{ mode === 'add' ? 'bổ sung' : 'tiêu hủy' }} <b aria-hidden="true">*</b></span>
            <input
              id="stock-adjustment-quantity"
              v-model="quantity"
              type="number"
              min="1"
              :max="mode === 'destroy' ? book?.soQuyenConLai : undefined"
              step="1"
              inputmode="numeric"
              required
              :disabled="busy"
              :aria-invalid="Boolean(validationError || error)"
              @input="validationError = ''"
            >
          </label>
          <p v-if="validationError || error" class="dialog-error" role="alert">{{ validationError || error }}</p>
          <div class="dialog-actions">
            <button class="button button--secondary" type="button" :disabled="busy" @click="emit('close')">Hủy</button>
            <button class="button" :class="mode === 'destroy' ? 'button--danger' : 'button--primary'" type="submit" :disabled="busy">
              {{ mode === 'add' ? 'Bổ sung sách' : 'Xác nhận tiêu hủy' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
