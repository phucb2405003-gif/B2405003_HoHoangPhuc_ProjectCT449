<script setup>
import './Dialog.css'
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Xác nhận thao tác' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Xác nhận' },
  tone: { type: String, default: 'primary' },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && emit('close')" @keydown.esc="!busy && emit('close')">
      <section class="confirm-dialog" role="dialog" aria-modal="true" :aria-label="title">
        <button class="dialog-close" type="button" aria-label="Đóng" :disabled="busy" @click="emit('close')">×</button>
        <span class="confirm-dialog__mark" :class="`confirm-dialog__mark--${tone}`">!</span>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
        <div class="dialog-actions">
          <button class="button button--secondary" type="button" :disabled="busy" @click="emit('close')">Hủy</button>
          <button class="button" :class="tone === 'danger' ? 'button--danger' : 'button--primary'" type="button" :disabled="busy" @click="emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
