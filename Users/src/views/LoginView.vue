<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginReader } from '@/services/authService'
import bookLockIcon from '@/assets/icons/book-lock.svg'
import bookOpenIcon from '@/assets/icons/book-open-text.svg'
import './LoginView.css'

const router = useRouter()
const route = useRoute()
const tenDangNhap = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submitLogin() {
  if (isSubmitting.value) return
  errorMessage.value = ''
  if (!tenDangNhap.value.trim() || !password.value) {
    errorMessage.value = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'
    return
  }

  isSubmitting.value = true
  try {
    await loginReader(tenDangNhap.value.trim(), password.value)
    const requestedTarget = typeof route.query.redirect === 'string'
      ? router.resolve(route.query.redirect)
      : null
    if (requestedTarget?.name === 'reader-profile') {
      await router.replace({
        name: 'reader-profile',
        query: { tab: requestedTarget.query.tab === 'muon' ? 'muon' : 'thong-tin' },
      })
    } else {
      await router.replace({ name: 'home' })
    }
  } catch (error) {
    errorMessage.value = error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-page__glow login-page__glow--one" aria-hidden="true"></div>
    <div class="login-page__glow login-page__glow--two" aria-hidden="true"></div>

    <RouterLink class="login-brand" to="/" aria-label="Thư viện trực tuyến, về trang chủ">
      <span class="login-brand__logo"><img src="@/assets/icons/square-library.svg" alt="" /></span>
      <span>Thư viện trực tuyến</span>
    </RouterLink>

    <section class="login-card" aria-labelledby="login-title">
      <div class="login-card__mark" aria-hidden="true">
        <img src="@/assets/icons/square-library.svg" alt="" />
      </div>
      <p class="login-card__eyebrow">KHÔNG GIAN ĐỌC CỦA BẠN</p>
      <h1 id="login-title">Đăng nhập</h1>
      <p class="login-card__description">Đăng nhập tài khoản độc giả để tiếp tục khám phá thư viện.</p>

      <form class="login-form" @submit.prevent="submitLogin">
        <label class="login-form__label" for="username">Tên đăng nhập</label>
        <input
          id="username"
          v-model="tenDangNhap"
          class="login-form__input"
          name="tenDangNhap"
          type="text"
          autocomplete="username"
          placeholder="Nhập tên đăng nhập"
          :disabled="isSubmitting"
          required
        />

        <label class="login-form__label" for="password">Mật khẩu</label>
        <div class="login-form__password">
          <input
            id="password"
            v-model="password"
            class="login-form__input"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="Nhập mật khẩu"
            :disabled="isSubmitting"
            required
          />
          <button
            class="login-form__toggle"
            type="button"
            :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            :title="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            :aria-pressed="showPassword"
            :disabled="isSubmitting"
            @click="showPassword = !showPassword"
          >
            <img
              :src="showPassword ? bookOpenIcon : bookLockIcon"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>

        <p v-if="errorMessage" class="login-form__error" role="alert">{{ errorMessage }}</p>

        <button class="login-form__submit" type="submit" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="login-form__spinner" aria-hidden="true"></span>
          {{ isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập' }}
        </button>
      </form>

      <RouterLink class="login-card__back" to="/">← Quay về trang chủ</RouterLink>
    </section>

    <p class="login-page__footer">Mở rộng tri thức, kết nối đam mê đọc sách.</p>
  </main>
</template>
