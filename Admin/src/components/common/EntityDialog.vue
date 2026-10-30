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
})

const emit = defineEmits(['close', 'save'])
const values = reactive({})

watch(() => [props.open, props.mode, props.record], () => {
  for (const key of Object.keys(values)) delete values[key]
  Object.assign(values, props.record || {})
}, { immediate: true, deep: true })

watch(() => values.trangThai, (nextStatus, previousStatus) => {
  if (props.config.key !== 'readers' || !previousStatus || !nextStatus || nextStatus === previousStatus) return
  const reasonField = props.config.statusReasonFields?.[nextStatus]
  if (reasonField) values[reasonField] = ''
}, { flush: 'sync' })

function optionsFor(field) {
  if (field.optionsFrom === 'publishers') return props.publishers.map((publisher) => ({ label: publisher[field.optionLabel], value: publisher[field.optionValue] }))
  return (field.options || []).map((option) => typeof option === 'object' ? option : { label: option, value: option })
}

function fieldValue(field) {
  const value = props.record?.[field.key]
  if (field.type === 'date' && value) return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')
  if (field.type === 'select' && Array.isArray(field.options)) {
    const option = optionsFor(field).find((item) => item.value === value)
    if (option) return option.label
  }
  if (field.type === 'status') return value
  return value === true ? 'Đang hoạt động' : value === false ? 'Đã khóa' : value || '—'
}

function submit() {
  emit('save', { ...values })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
      <section class="entity-dialog" role="dialog" aria-modal="true" :aria-labelledby="'entity-dialog-title'">
        <header class="entity-dialog__header">
          <div><p class="dialog-kicker">{{ mode === 'detail' ? 'THÔNG TIN CHI TIẾT' : 'HỒ SƠ' }}</p><h2 id="entity-dialog-title">{{ mode === 'create' ? `Thêm ${config.singular}` : mode === 'edit' ? `Chỉnh sửa ${config.singular}` : `Chi tiết ${config.singular}` }}</h2></div>
          <button class="dialog-close" type="button" aria-label="Đóng" @click="emit('close')">×</button>
        </header>

        <form v-if="mode !== 'detail'" class="entity-form" novalidate @submit.prevent="submit">
          <div class="entity-form__grid">
            <div class="form-field form-field--readonly">
              <span>{{ config.columns.find((column) => column.key === config.codeField)?.label || 'Mã thực thể' }}</span>
              <strong>{{ record[config.codeField] || 'Mã sẽ được tạo tự động' }}</strong>
            </div>
            <label v-for="field in config.fields" :key="field.key" class="form-field" :class="{ 'form-field--wide': field.wide }">
              <span>{{ field.label }}<b v-if="field.required" aria-hidden="true"> *</b></span>
              <select v-if="field.type === 'select'" v-model="values[field.key]">
                <option v-for="option in optionsFor(field)" :key="String(option.value)" :value="option.value">{{ option.label }}</option>
              </select>
              <textarea v-else-if="field.type === 'textarea'" v-model="values[field.key]" rows="3" :placeholder="field.placeholder || `Nhập ${field.label.toLocaleLowerCase('vi')}`"></textarea>
              <input v-else v-model="values[field.key]" :type="field.type || 'text'" :min="field.min" :max="field.max" :placeholder="field.placeholder || `Nhập ${field.label.toLocaleLowerCase('vi')}`">
              <small v-if="errors[field.key]" class="field-error">{{ errors[field.key] }}</small>
            </label>
            <label
              v-if="config.statusReasonFields?.[values.trangThai]"
              class="form-field form-field--wide"
              :for="config.statusReasonFields[values.trangThai]"
            >
              <span>{{ values.trangThai === 'Hạn chế' ? 'Lý do hạn chế' : 'Lý do cấm' }}<b aria-hidden="true"> *</b></span>
              <textarea :id="config.statusReasonFields[values.trangThai]" v-model="values[config.statusReasonFields[values.trangThai]]" rows="3" :placeholder="`Nhập ${values.trangThai === 'Hạn chế' ? 'lý do hạn chế' : 'lý do cấm'}`"></textarea>
              <small v-if="errors[config.statusReasonFields[values.trangThai]]" class="field-error">{{ errors[config.statusReasonFields[values.trangThai]] }}</small>
            </label>
          </div>
          <div class="dialog-actions">
            <button class="button button--secondary" type="button" @click="emit('close')">Hủy</button>
            <button class="button button--primary" type="submit">{{ mode === 'create' ? `Thêm ${config.singular}` : 'Lưu thay đổi' }}</button>
          </div>
        </form>

        <div v-else class="entity-detail-grid">
          <div class="entity-detail-item"><span>{{ config.columns.find((column) => column.key === config.codeField)?.label || 'Mã thực thể' }}</span><strong>{{ record[config.codeField] || '—' }}</strong></div>
          <div v-for="field in config.fields" :key="field.key" class="entity-detail-item" :class="{ 'entity-detail-item--wide': field.wide }">
            <span>{{ field.label }}</span>
            <StatusBadge v-if="field.key === 'trangThai' && config.statusVariants" :value="record[field.key]" :variants="config.statusVariants" :boolean-status="config.key === 'accounts'" />
            <strong v-else>{{ fieldValue(field) }}</strong>
          </div>
          <div v-if="config.statusReasonFields?.[record.trangThai]" class="entity-detail-item entity-detail-item--wide">
            <span>{{ record.trangThai === 'Hạn chế' ? 'Lý do hạn chế' : 'Lý do cấm' }}</span>
            <strong>{{ record[config.statusReasonFields[record.trangThai]] || 'Chưa có lý do' }}</strong>
          </div>
          <p class="entity-detail-note">Thay đổi chỉ có hiệu lực trong phiên hiện tại.</p>
          <div class="dialog-actions"><button class="button button--secondary" type="button" @click="emit('close')">Đóng</button></div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
