<script setup>
import libraryIcon from '@/assets/icons/square-library.svg'
import useStaffLogin from '@/composables/useStaffLogin'
import { authState } from '@/services/authService'
import './LoginView.css'

const {
  tenDangNhap,
  password,
  showPassword,
  isLoading,
  errorMessage,
  isRetryingVerification,
  retryVerification,
  submitLogin,
} = useStaffLogin()
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="login-title">
      <div class="login-brand-mark"><img :src="libraryIcon" alt="" aria-hidden="true"></div>
      <p class="eyebrow">QUẢN LÝ THƯ VIỆN</p>
      <h1 id="login-title">Cổng nhân viên</h1>
      <p class="intro">Đăng nhập bằng tài khoản nhân viên để tiếp tục.</p>

      <div v-if="authState.verificationError" class="verification-error" role="alert">
        <p>{{ authState.verificationError }}</p>
        <button v-if="authState.canRetryVerification" type="button" :disabled="isRetryingVerification || authState.isChecking" @click="retryVerification">
          {{ isRetryingVerification ? 'Đang thử lại…' : 'Thử xác minh lại' }}
        </button>
      </div>

      <form class="login-form" @submit.prevent="submitLogin">
        <label for="username">Tên đăng nhập</label>
        <input id="username" v-model="tenDangNhap" name="username" type="text" autocomplete="username" placeholder="Nhập tên đăng nhập" required :disabled="isLoading">
        <label for="password">Mật khẩu</label>
        <div class="password-field">
          <input id="password" v-model="password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Nhập mật khẩu" required :disabled="isLoading">
          <button class="visibility-toggle" type="button" :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" :disabled="isLoading" @click="showPassword = !showPassword">{{ showPassword ? 'Ẩn' : 'Hiện' }}</button>
        </div>
        <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
        <button class="submit-button" type="submit" :disabled="isLoading">
          <span v-if="isLoading" class="spinner" aria-hidden="true"></span>
          {{ isLoading ? 'Đang xác thực…' : 'Đăng nhập' }}
        </button>
      </form>
      <p class="security-note">Khu vực dành riêng cho nhân viên thư viện</p>
    </section>
    <footer>QLMS <span>·</span> Hệ thống quản lý thư viện</footer>
  </main>
</template>
