<script setup>
import { computed, ref, watch } from 'vue'
import './Dialog.css'

const props = defineProps({ open: Boolean, reader: { type: Object, default: null }, options: { type: Array, default: () => [] }, busy: Boolean, error: String })
const emit = defineEmits(['save', 'close'])
const status = ref('')
const reason = ref('')
const previousStatus = ref('')
const needsReason = computed(() => status.value === 'Hạn chế' || status.value === 'Bị cấm')
const reasonUnchanged = computed(() => reason.value.trim() === String(props.reader?.lyDoHanChe || '').trim())
watch(() => [props.open, props.reader], () => {
  status.value = props.reader?.trangThai || props.options[0] || ''
  previousStatus.value = status.value
  reason.value = needsReason.value ? String(props.reader?.lyDoHanChe || '') : ''
}, { immediate: true })

function handleStatusChange() {
  if (status.value !== previousStatus.value) reason.value = ''
  previousStatus.value = status.value
}

function save() {
  emit('save', {
    trangThai: status.value,
    lyDoHanChe: needsReason.value ? reason.value.trim() : '',
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && emit('close')" @keydown.esc="!busy && emit('close')">
      <section class="confirm-dialog reader-status-dialog" role="dialog" aria-modal="true" aria-labelledby="reader-status-title">
        <button class="dialog-close" type="button" aria-label="Đóng" :disabled="busy" @click="emit('close')">×</button>
        <h2 id="reader-status-title">Đổi trạng thái độc giả</h2>
        <p>{{ reader?.maDocGia }} · {{ reader?.hoTen }}</p>
        <label class="reader-status-dialog__field"><span>Trạng thái</span><select v-model="status" :disabled="busy" @change="handleStatusChange"><option v-for="option in options" :key="option" :value="option">{{ option }}</option></select></label>
        <label v-if="needsReason" class="reader-status-dialog__field"><span>L&#253; do h&#7841;n ch&#7871;/c&#7845;m <strong aria-hidden="true">*</strong></span><textarea v-model="reason" required rows="3" :disabled="busy" placeholder="Nh&#7853;p l&#253; do" /></label>
        <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
        <div class="dialog-actions"><button class="button button--secondary" type="button" :disabled="busy" @click="emit('close')">Hủy</button><button class="button button--primary" type="button" :disabled="busy || !status || (needsReason && !reason.trim()) || (status === reader?.trangThai && (!needsReason || reasonUnchanged))" @click="save">{{ busy ? 'Đang lưu…' : 'Lưu trạng thái' }}</button></div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.reader-status-dialog { text-align: left; }
.reader-status-dialog h2 { margin: 0; padding-right: 28px; color: var(--admin-ink); font-size: 17px; }
.reader-status-dialog__field { display: grid; gap: 6px; margin-top: 18px; color: #43516a; font-size: 11px; font-weight: 650; }
.reader-status-dialog__field select { min-height: 38px; padding: 8px 10px; border: 1px solid var(--admin-line); border-radius: 7px; color: var(--admin-ink); background: #fff; font-size: 12px; }
.reader-status-dialog__field textarea { min-height: 82px; padding: 8px 10px; border: 1px solid var(--admin-line); border-radius: 7px; color: var(--admin-ink); background: #fff; font: inherit; font-size: 12px; resize: vertical; }
</style>
