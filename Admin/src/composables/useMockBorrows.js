import { computed, ref, watch } from 'vue'
import { authState } from '@/services/authService'
import { ROLE_LIBRARIAN, ROLE_MANAGER } from '@/data/permissions'
import { mockStore } from '@/data/mock/mockStore'

export default function useMockBorrows() {
  const search = ref('')
  const statusFilter = ref('')
  const page = ref(1)
  const pageSize = 6
  const dialogOpen = ref(false)
  const dialogMode = ref('detail')
  const selectedBorrow = ref(null)
  const confirmOpen = ref(false)
  const confirmAction = ref('')
  const pendingBorrow = ref(null)
  const canManage = computed(() => [ROLE_MANAGER, ROLE_LIBRARIAN].includes(authState.user?.chucVu))
  const statusOptions = ['Chờ duyệt', 'Đang mượn', 'Hoàn tất', 'Đã từ chối', 'Đã hủy']

  const filteredBorrows = computed(() => {
    const needle = search.value.trim().toLocaleLowerCase('vi')
    return mockStore.borrows.filter((borrow) => {
      const matchesSearch = !needle || [borrow.maPhieu, borrow.maDocGia, borrow.tenDocGia].some((value) => value.toLocaleLowerCase('vi').includes(needle))
      return matchesSearch && (!statusFilter.value || borrow.trangThai === statusFilter.value)
    })
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(filteredBorrows.value.length / pageSize)))
  const pageRows = computed(() => filteredBorrows.value.slice((page.value - 1) * pageSize, page.value * pageSize))

  watch([search, statusFilter], () => { page.value = 1 })
  watch(pageCount, (count) => { if (page.value > count) page.value = count })

  function openDetails(borrow) {
    selectedBorrow.value = borrow
    dialogMode.value = 'detail'
    dialogOpen.value = true
  }

  function openReject(borrow) {
    selectedBorrow.value = borrow
    dialogMode.value = 'reject'
    dialogOpen.value = true
  }

  function closeDialog() { dialogOpen.value = false }

  function askConfirmation(action, borrow) {
    confirmAction.value = action
    pendingBorrow.value = borrow
    confirmOpen.value = true
  }

  function today() {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60_000
    return new Date(now.getTime() - offset).toISOString().slice(0, 10)
  }

  function confirmBorrowAction() {
    const borrow = pendingBorrow.value
    if (!canManage.value || !borrow) return
    if (confirmAction.value === 'approve' && borrow.trangThai === 'Chờ duyệt') {
      borrow.trangThai = 'Đang mượn'
      borrow.ngayMuon = today()
      borrow.chiTiet.forEach((book) => { book.trangThaiSach = 'Đang mượn' })
    }
    confirmOpen.value = false
    pendingBorrow.value = null
  }

  function rejectBorrow(reason) {
    if (!canManage.value || !selectedBorrow.value || selectedBorrow.value.trangThai !== 'Chờ duyệt' || !reason.trim()) return
    selectedBorrow.value.trangThai = 'Đã từ chối'
    selectedBorrow.value.lyDoTuChoi = reason.trim()
    selectedBorrow.value.chiTiet.forEach((book) => { book.trangThaiSach = 'Chưa giao' })
    dialogOpen.value = false
  }

  function returnBook(book) {
    const borrow = selectedBorrow.value
    if (!canManage.value || !borrow || borrow.trangThai !== 'Đang mượn' || !['Đang mượn', 'Quá hạn'].includes(book.trangThaiSach)) return
    book.trangThaiSach = 'Đã trả'
    book.ngayTra = today()
    if (borrow.chiTiet.every((item) => item.trangThaiSach === 'Đã trả')) borrow.trangThai = 'Hoàn tất'
  }

  const confirmation = computed(() => {
    return {
      title: 'Duyệt phiếu mượn?',
      confirmLabel: 'Duyệt phiếu',
      message: `Duyệt ${pendingBorrow.value?.maPhieu || 'phiếu'} trong bộ dữ liệu mẫu. Không gửi thao tác đến Backend.`,
      tone: 'primary',
    }
  })

  return {
    search, statusFilter, page, pageSize, statusOptions, filteredBorrows, pageRows, pageCount, canManage,
    dialogOpen, dialogMode, selectedBorrow, confirmOpen, confirmation,
    openDetails, openReject, closeDialog, askConfirmation, confirmBorrowAction, rejectBorrow, returnBook,
  }
}
