import { ref } from 'vue'
import { changeReaderPassword } from '@/services/readerProfileService'

export default function useReaderPassword({ getAccessToken, handleUnauthorized, redirectToLogin }) {
  const isPasswordFormOpen = ref(false)
  const isChangingPassword = ref(false)
  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const passwordError = ref('')
  const passwordNotice = ref('')

  function passwordMeetsBackendRules(value) {
    return [...value].length >= 8 &&
      !/^\s*$/u.test(value) &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9\s]/u.test(value)
  }

  function clearPasswordFields() {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }

  async function submitPasswordChange() {
    if (isChangingPassword.value) return
    passwordError.value = ''
    passwordNotice.value = ''
    if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
      passwordError.value = 'Nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu.'
      return
    }
    if (!passwordMeetsBackendRules(newPassword.value)) {
      passwordError.value = 'Mật khẩu mới cần ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      passwordError.value = 'Mật khẩu xác nhận không khớp.'
      return
    }

    const token = getAccessToken()
    if (!token) {
      await redirectToLogin()
      return
    }

    isChangingPassword.value = true
    try {
      await changeReaderPassword(currentPassword.value, newPassword.value, token)
      clearPasswordFields()
      isPasswordFormOpen.value = false
      passwordNotice.value = 'Đổi mật khẩu thành công.'
    } catch (error) {
      if (await handleUnauthorized(error)) return
      const message = String(error.message || '')
      passwordError.value = message.toLocaleLowerCase('vi').includes('mat khau hien tai khong dung')
        ? 'Mật khẩu hiện tại không đúng.'
        : message || 'Không thể đổi mật khẩu. Vui lòng thử lại.'
    } finally {
      isChangingPassword.value = false
    }
  }

  return {
    isPasswordFormOpen,
    isChangingPassword,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordError,
    passwordNotice,
    submitPasswordChange,
  }
}
