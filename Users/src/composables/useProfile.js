import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, getReaderAccessToken, logoutReader } from '@/services/authService'
import {
  createBorrowWithBooks,
  deleteBorrow,
  deleteBorrowDetail,
  getBook,
  getBooks,
  getBorrowDetails,
  getMyBorrows,
  submitBorrow,
} from '@/services/borrowingService'
import { changeReaderPassword, getReaderProfile, updateMyReaderProfile } from '@/services/readerProfileService'

const BORROWS_PER_PAGE = 5

export default function useProfile() {
  const route = useRoute()
  const router = useRouter()
  const activeTab = computed(() => route.query.tab === 'muon' ? 'muon' : 'thong-tin')
  const readerId = computed(() => authState.user?.maTaiKhoan || '')

  const profile = ref(null)
  const profileLoading = ref(true)
  const profileError = ref('')
  const isProfileEditOpen = ref(false)
  const isUpdatingProfile = ref(false)
  const profileUpdateError = ref('')
  const profileUpdateNotice = ref('')
  const profileForm = ref({ hoLot: '', ten: '', ngaySinh: '', phai: null, diaChi: '', dienThoai: '' })
  const borrows = ref([])
  const borrowsLoading = ref(false)
  const borrowsLoaded = ref(false)
  const borrowsError = ref('')
  const currentBorrowPage = ref(1)
  const borrowPageCount = computed(() => Math.max(1, Math.ceil(borrows.value.length / BORROWS_PER_PAGE)))
  const sortedBorrows = computed(() => borrows.value
    .map((borrow, index) => {
      const timestamp = [borrow?.ngayYeuCau, borrow?.ngayMuon]
        .map((dateValue) => dateValue ? new Date(dateValue).getTime() : Number.NaN)
        .find(Number.isFinite)
      return { borrow, index, timestamp: timestamp ?? null }
    })
    .sort((left, right) => {
      if (left.timestamp === null && right.timestamp === null) return left.index - right.index
      if (left.timestamp === null) return 1
      if (right.timestamp === null) return -1
      return right.timestamp - left.timestamp || left.index - right.index
    })
    .map(({ borrow }) => borrow))
  const paginatedBorrows = computed(() => {
    const start = (currentBorrowPage.value - 1) * BORROWS_PER_PAGE
    return sortedBorrows.value.slice(start, start + BORROWS_PER_PAGE)
  })
  const expandedBorrows = ref({})
  const borrowDetails = ref({})
  const borrowDetailLoading = ref({})
  const borrowDetailLoaded = ref({})
  const borrowDetailErrors = ref({})
  const bookNames = ref({})
  const borrowableBooks = ref([])
  const selectedBookIds = ref([])
  const isBorrowDialogOpen = ref(false)
  const isLoadingBorrowableBooks = ref(false)
  const borrowableBooksError = ref('')
  const isCreatingBorrow = ref(false)
  const borrowActionError = ref('')
  const borrowActionNotice = ref('')
  const deletingBorrowIds = ref({})
  const submittingBorrowIds = ref({})
  const deletingDetailIds = ref({})

  const isPasswordFormOpen = ref(false)
  const isChangingPassword = ref(false)
  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const passwordError = ref('')
  const passwordNotice = ref('')
  let isRedirectingToLogin = false

  watch(borrowPageCount, (pageCount) => {
    if (currentBorrowPage.value > pageCount) currentBorrowPage.value = pageCount
  }, { flush: 'sync' })

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

  function openProfileEditor() {
    const date = profile.value?.ngaySinh ? new Date(profile.value.ngaySinh) : null
    profileForm.value = {
      hoLot: profile.value?.hoLot || '',
      ten: profile.value?.ten || '',
      ngaySinh: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '',
      phai: typeof profile.value?.phai === 'boolean' ? profile.value.phai : null,
      diaChi: profile.value?.diaChi || '',
      dienThoai: profile.value?.dienThoai || '',
    }
    profileUpdateError.value = ''
    profileUpdateNotice.value = ''
    isProfileEditOpen.value = true
  }

  function cancelProfileEdit() {
    if (isUpdatingProfile.value) return
    isProfileEditOpen.value = false
    profileUpdateError.value = ''
    profileForm.value = { hoLot: '', ten: '', ngaySinh: '', phai: null, diaChi: '', dienThoai: '' }
  }

  async function saveReaderProfile() {
    if (isUpdatingProfile.value) return
    profileUpdateError.value = ''
    profileUpdateNotice.value = ''

    const form = profileForm.value
    if (typeof form.hoLot !== 'string' || !form.hoLot.trim() || typeof form.ten !== 'string' || !form.ten.trim()) {
      profileUpdateError.value = 'Vui lòng nhập họ lót và tên.'
      return
    }
    if (typeof form.phai !== 'boolean') {
      profileUpdateError.value = 'Vui lòng chọn giới tính.'
      return
    }
    if (form.ngaySinh && !/^\d{4}-\d{2}-\d{2}$/.test(form.ngaySinh)) {
      profileUpdateError.value = 'Ngày sinh không hợp lệ.'
      return
    }

    const payload = {
      hoLot: form.hoLot.trim(),
      ten: form.ten.trim(),
      phai: form.phai,
      ...(form.ngaySinh ? { ngaySinh: form.ngaySinh } : {}),
      ...(form.diaChi.trim() ? { diaChi: form.diaChi.trim() } : {}),
      ...(form.dienThoai.trim() ? { dienThoai: form.dienThoai.trim() } : {}),
    }
    const token = getReaderAccessToken()
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    isUpdatingProfile.value = true
    try {
      const updated = await updateMyReaderProfile(payload, token)
      if (!updated || updated.maDocGia !== readerId.value) {
        throw new Error('Máy chủ không xác nhận hồ sơ độc giả sau cập nhật.')
      }
      profile.value = { ...profile.value, ...updated }
      isProfileEditOpen.value = false
      profileUpdateNotice.value = 'Cập nhật thông tin cá nhân thành công.'
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        profileUpdateError.value = error.message || 'Không thể cập nhật thông tin cá nhân.'
      }
    } finally {
      isUpdatingProfile.value = false
    }
  }

  async function loadBorrows(force = false) {
    if ((!force && borrowsLoaded.value) || borrowsLoading.value) return
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
      const previousBorrowIds = new Set(borrows.value.map((borrow) => borrow.maPhieu))
      if (borrowsLoaded.value && result.some((borrow) => !previousBorrowIds.has(borrow.maPhieu))) {
        currentBorrowPage.value = 1
      }
      borrows.value = result
      borrowsLoaded.value = true
    } catch (error) {
      if (await handleUnauthorized(error)) return
      borrowsError.value = error.message || 'Không thể tải lịch sử mượn sách.'
    } finally {
      borrowsLoading.value = false
    }
  }

  async function loadBorrowDetailRows(maPhieu, token = getReaderAccessToken()) {
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return false
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
      return true
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        borrowDetailErrors.value[maPhieu] = error.message || 'Không thể tải chi tiết phiếu mượn.'
      }
      return false
    } finally {
      borrowDetailLoading.value[maPhieu] = false
    }
  }

  async function toggleBorrowDetails(borrow) {
    const maPhieu = borrow.maPhieu
    if (!maPhieu) return
    expandedBorrows.value[maPhieu] = !expandedBorrows.value[maPhieu]
    if (!expandedBorrows.value[maPhieu] || borrowDetailLoaded.value[maPhieu] || borrowDetailLoading.value[maPhieu]) return
    await loadBorrowDetailRows(maPhieu)
  }

  function availableBookCount(book) {
    const available = book?.soQuyenConLai
    const total = book?.soQuyen
    if (!Number.isSafeInteger(available) || available < 0) return null
    if (!Number.isSafeInteger(total) || total < 0 || available > total) return null
    return available
  }

  function hasAvailableStock(book) {
    return availableBookCount(book) > 0
  }

  function toggleBookSelection(maSach) {
    if (selectedBookIds.value.includes(maSach)) {
      selectedBookIds.value = selectedBookIds.value.filter((selectedId) => selectedId !== maSach)
      return
    }
    if (selectedBookIds.value.length >= 5) return
    selectedBookIds.value = [...selectedBookIds.value, maSach]
  }

  async function openBorrowDialog() {
    if (isLoadingBorrowableBooks.value || isCreatingBorrow.value) return
    const token = getReaderAccessToken()
    if (!token || authState.user?.loaiTaiKhoan !== 'DOCGIA') {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    isBorrowDialogOpen.value = true
    isLoadingBorrowableBooks.value = true
    borrowableBooksError.value = ''
    borrowActionError.value = ''
    selectedBookIds.value = []
    try {
      const rows = await getBooks(token)
      if (!Array.isArray(rows)) throw new Error('Máy chủ trả về danh sách sách không hợp lệ.')
      borrowableBooks.value = rows.filter((book) => typeof book?.maSach === 'string' && book.maSach.trim())
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        borrowableBooksError.value = error.message || 'Không thể tải danh sách sách.'
      }
    } finally {
      isLoadingBorrowableBooks.value = false
    }
  }

  async function createDraftBorrow() {
    if (isCreatingBorrow.value) return
    borrowActionError.value = ''
    borrowActionNotice.value = ''
    if (selectedBookIds.value.length < 1 || selectedBookIds.value.length > 5) {
      borrowActionError.value = 'Chọn từ 1 đến 5 cuốn sách cho mỗi phiếu.'
      return
    }

    const token = getReaderAccessToken()
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    isCreatingBorrow.value = true
    try {
      const created = await createBorrowWithBooks(selectedBookIds.value, token)
      if (!created?.maPhieu || created.trangThai !== 'Đang chọn sách') {
        throw new Error('Máy chủ không xác nhận phiếu nháp vừa tạo.')
      }
      isBorrowDialogOpen.value = false
      selectedBookIds.value = []
      currentBorrowPage.value = 1
      borrowActionNotice.value = `Đã tạo phiếu nháp ${created.maPhieu} với ${created.soLuong} cuốn sách.`
      await loadBorrows(true)
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        borrowActionError.value = error.message || 'Không thể tạo phiếu mượn.'
        await loadBorrows(true)
      }
    } finally {
      isCreatingBorrow.value = false
    }
  }

  async function refreshBorrowAfterMutation(maPhieu) {
    borrowsLoaded.value = false
    borrowDetailLoaded.value[maPhieu] = false
    await loadBorrows(true)
    if (expandedBorrows.value[maPhieu]) await loadBorrowDetailRows(maPhieu)
  }

  function previousBorrowPage() {
    if (currentBorrowPage.value > 1) currentBorrowPage.value -= 1
  }

  function nextBorrowPage() {
    if (currentBorrowPage.value < borrowPageCount.value) currentBorrowPage.value += 1
  }

  async function submitDraftBorrow(borrow) {
    const maPhieu = borrow?.maPhieu
    if (borrow?.trangThai !== 'Đang chọn sách' || !maPhieu || submittingBorrowIds.value[maPhieu]) return
    if (!window.confirm(`Gửi phiếu ${maPhieu} để chờ duyệt?`)) return

    const token = getReaderAccessToken()
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    submittingBorrowIds.value[maPhieu] = true
    borrowActionError.value = ''
    borrowActionNotice.value = ''
    try {
      await submitBorrow(maPhieu, token)
      borrowActionNotice.value = `Đã gửi phiếu ${maPhieu} để chờ duyệt.`
      await refreshBorrowAfterMutation(maPhieu)
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        borrowActionError.value = error.message || 'Không thể gửi phiếu mượn để duyệt.'
        await refreshBorrowAfterMutation(maPhieu)
      }
    } finally {
      delete submittingBorrowIds.value[maPhieu]
    }
  }

  async function removeDraftBook(borrow, detail) {
    const maPhieu = borrow?.maPhieu
    const maSach = detail?.maSach
    if (borrow?.trangThai !== 'Đang chọn sách' || detail?.trangThai !== 'Đang chọn sách' || !maPhieu || !maSach) return
    const key = `${maPhieu}:${maSach}`
    if (deletingDetailIds.value[key] || deletingBorrowIds.value[maPhieu] || submittingBorrowIds.value[maPhieu]) return
    const bookName = bookNames.value[maSach] || maSach
    if (!window.confirm(`Xóa sách "${bookName}" khỏi phiếu nháp ${maPhieu}?`)) return

    const token = getReaderAccessToken()
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    deletingDetailIds.value[key] = true
    deletingBorrowIds.value[maPhieu] = true
    borrowActionError.value = ''
    borrowActionNotice.value = ''
    try {
      await deleteBorrowDetail(maPhieu, maSach, token)
      borrowActionNotice.value = `Đã xóa "${bookName}" khỏi phiếu ${maPhieu}.`
      await refreshBorrowAfterMutation(maPhieu)
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        borrowActionError.value = error.message || 'Không thể xóa sách khỏi phiếu.'
        await refreshBorrowAfterMutation(maPhieu)
      }
    } finally {
      delete deletingDetailIds.value[key]
      delete deletingBorrowIds.value[maPhieu]
    }
  }

  async function removeDraftBorrow(borrow) {
    const maPhieu = borrow?.maPhieu
    if (borrow?.trangThai !== 'Đang chọn sách' || !maPhieu || deletingBorrowIds.value[maPhieu] || submittingBorrowIds.value[maPhieu]) return
    if (!window.confirm(`Hủy phiếu nháp ${maPhieu}? Phiếu sẽ được lưu trong lịch sử với trạng thái Hủy.`)) return

    const token = getReaderAccessToken()
    if (!token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }

    deletingBorrowIds.value[maPhieu] = true
    borrowActionError.value = ''
    borrowActionNotice.value = ''
    try {
      await deleteBorrow(maPhieu, token)
      borrowActionNotice.value = `Đã hủy phiếu nháp ${maPhieu}.`
      await refreshBorrowAfterMutation(maPhieu)
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        borrowActionError.value = error.message || 'Không thể hủy phiếu nháp.'
        await refreshBorrowAfterMutation(maPhieu)
      }
    } finally {
      delete deletingBorrowIds.value[maPhieu]
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

  function readerStatusClass(status) {
    const classes = {
      'Bình thường': 'normal',
      'Hạn chế': 'restricted',
      'Bị cấm': 'banned',
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
    availableBookCount,
    borrowActionError,
    borrowActionNotice,
    bookNames,
    borrowableBooks,
    borrowableBooksError,
    borrowDate,
    borrowDetailErrors,
    borrowDetailLoaded,
    borrowDetailLoading,
    borrowDetails,
    borrows,
    borrowsError,
    borrowsLoaded,
    borrowsLoading,
    currentBorrowPage,
    borrowPageCount,
    paginatedBorrows,
    previousBorrowPage,
    nextBorrowPage,
    createDraftBorrow,
    deletingBorrowIds,
    deletingDetailIds,
    submittingBorrowIds,
    submitDraftBorrow,
    chooseTab,
    confirmPassword,
    currentPassword,
    expandedBorrows,
    hasAvailableStock,
    formatDate,
    fullName,
    isChangingPassword,
    isPasswordFormOpen,
    isBorrowDialogOpen,
    isCreatingBorrow,
    isLoadingBorrowableBooks,
    loadBorrows,
    loadProfile,
    openBorrowDialog,
    removeDraftBook,
    removeDraftBorrow,
    selectedBookIds,
    newPassword,
    passwordError,
    passwordNotice,
    profile,
    profileError,
    profileLoading,
    isProfileEditOpen,
    isUpdatingProfile,
    profileForm,
    profileUpdateError,
    profileUpdateNotice,
    cancelProfileEdit,
    openProfileEditor,
    saveReaderProfile,
    statusClass,
    readerStatusClass,
    submitPasswordChange,
    toggleBorrowDetails,
    toggleBookSelection,
  }
}
