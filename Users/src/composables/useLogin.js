import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginReader } from '@/services/authService'

export default function useLogin() {

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

  return { errorMessage, isSubmitting, password, showPassword, submitLogin, tenDangNhap }
}
