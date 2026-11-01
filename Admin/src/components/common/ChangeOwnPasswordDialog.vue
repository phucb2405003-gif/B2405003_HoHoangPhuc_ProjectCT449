<script setup>
import { reactive, ref, watch } from 'vue'
import './Dialog.css'

const props = defineProps({
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['confirm', 'close'])
const fields = reactive({ currentPassword: '', newPassword: '', confirmation: '' })
const visible = reactive({ currentPassword: false, newPassword: false, confirmation: false })
const validationError = ref('')

watch(() => props.open, (isOpen) => {
  if (!isOpen) clearFields()
  validationError.value = ''
})

function clearFields() {
  fields.currentPassword = ''
  fields.newPassword = ''
  fields.confirmation = ''
  visible.currentPassword = false
  visible.newPassword = false
  visible.confirmation = false
}

function submit() {
  if (props.busy) return
  validationError.value = ''
  if (!fields.currentPassword || !fields.newPassword || !fields.confirmation) {
    validationError.value = 'Vui lòng nhập đầy đủ cả ba trường mật khẩu.'
    return
  }
  const password = fields.newPassword
  if ([...password].length < 8 || /^\s*$/u.test(password) || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/u.test(password)) {
    validationError.value = 'Mật khẩu mới cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'
    return
  }
  if (password !== fields.confirmation) {
    validationError.value = 'Mật khẩu xác nhận không trùng khớp.'
    return
  }
  emit('confirm', { currentPassword: fields.currentPassword, newPassword: password })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!busy && emit('close')" @keydown.esc="!busy && emit('close')">
      <section class="entity-dialog change-own-password-dialog" role="dialog" aria-modal="true" aria-labelledby="change-own-password-title">
        <header class="entity-dialog__header">
          <div><p class="dialog-kicker">BẢO MẬT TÀI KHOẢN</p><h2 id="change-own-password-title">Đổi mật khẩu</h2></div>
          <button class="dialog-close" type="button" aria-label="Đóng" :disabled="busy" @click="emit('close')">×</button>
        </header>
        <form class="entity-form change-own-password-form" novalidate @submit.prevent="submit">
          <p class="change-own-password-policy">Mật khẩu mới cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.</p>
          <label v-for="field in [
            { key: 'currentPassword', label: 'Mật khẩu hiện tại', autocomplete: 'current-password' },
            { key: 'newPassword', label: 'Mật khẩu mới', autocomplete: 'new-password' },
            { key: 'confirmation', label: 'Xác nhận mật khẩu mới', autocomplete: 'new-password' },
          ]" :key="field.key" class="form-field">
            <span>{{ field.label }}<b aria-hidden="true"> *</b></span>
            <span class="change-own-password-input">
              <input v-model="fields[field.key]" :type="visible[field.key] ? 'text' : 'password'" :autocomplete="field.autocomplete" required :disabled="busy">
              <button type="button" class="change-own-password-toggle" :disabled="busy" :aria-label="visible[field.key] ? `Ẩn ${field.label.toLocaleLowerCase('vi')}` : `Hiện ${field.label.toLocaleLowerCase('vi')}`" @click="visible[field.key] = !visible[field.key]">{{ visible[field.key] ? 'Ẩn' : 'Hiện' }}</button>
            </span>
          </label>
          <p v-if="validationError" class="dialog-error" role="alert">{{ validationError }}</p>
          <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
          <div class="dialog-actions"><button class="button button--secondary" type="button" :disabled="busy" @click="emit('close')">Hủy</button><button class="button button--primary" type="submit" :disabled="busy">{{ busy ? 'Đang đổi mật khẩu…' : 'Xác nhận đổi mật khẩu' }}</button></div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.change-own-password-dialog { width: min(100%, 480px); }
.change-own-password-form { display: grid; gap: 15px; }
.change-own-password-policy { margin: 0; color: var(--admin-muted); font-size: 11px; line-height: 1.5; }
.change-own-password-input { position: relative; display: block; }
.change-own-password-input input { padding-right: 52px; }
.change-own-password-toggle { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); border: 0; color: var(--admin-blue); background: transparent; font-size: 11px; font-weight: 650; }
.change-own-password-toggle:disabled { color: var(--admin-muted); }
.change-own-password-form .dialog-actions { margin-top: 0; }
</style>
