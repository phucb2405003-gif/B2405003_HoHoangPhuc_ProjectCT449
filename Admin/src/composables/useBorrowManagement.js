import { computed, onMounted, ref, watch } from 'vue'
import { authState } from '@/services/authService'
import { ROLE_LIBRARIAN, ROLE_MANAGER } from '@/data/permissions'
import { getBooks } from '@/services/bookService'
import { getReaders } from '@/services/readerService'
import { approveBorrow as approveBorrowRequest, createDirectBorrow, getBorrow, getBorrowDetails, getBorrows, rejectBorrow as rejectBorrowRequest, returnBorrowBook } from '@/services/borrowService'
import { formatVietnamCalendarDate, isOverdueBorrowDetail } from '@/utils/borrowDueDate'

const PARENT_STATUSES = ['Đang chọn sách', 'Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Hủy']

function formatDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN').format(date)
}

function detailsForUi(details, books) {
  return details.map((detail) => ({
    ...detail,
    tenSach: books.find((book) => book.maSach === detail.maSach)?.tenSach || detail.maSach,
    trangThaiSach: detail.trangThai || '',
    quaHan: isOverdueBorrowDetail(detail),
    ngayTra: formatDate(detail.ngayTra),
    hanTra: detail.hanTra ? formatVietnamCalendarDate(detail.hanTra) : '',
  }))
}

function displayBorrow(borrow, readers = [], chiTiet = []) {
  const reader = readers.find((item) => item.maDocGia === borrow.maDocGia)
  return {
    ...borrow,
    tenDocGia: reader?.hoTen || borrow.maDocGia,
    ngayYeuCau: formatDate(borrow.ngayYeuCau) || '—',
    ngayMuon: formatDate(borrow.ngayMuon),
    chiTiet,
  }
}

