<script setup>
import { reactive, watch } from 'vue'
import StatusBadge from './StatusBadge.vue'
import './Dialog.css'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'detail' },
  config: { type: Object, required: true },
  record: { type: Object, default: () => ({}) },
  errors: { type: Object, default: () => ({}) },
  publishers: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save'])
const values = reactive({})

watch(() => [props.open, props.mode, props.record], () => {
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, props.record || {})
}, { immediate: true, deep: true })

function optionsFor(field) {
  if (field.optionsFrom === 'publishers') return props.publishers.map((publisher) => ({ label: publisher[field.optionLabel], value: publisher[field.optionValue] }))
  return (field.options || []).map((option) => typeof option === 'object' ? option : { label: option, value: option })
}

function fieldValue(field) {
  const value = props.record?.[field.key]
  if (field.type === 'date' && value) return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')
  if (field.type === 'select' && field.optionsFrom === 'publishers') {
    return optionsFor(field).find((item) => item.value === value)?.label || value || '—'
  }
  if (field.type === 'select' && Array.isArray(field.options)) {
    const option = optionsFor(field).find((item) => item.value === value)
    if (option) return option.label
  }
  if (field.type === 'status') return value
  return value === true ? 'Đang hoạt động' : value === false ? 'Đã khóa' : value || '—'
}

function submit() {
  if (!props.busy) emit('save', { ...values })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && emit('close')" @keydown.esc="!busy && emit('close')">
      <section class="entity-dialog" role="dialog" aria-modal="true" :aria-labelledby="'entity-dialog-title'">
        <header class="entity-dialog__header">
          <div><p class="dialog-kicker">{{ mode === 'detail' ? 'THÔNG TIN CHI TIẾT' : 'HỒ SƠ' }}</p><h2 id="entity-dialog-title">{{ mode === 'create' ? `Thêm ${config.singular}` : mode === 'edit' ? `Chỉnh sửa ${config.singular}` : `Chi tiết ${config.singular}` }}</h2></div>
          <button class="dialog-close" type="button" aria-label="Đóng" :disabled="busy" @click="emit('close')">×</button>
        </header>

        <form v-if="mode !== 'detail'" class="entity-form" novalidate @submit.prevent="submit">
          <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
          <div class="entity-form__grid">
            <div class="form-field form-field--readonly">
              <span>{{ config.columns.find((column) => column.key === config.codeField)?.label || 'Mã thực thể' }}</span>
              <strong>{{ record[config.codeField] || 'Mã sẽ được tạo tự động' }}</strong>
            </div>
            <label v-for="field in (mode === 'edit' ? config.fields.filter((item) => !item.createOnly) : mode === 'create' && config.createFieldsOnly ? config.fields.filter((item) => item.createOnly) : config.fields)" :key="field.key" class="form-field" :class="{ 'form-field--wide': field.wide }">
              <span>{{ field.label }}<b v-if="field.required" aria-hidden="true"> *</b></span>
              <select v-if="field.type === 'select'" v-model="values[field.key]" :disabled="busy">
                <option v-if="field.optionsFrom === 'publishers' && !publishers.length" value="" disabled>Chưa có nhà xuất bản</option>
                <option v-for="option in optionsFor(field)" :key="String(option.value)" :value="option.value">{{ option.label }}</option>
              </select>
              <textarea v-else-if="field.type === 'textarea'" v-model="values[field.key]" :disabled="busy" rows="3" :placeholder="field.placeholder || `Nhập ${field.label.toLocaleLowerCase('vi')}`"></textarea>
              <input v-else v-model="values[field.key]" :disabled="busy" :type="field.type || 'text'" :min="field.min" :max="field.max" :placeholder="field.placeholder || `Nhập ${field.label.toLocaleLowerCase('vi')}`">
              <small v-if="errors[field.key]" class="field-error">{{ errors[field.key] }}</small>
            </label>
          </div>
          <div class="dialog-actions">
            <button class="button button--secondary" type="button" :disabled="busy" @click="emit('close')">Hủy</button>
            <button class="button button--primary" type="submit" :disabled="busy">{{ mode === 'create' ? `Thêm ${config.singular}` : 'Lưu thay đổi' }}</button>
          </div>
        </form>

        <div v-else class="entity-detail-grid">
          <div class="entity-detail-item"><span>{{ config.columns.find((column) => column.key === config.codeField)?.label || 'Mã thực thể' }}</span><strong>{{ record[config.codeField] || '—' }}</strong></div>
          <div v-for="field in config.fields.filter((item) => item.showInDetail !== false)" :key="field.key" class="entity-detail-item" :class="{ 'entity-detail-item--wide': field.wide }">
            <span>{{ field.label }}</span>
            <StatusBadge v-if="field.key === 'trangThai' && config.statusVariants" :value="record[field.key]" :variants="config.statusVariants" :boolean-status="config.key === 'accounts'" />
            <strong v-else>{{ fieldValue(field) }}</strong>
          </div>
          <div class="dialog-actions"><button class="button button--secondary" type="button" @click="emit('close')">Đóng</button></div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
