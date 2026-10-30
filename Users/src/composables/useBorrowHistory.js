import { computed, ref, watch } from 'vue'
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

const BORROWS_PER_PAGE = 5

export default function useBorrowHistory({ getAccessToken, isReaderAccount, handleUnauthorized, redirectToLogin }) {
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
  const bookNameRequests = new Map()
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

  watch(borrowPageCount, (pageCount) => {
    if (currentBorrowPage.value > pageCount) currentBorrowPage.value = pageCount
  }, { flush: 'sync' })

  async function loadBorrows(force = false) {
    if ((!force && borrowsLoaded.value) || borrowsLoading.value) return
    const token = getAccessToken()
    if (!token || !isReaderAccount()) {
      await redirectToLogin()
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

  function hasBookName(value) {
    return typeof value === 'string' && value.trim().length > 0
  }

  function loadBookName(maSach, token) {
    const cachedName = bookNames.value[maSach]
    if (hasBookName(cachedName)) return Promise.resolve(cachedName)

    const existingRequest = bookNameRequests.get(maSach)
    if (existingRequest) return existingRequest

    let request
    request = getBook(maSach, token)
      .then((book) => {
        const name = book?.tenSach
        if (hasBookName(name)) {
          bookNames.value = { ...bookNames.value, [maSach]: name }
          return name
        }
        return null
      })
      .finally(() => {
        if (bookNameRequests.get(maSach) === request) bookNameRequests.delete(maSach)
      })

    bookNameRequests.set(maSach, request)
    return request
  }

  async function loadBorrowDetailRows(maPhieu, token = getAccessToken()) {
    if (!token) {
      await redirectToLogin()
      return false
    }
    borrowDetailLoading.value[maPhieu] = true
    borrowDetailErrors.value[maPhieu] = ''
    try {
      const rows = await getBorrowDetails(maPhieu, token)
      if (!Array.isArray(rows)) throw new Error('Máy chủ trả về chi tiết phiếu không hợp lệ.')
      borrowDetails.value[maPhieu] = rows
      borrowDetailLoaded.value[maPhieu] = true

      const bookCodes = [...new Set(rows
        .map((detail) => detail.maSach)
        .filter((maSach) => typeof maSach === 'string' && maSach.trim()))]
      await Promise.all(bookCodes.map(async (maSach) => {
        try {
          await loadBookName(maSach, token)
        } catch (error) {
          await handleUnauthorized(error)
        }
      }))
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
    const token = getAccessToken()
    if (!token || !isReaderAccount()) {
      await redirectToLogin()
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

    const token = getAccessToken()
    if (!token) {
      await redirectToLogin()
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

    const token = getAccessToken()
    if (!token) {
      await redirectToLogin()
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

    const token = getAccessToken()
    if (!token) {
      await redirectToLogin()
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

    const token = getAccessToken()
    if (!token) {
      await redirectToLogin()
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

  return {
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
    expandedBorrows,
    hasAvailableStock,
    isBorrowDialogOpen,
    isCreatingBorrow,
    isLoadingBorrowableBooks,
    loadBorrows,
    openBorrowDialog,
    removeDraftBook,
    removeDraftBorrow,
    selectedBookIds,
    statusClass,
    toggleBorrowDetails,
    toggleBookSelection,
  }
}
