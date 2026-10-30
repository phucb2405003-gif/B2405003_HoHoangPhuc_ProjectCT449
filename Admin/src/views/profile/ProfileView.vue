<script setup>
import { computed, ref } from 'vue'
import '@/components/common/ManagementView.css'
import '@/components/common/Dialog.css'
import useStaffProfile from '@/composables/useStaffProfile'
import { authState } from '@/services/authService'
import './ProfileView.css'

const { code, role, form, errors, message, messageType, loading, updating, loadError, loadProfile, cancelChanges, saveChanges } = useStaffProfile()
const account = computed(() => authState.user?.tenDangNhap || '')
const isEditing = ref(false)

function beginEditing() {
  message.value = ''
  isEditing.value = true
}

async function submitChanges() {
  if (!isEditing.value) return
  await saveChanges()
  if (messageType.value === 'success' && message.value) isEditing.value = false
}

function discardChanges() {
  cancelChanges()
  isEditing.value = false
}
</script>

<template>
  <section class="management-page profile-page" aria-labelledby="profile-title">
    <header class="management-heading">
      <div><div class="management-heading__eyebrow"><span class="heading-indicator"></span> TÀI KHOẢN NHÂN VIÊN</div><h2 id="profile-title">Thông tin cá nhân</h2><p>Xem và cập nhật thông tin hồ sơ của nhân viên đang đăng nhập.</p></div>
    </header>
    <form class="profile-card" novalidate @submit.prevent="submitChanges">
      <div class="profile-card__heading"><div><h3>Hồ sơ nhân viên</h3><p>Mã nhân viên, tài khoản và chức vụ được giữ chỉ đọc.</p></div><span class="profile-role">{{ role || 'Nhân viên' }}</span></div>
      <p v-if="loading" class="management-state" role="status">Đang tải hồ sơ nhân viên…</p>
      <div v-if="loadError" class="profile-message profile-message--error" role="alert"><span>{{ loadError }}</span> <button class="button button--secondary" type="button" :disabled="loading" @click="loadProfile">Thử tải lại</button></div>
      <div class="profile-grid">
        <label class="profile-field"><span>Mã nhân viên</span><input :value="code" readonly></label>
        <label class="profile-field"><span>Tài khoản</span><input :value="account" readonly></label>
        <label class="profile-field"><span>Chức vụ</span><input :value="role || 'Theo phiên đăng nhập'" readonly></label>
        <label class="profile-field profile-field--wide"><span>Họ và tên <b v-if="isEditing">*</b></span><input v-model="form.hoTenNV" autocomplete="name" maxlength="120" :readonly="!isEditing" :disabled="loading || updating"><small v-if="isEditing && errors.hoTenNV" class="field-error">{{ errors.hoTenNV }}</small></label>
        <label class="profile-field profile-field--wide"><span>Địa chỉ</span><textarea v-model="form.diaChi" rows="3" maxlength="300" :readonly="!isEditing" :disabled="loading || updating"></textarea></label>
        <label class="profile-field"><span>Số điện thoại</span><input v-model="form.soDienThoai" type="tel" autocomplete="tel" maxlength="15" :readonly="!isEditing" :disabled="loading || updating"><small v-if="isEditing && errors.soDienThoai" class="field-error">{{ errors.soDienThoai }}</small></label>
      </div>
      <p v-if="message" class="profile-message" :class="`profile-message--${messageType}`" role="status">{{ message }}</p>
      <div class="profile-actions">
        <template v-if="isEditing">
          <button class="button button--secondary" type="button" :disabled="loading || updating" @click="discardChanges">Hủy</button>
          <button class="button button--primary" type="submit" :disabled="loading || updating || loadError">{{ updating ? 'Đang lưu…' : 'Lưu thay đổi' }}</button>
        </template>
        <button v-else-if="!loading && !loadError" class="button button--primary" type="button" @click="beginEditing">Chỉnh sửa</button>
      </div>
    </form>
  </section>
</template>
