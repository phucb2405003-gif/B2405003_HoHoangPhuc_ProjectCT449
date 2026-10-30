import { computed, onMounted, ref, watch } from 'vue'
import { authState } from '@/services/authService'
import { ROLE_LIBRARIAN, ROLE_MANAGER } from '@/data/permissions'
import { getBooks } from '@/services/bookService'
import { getReaders } from '@/services/readerService'
import { approveBorrow as approveBorrowRequest, createDirectBorrow, getBorrow, getBorrowDetails, getBorrows, rejectBorrow as rejectBorrowRequest, returnBorrowBook } from '@/services/borrowService'

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
    ngayTra: formatDate(detail.ngayTra),
    hanTra: formatDate(detail.hanTra),
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
      const [freshBorrow, details, catalog] = await Promise.all([
        getBorrow(borrow.maPhieu),
        getBorrowDetails(borrow.maPhieu),
        books.value.length ? Promise.resolve(books.value) : getBooks(),
      ])
      books.value = catalog
      selectedBorrow.value = displayBorrow(freshBorrow, readers.value, detailsForUi(details, catalog))
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
    books.value = []
    detailLoading.value = true
    detailError.value = ''
    Promise.all([getReaders(), getBooks()]).then(([readerRows, bookRows]) => {
      readers.value = readerRows
      books.value = bookRows
    }).catch((error) => {
      detailError.value = error.message || 'Không thể tải danh sách độc giả và sách.'
    }).finally(() => { detailLoading.value = false })
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
      const [details, catalog] = await Promise.all([getBorrowDetails(maPhieu), books.value.length ? Promise.resolve(books.value) : getBooks()])
      books.value = catalog
      selectedBorrow.value = { ...selectedBorrow.value, chiTiet: detailsForUi(details, catalog) }
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
      const updated = { ...result.detail, ...book, trangThaiSach: result.detail?.trangThai || 'Đã trả', ngayTra: formatDate(result.detail?.ngayTra) }
      selectedBorrow.value.chiTiet = selectedBorrow.value.chiTiet.map((item) => item.maSach === book.maSach ? updated : item)
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
    actionLoading, actionError, actionNotice, createLoading, confirmOpen, confirmation,
    openDetails, openCreate, openReject, closeDialog, askConfirmation, confirmBorrowAction, rejectBorrow, returnBook, createBorrow,
  }
}
