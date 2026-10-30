<script setup>
import '@/components/common/ManagementView.css'
import '@/components/common/Dialog.css'
import useStaffProfile from '@/composables/useStaffProfile'
import './ProfileView.css'

const { code, role, form, errors, message, messageType, cancelChanges, saveChanges } = useStaffProfile()
</script>

<template>
  <section class="management-page profile-page" aria-labelledby="profile-title">
    <header class="management-heading">
      <div><div class="management-heading__eyebrow"><span class="heading-indicator"></span> TÀI KHOẢN NHÂN VIÊN</div><h2 id="profile-title">Thông tin cá nhân</h2><p>Xem và cập nhật thông tin hồ sơ của nhân viên đang đăng nhập.</p></div>
    </header>
    <form class="profile-card" novalidate @submit.prevent="saveChanges">
      <div class="profile-card__heading"><div><h3>Hồ sơ nhân viên</h3><p>Mã nhân viên, tài khoản và chức vụ được giữ chỉ đọc.</p></div><span class="profile-role">{{ role || 'Nhân viên' }}</span></div>
      <div class="profile-grid">
        <label class="profile-field"><span>Mã nhân viên</span><input :value="code" readonly></label>
        <label class="profile-field"><span>Chức vụ</span><input :value="role || 'Theo phiên đăng nhập'" readonly></label>
        <label class="profile-field profile-field--wide"><span>Họ và tên <b>*</b></span><input v-model="form.hoTenNV" autocomplete="name" maxlength="120"><small v-if="errors.hoTenNV" class="field-error">{{ errors.hoTenNV }}</small></label>
        <label class="profile-field profile-field--wide"><span>Địa chỉ</span><textarea v-model="form.diaChi" rows="3" maxlength="300"></textarea></label>
        <label class="profile-field"><span>Số điện thoại</span><input v-model="form.soDienThoai" type="tel" autocomplete="tel" maxlength="15"><small v-if="errors.soDienThoai" class="field-error">{{ errors.soDienThoai }}</small></label>
      </div>
      <p v-if="message" class="profile-message" :class="`profile-message--${messageType}`" role="status">{{ message }}</p>
      <div class="profile-actions"><button class="button button--secondary" type="button" @click="cancelChanges">Hủy</button><button class="button button--primary" type="submit">Lưu thay đổi</button></div>
    </form>
  </section>
</template>