export default function useBorrowManagement() {
  const search = ref('')
  const statusFilter = ref('')
  const page = ref(1)
  const pageSize = 6
  const rows = ref([])
  const readers = ref([])
  const books = ref([])
  const borrowListDetails = ref({})
  const borrowListDetailLoaded = ref({})
  const borrowListDetailLoading = ref({})
  const borrowListDetailErrors = ref({})
  const bookCatalogError = ref('')
  const detailRequests = new Map()
  let booksRequest = null
  let booksCatalogLoaded = false
  const listLoading = ref(false)
  const listError = ref('')
  const dialogOpen = ref(false)
  const dialogMode = ref('detail')
  const selectedBorrow = ref(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const actionLoading = ref(false)
  const actionError = ref('')
  const actionNotice = ref('')
  const createLoading = ref(false)
  const confirmOpen = ref(false)
  const confirmAction = ref('')
  const pendingBorrow = ref(null)
  const canManage = computed(() => [ROLE_MANAGER, ROLE_LIBRARIAN].includes(authState.user?.chucVu))
  const statusOptions = PARENT_STATUSES

  const filteredBorrows = computed(() => {
    const needle = search.value.trim().toLocaleLowerCase('vi')
    return rows.value.filter((borrow) => {
      const matchesSearch = !needle || [borrow.maPhieu, borrow.maDocGia, borrow.tenDocGia].some((value) => String(value || '').toLocaleLowerCase('vi').includes(needle))
      return matchesSearch && (!statusFilter.value || borrow.trangThai === statusFilter.value)
    })
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(filteredBorrows.value.length / pageSize)))
  const pageRows = computed(() => filteredBorrows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const confirmation = computed(() => ({
    title: 'Duyệt phiếu mượn?',
    confirmLabel: actionLoading.value ? 'Đang gửi…' : 'Duyệt phiếu',
    message: `Xác nhận duyệt phiếu ${pendingBorrow.value?.maPhieu || ''}? Hệ thống sẽ cập nhật trạng thái và hạn trả.`,
    tone: 'primary',
  }))

  watch([search, statusFilter], () => { page.value = 1 })
  watch(pageCount, (count) => { if (page.value > count) page.value = count })

  async function loadBookCatalog(retry = false) {
    if (retry && bookCatalogError.value) booksCatalogLoaded = false
    if (booksCatalogLoaded) return books.value
    if (!booksRequest) {
      booksRequest = getBooks().then((catalog) => {
        books.value = catalog
        booksCatalogLoaded = true
        bookCatalogError.value = ''
        return catalog
      }).catch((error) => {
        booksCatalogLoaded = true
        bookCatalogError.value = error.message || 'Không thể tải danh mục sách.'
        return books.value
      }).finally(() => { booksRequest = null })
    }
    return booksRequest
  }

  async function loadListBorrowDetails(maPhieu, { retry = false } = {}) {
    if (!maPhieu || borrowListDetailLoading.value[maPhieu]) return detailRequests.get(maPhieu)
    if (!retry && (borrowListDetailLoaded.value[maPhieu] || borrowListDetailErrors.value[maPhieu])) return
    borrowListDetailLoading.value[maPhieu] = true
    borrowListDetailErrors.value[maPhieu] = ''
    const request = Promise.all([
      getBorrowDetails(maPhieu),
      loadBookCatalog(retry),
    ]).then(([details, catalog]) => {
      if (!Array.isArray(details)) throw new Error('Máy chủ trả về chi tiết phiếu không hợp lệ.')
      borrowListDetails.value = { ...borrowListDetails.value, [maPhieu]: detailsForUi(details, catalog) }
      borrowListDetailLoaded.value = { ...borrowListDetailLoaded.value, [maPhieu]: true }
    }).catch((error) => {
      borrowListDetailErrors.value = { ...borrowListDetailErrors.value, [maPhieu]: error.message || 'Không thể tải chi tiết phiếu mượn.' }
    }).finally(() => {
      borrowListDetailLoading.value = { ...borrowListDetailLoading.value, [maPhieu]: false }
      detailRequests.delete(maPhieu)
    })
    detailRequests.set(maPhieu, request)
    return request
  }

  function overdueDetailsFor(maPhieu) {
    return (borrowListDetails.value[maPhieu] || []).filter((detail) => detail.quaHan)
  }

  watch(pageRows, (visibleRows) => {
    visibleRows.forEach((borrow) => { void loadListBorrowDetails(borrow.maPhieu) })
  })

  async function loadBorrows() {
    listLoading.value = true
    listError.value = ''
    try {
      const [borrows, readerRows] = await Promise.all([getBorrows(), getReaders()])
      readers.value = readerRows
      rows.value = borrows.map((borrow) => displayBorrow(borrow, readerRows))
    } catch (error) {
      listError.value = error.message || 'Không thể tải danh sách phiếu mượn.'
    } finally { listLoading.value = false }
  }

  onMounted(loadBorrows)

  async function openDetails(borrow) {
    selectedBorrow.value = { ...borrow, chiTiet: [] }
    dialogMode.value = 'detail'
    dialogOpen.value = true
    detailLoading.value = true
    detailError.value = ''
    actionError.value = ''
    actionNotice.value = ''
    try {
      const freshBorrow = await getBorrow(borrow.maPhieu)
      await loadListBorrowDetails(borrow.maPhieu)
      if (borrowListDetailErrors.value[borrow.maPhieu]) throw new Error(borrowListDetailErrors.value[borrow.maPhieu])
      selectedBorrow.value = displayBorrow(freshBorrow, readers.value, borrowListDetails.value[borrow.maPhieu] || [])
      rows.value = rows.value.map((item) => item.maPhieu === freshBorrow.maPhieu ? displayBorrow(freshBorrow, readers.value) : item)
    } catch (error) {
      detailError.value = error.message || 'Không thể tải chi tiết phiếu mượn.'
    } finally { detailLoading.value = false }
  }

  function openCreate() {
    selectedBorrow.value = null
    dialogMode.value = 'create'
    dialogOpen.value = true
    actionError.value = ''
    actionNotice.value = ''
    detailError.value = ''
  }

  function openReject() {
    if (!selectedBorrow.value || selectedBorrow.value.trangThai !== 'Chờ duyệt') return
    dialogMode.value = 'reject'
    actionError.value = ''
  }

  function closeDialog() {
    if (actionLoading.value || createLoading.value) return
    dialogOpen.value = false
  }

  function askConfirmation(action, borrow) {
    if (!canManage.value || actionLoading.value || borrow?.trangThai !== 'Chờ duyệt') return
    confirmAction.value = action
    pendingBorrow.value = borrow
    actionError.value = ''
    actionNotice.value = ''
    confirmOpen.value = true
  }

  function mergeBorrow(borrow) {
    const normalized = displayBorrow(borrow, readers.value)
    rows.value = rows.value.map((item) => item.maPhieu === borrow.maPhieu ? normalized : item)
    if (selectedBorrow.value?.maPhieu === borrow.maPhieu) {
      selectedBorrow.value = { ...normalized, chiTiet: selectedBorrow.value.chiTiet }
    }
  }

  async function confirmBorrowAction() {
    const borrow = pendingBorrow.value
    if (!canManage.value || !borrow || actionLoading.value || confirmAction.value !== 'approve') return
    actionLoading.value = true
    actionError.value = ''
    actionNotice.value = ''
    try {
      const result = await approveBorrowRequest(borrow.maPhieu)
      mergeBorrow(result.borrow)
      confirmOpen.value = false
      pendingBorrow.value = null
      actionNotice.value = `Đã duyệt phiếu ${borrow.maPhieu}.`
      await loadDetailsAfterAction(borrow.maPhieu)
    } catch (error) { actionError.value = error.message || 'Không thể duyệt phiếu.' }
    finally { actionLoading.value = false }
  }

  async function loadDetailsAfterAction(maPhieu) {
    if (!dialogOpen.value || selectedBorrow.value?.maPhieu !== maPhieu) return
    detailError.value = ''
    try {
      await loadListBorrowDetails(maPhieu, { retry: true })
      if (borrowListDetailErrors.value[maPhieu]) throw new Error(borrowListDetailErrors.value[maPhieu])
      selectedBorrow.value = { ...selectedBorrow.value, chiTiet: borrowListDetails.value[maPhieu] || [] }
    } catch (error) {
      detailError.value = `Trạng thái phiếu đã cập nhật; không tải được chi tiết mới: ${error.message}`
    }
  }

  async function rejectBorrow(reason) {
    const borrow = selectedBorrow.value
    if (!canManage.value || !borrow || borrow.trangThai !== 'Chờ duyệt' || !reason.trim() || actionLoading.value) return
    actionLoading.value = true
    actionError.value = ''
    actionNotice.value = ''
    try {
      const result = await rejectBorrowRequest(borrow.maPhieu, reason.trim())
      mergeBorrow(result.borrow)
      dialogOpen.value = false
      actionNotice.value = `Đã từ chối phiếu ${borrow.maPhieu}.`
    } catch (error) { actionError.value = error.message || 'Không thể từ chối phiếu.' }
    finally { actionLoading.value = false }
  }

  async function returnBook(book) {
    const borrow = selectedBorrow.value
    if (!canManage.value || !borrow || borrow.trangThai !== 'Đã duyệt' || book.trangThaiSach !== 'Đang mượn' || actionLoading.value) return
    actionLoading.value = true
    actionError.value = ''
    actionNotice.value = ''
    try {
      const result = await returnBorrowBook(borrow.maPhieu, book.maSach)
      mergeBorrow(result.borrow)
      const updated = { ...result.detail, ...book, quaHan: false, trangThaiSach: result.detail?.trangThai || 'Đã trả', ngayTra: formatDate(result.detail?.ngayTra) }
      selectedBorrow.value.chiTiet = selectedBorrow.value.chiTiet.map((item) => item.maSach === book.maSach ? updated : item)
      borrowListDetails.value = {
        ...borrowListDetails.value,
        [borrow.maPhieu]: (borrowListDetails.value[borrow.maPhieu] || []).map((item) => item.maSach === book.maSach ? { ...updated, quaHan: false } : item),
      }
      actionNotice.value = `Đã ghi nhận trả sách ${book.maSach}.`
    } catch (error) { actionError.value = error.message || 'Không thể ghi nhận trả sách.' }
    finally { actionLoading.value = false }
  }

  async function createBorrow(payload) {
    if (!canManage.value || createLoading.value) return
    createLoading.value = true
    actionError.value = ''
    actionNotice.value = ''
    try {
      const created = await createDirectBorrow(payload)
      rows.value = [displayBorrow(created, readers.value), ...rows.value]
      dialogOpen.value = false
      actionNotice.value = `Đã tạo phiếu ${created.maPhieu} tại quầy.`
    } catch (error) { actionError.value = error.message || 'Không thể tạo phiếu mượn.' }
    finally { createLoading.value = false }
  }

  return {
    search, statusFilter, page, pageSize, statusOptions, filteredBorrows, pageRows, pageCount, canManage,
    rows, listLoading, listError, loadBorrows, dialogOpen, dialogMode, selectedBorrow, detailLoading, detailError,
    borrowListDetailErrors, borrowListDetailLoaded, borrowListDetailLoading, bookCatalogError, overdueDetailsFor, retryListBorrowDetails: (maPhieu) => loadListBorrowDetails(maPhieu, { retry: true }),
    actionLoading, actionError, actionNotice, createLoading, confirmOpen, confirmation,
    openDetails, openCreate, openReject, closeDialog, askConfirmation, confirmBorrowAction, rejectBorrow, returnBook, createBorrow,
  }
}
