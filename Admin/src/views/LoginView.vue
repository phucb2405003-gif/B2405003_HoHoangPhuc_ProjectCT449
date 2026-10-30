<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, initializeAuth, loginStaff } from '@/services/authService'

const route = useRoute()
const router = useRouter()
const tenDangNhap = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const isRetryingVerification = ref(false)

async function retryVerification() {
  isRetryingVerification.value = true
  try {
    await initializeAuth({ retry: true })
    if (authState.isAuthenticated) await router.replace({ name: 'dashboard' })
  } finally {
    isRetryingVerification.value = false
  }
}

async function submitLogin() {
  errorMessage.value = ''
  const username = tenDangNhap.value.trim()
  if (!username || !password.value) {
    errorMessage.value = 'Vui lòng nhập tên đăng nhập và mật khẩu.'
    return
  }
  isLoading.value = true
  try {
    await loginStaff(username, password.value)
    password.value = ''
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.'
    password.value = ''
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="login-title">
      <div class="brand-mark" aria-hidden="true"><span>Q</span></div>
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
      <p class="security-note"><span aria-hidden="true">◆</span> Khu vực dành riêng cho nhân viên thư viện</p>
    </section>
    <footer>QLMS <span>·</span> Hệ thống quản lý thư viện</footer>
  </main>
</template>
