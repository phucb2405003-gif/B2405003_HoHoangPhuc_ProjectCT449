import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, getReaderAccessToken, logoutReader } from '@/services/authService'
import { getBook, getBorrowDetails, getMyBorrows } from '@/services/borrowingService'
import { changeReaderPassword, getReaderProfile } from '@/services/readerProfileService'

export default function useProfile() {
  const route = useRoute()
  const router = useRouter()
  const activeTab = computed(() => route.query.tab === 'muon' ? 'muon' : 'thong-tin')
  const readerId = computed(() => authState.user?.maTaiKhoan || '')

  const profile = ref(null)
  const profileLoading = ref(true)
  const profileError = ref('')
  const borrows = ref([])
  const borrowsLoading = ref(false)
  const borrowsLoaded = ref(false)
  const borrowsError = ref('')
  const expandedBorrows = ref({})
  const borrowDetails = ref({})
  const borrowDetailLoading = ref({})
  const borrowDetailLoaded = ref({})
  const borrowDetailErrors = ref({})
  const bookNames = ref({})

  const isPasswordFormOpen = ref(false)
  const isChangingPassword = ref(false)
  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const passwordError = ref('')
  const passwordNotice = ref('')
  let isRedirectingToLogin = false

  const fullName = computed(() => [profile.value?.hoLot, profile.value?.ten]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim())
    .join(' '))

  async function chooseTab(tab) {
    if (activeTab.value === tab) return
    await router.replace({ name: 'reader-profile', query: { tab } })
  }

  async function handleUnauthorized(error) {
    if (error?.status !== 401 || isRedirectingToLogin) return false

    isRedirectingToLogin = true
    logoutReader()
    await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return true
  }

  async function loadProfile() {
    const token = getReaderAccessToken()
    if (!token || !readerId.value || authState.user?.loaiTaiKhoan !== 'DOCGIA') {
      profileLoading.value = false
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    profileLoading.value = true
    profileError.value = ''
    try {
      const result = await getReaderProfile(readerId.value, token)
      if (result?.maDocGia !== readerId.value) {
        throw new Error('Thông tin hồ sơ không khớp với tài khoản đang đăng nhập.')
      }
      profile.value = result
    } catch (error) {
      if (await handleUnauthorized(error)) return
      profileError.value = error.message || 'Không thể tải thông tin cá nhân.'
    } finally {
      profileLoading.value = false
    }
  }

  async function loadBorrows() {
    if (borrowsLoaded.value || borrowsLoading.value) return
    const token = getReaderAccessToken()
    if (!token || authState.user?.loaiTaiKhoan !== 'DOCGIA') {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    borrowsLoading.value = true
    borrowsError.value = ''
    try {
      const result = await getMyBorrows(token)
      if (!Array.isArray(result)) throw new Error('Máy chủ trả về danh sách phiếu mượn không hợp lệ.')
      borrows.value = result
      borrowsLoaded.value = true
    } catch (error) {
      if (await handleUnauthorized(error)) return
      borrowsError.value = error.message || 'Không thể tải lịch sử mượn sách.'
    } finally {
      borrowsLoading.value = false
    }
  }

  async function toggleBorrowDetails(borrow) {
    const maPhieu = borrow.maPhieu
    if (!maPhieu) return
    expandedBorrows.value[maPhieu] = !expandedBorrows.value[maPhieu]
    if (!expandedBorrows.value[maPhieu] || borrowDetailLoaded.value[maPhieu] || borrowDetailLoading.value[maPhieu]) return

    const token = getReaderAccessToken()
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    borrowDetailLoading.value[maPhieu] = true
    borrowDetailErrors.value[maPhieu] = ''
    try {
      const rows = await getBorrowDetails(maPhieu, token)
      if (!Array.isArray(rows)) throw new Error('Máy chủ trả về chi tiết phiếu không hợp lệ.')
      borrowDetails.value[maPhieu] = rows
      borrowDetailLoaded.value[maPhieu] = true

      const resolvedNames = await Promise.all(rows.map(async (detail) => {
        try {
          const book = await getBook(detail.maSach, token)
          return [detail.maSach, typeof book?.tenSach === 'string' ? book.tenSach : null]
        } catch (error) {
          if (await handleUnauthorized(error)) return [detail.maSach, null]
          return [detail.maSach, null]
        }
      }))
      bookNames.value = { ...bookNames.value, ...Object.fromEntries(resolvedNames) }
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        borrowDetailErrors.value[maPhieu] = error.message || 'Không thể tải chi tiết phiếu mượn.'
      }
    } finally {
      borrowDetailLoading.value[maPhieu] = false
    }
  }

  function formatDate(value) {
    if (!value) return 'Chưa cập nhật'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật'
    return new Intl.DateTimeFormat('vi-VN').format(date)
  }

  function borrowDate(borrow) {
    if (borrow.ngayYeuCau) return { label: 'Ngày yêu cầu', value: borrow.ngayYeuCau }
    if (borrow.ngayMuon) return { label: 'Ngày mượn', value: borrow.ngayMuon }
    return { label: 'Ngày', value: null }
  }

  function statusClass(status) {
    const classes = {
      'Chờ duyệt': 'pending',
      'Đã duyệt': 'approved',
      'Từ chối': 'rejected',
      Hủy: 'cancelled',
      'Đang mượn': 'borrowed',
      'Đã trả': 'returned',
    }
    return classes[status] || 'unknown'
  }

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

    const token = getReaderAccessToken()
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
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

  watch(activeTab, (tab) => {
    if (tab === 'muon') void loadBorrows()
  }, { immediate: true })

  onMounted(loadProfile)

  return {
    activeTab,
    authState,
    bookNames,
    borrowDate,
    borrowDetailErrors,
    borrowDetailLoaded,
    borrowDetailLoading,
    borrowDetails,
    borrows,
    borrowsError,
    borrowsLoaded,
    borrowsLoading,
    chooseTab,
    confirmPassword,
    currentPassword,
    expandedBorrows,
    formatDate,
    fullName,
    isChangingPassword,
    isPasswordFormOpen,
    loadBorrows,
    loadProfile,
    newPassword,
    passwordError,
    passwordNotice,
    profile,
    profileError,
    profileLoading,
    statusClass,
    submitPasswordChange,
    toggleBorrowDetails,
  }
}
