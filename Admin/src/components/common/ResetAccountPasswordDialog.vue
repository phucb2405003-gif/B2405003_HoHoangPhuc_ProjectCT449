<script setup>
import { ref, watch } from 'vue'
import './Dialog.css'

const props = defineProps({
  open: { type: Boolean, default: false },
  account: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['confirm', 'close'])
const password = ref('')
const confirmation = ref('')
const showPassword = ref(false)
const validationError = ref('')

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    password.value = ''
    confirmation.value = ''
    showPassword.value = false
    validationError.value = ''
  }
})

function submit() {
  if (props.busy) return
  validationError.value = ''
  if ([...password.value].length < 8 || !/[A-Z]/.test(password.value) || !/[a-z]/.test(password.value) || !/[0-9]/.test(password.value) || !/[^A-Za-z0-9\s]/u.test(password.value) || /^\s*$/u.test(password.value)) {
    validationError.value = 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'
    return
  }
  if (password.value !== confirmation.value) {
    validationError.value = 'Mật khẩu xác nhận không khớp.'
    return
  }
  emit('confirm', password.value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && emit('close')" @keydown.esc="!busy && emit('close')">
      <section class="entity-dialog reset-password-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
        <header class="entity-dialog__header">
          <div><p class="dialog-kicker">TÀI KHOẢN</p><h2 id="reset-password-title">Đặt lại mật khẩu</h2><p class="reset-password-dialog__account">{{ account?.tenDangNhap }} · {{ account?.maTaiKhoan }}</p></div>
          <button class="dialog-close" type="button" aria-label="Đóng" :disabled="busy" @click="emit('close')">×</button>
        </header>
        <form class="entity-form" novalidate @submit.prevent="submit">
          <p class="reset-password-dialog__policy">Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.</p>
          <label class="form-field"><span>Mật khẩu mới<b aria-hidden="true"> *</b></span><span class="reset-password-dialog__input"><input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required :disabled="busy"><button type="button" class="reset-password-dialog__toggle" :disabled="busy" :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" @click="showPassword = !showPassword">{{ showPassword ? 'Ẩn' : 'Hiện' }}</button></span></label>
          <label class="form-field"><span>Xác nhận mật khẩu mới<b aria-hidden="true"> *</b></span><input v-model="confirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required :disabled="busy"></label>
          <p v-if="validationError" class="dialog-error" role="alert">{{ validationError }}</p>
          <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
          <div class="dialog-actions"><button class="button button--secondary" type="button" :disabled="busy" @click="emit('close')">Hủy</button><button class="button button--primary" type="submit" :disabled="busy">{{ busy ? 'Đang đặt lại…' : 'Xác nhận đặt lại mật khẩu' }}</button></div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.reset-password-dialog { width: min(100%, 480px); }
.reset-password-dialog__account { margin: 6px 0 0; color: var(--admin-muted); font-size: 12px; }
.reset-password-dialog__policy { grid-column: 1 / -1; margin: 0; color: var(--admin-muted); font-size: 11px; line-height: 1.5; }
.reset-password-dialog__input { position: relative; display: block; }
.reset-password-dialog__input input { padding-right: 52px; }
.reset-password-dialog__toggle { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); border: 0; color: var(--admin-blue); background: transparent; font-size: 11px; font-weight: 650; }
.reset-password-dialog__toggle:disabled { color: var(--admin-muted); }
.reset-password-dialog .dialog-actions { grid-column: 1 / -1; }
@media (max-width: 520px) { .reset-password-dialog__policy, .reset-password-dialog .dialog-actions { grid-column: auto; } }
</style>
