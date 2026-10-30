import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, initializeAuth, loginStaff } from '@/services/authService'

export default function useStaffLogin() {
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

  return {
    tenDangNhap,
    password,
    showPassword,
    isLoading,
    errorMessage,
    isRetryingVerification,
    retryVerification,
    submitLogin,
  }
}
