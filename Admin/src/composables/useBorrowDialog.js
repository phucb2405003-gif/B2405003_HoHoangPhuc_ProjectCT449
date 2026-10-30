import { ref, unref, watch } from 'vue'

export default function useBorrowDialog({ open, mode, onReject, onCreate }) {
  const rejectReason = ref('')
  const rejectError = ref('')
  const readerCode = ref('')
  const selectedBookCodes = ref([])
  const createError = ref('')
  const borrowVariants = { 'Đang chọn sách': 'neutral', 'Chờ duyệt': 'warning', 'Đã duyệt': 'info', 'Từ chối': 'danger', 'Hủy': 'neutral' }
  const bookVariants = { 'Đang chọn sách': 'neutral', 'Chờ duyệt': 'warning', 'Đang mượn': 'info', 'Đã trả': 'success', 'Từ chối': 'danger', 'Hủy': 'neutral' }

  watch(() => [unref(open), unref(mode)], () => {
    rejectReason.value = ''
    rejectError.value = ''
    createError.value = ''
    readerCode.value = ''
    selectedBookCodes.value = []
  })

  function submitRejection() {
    if (!rejectReason.value.trim()) {
      rejectError.value = 'Vui lòng nhập lý do từ chối.'
      return
    }
    onReject(rejectReason.value)
  }

  function submitCreate() {
    createError.value = ''
    if (!readerCode.value) { createError.value = 'Vui lòng chọn độc giả.'; return }
    if (selectedBookCodes.value.length < 1 || selectedBookCodes.value.length > 5) { createError.value = 'Chọn từ 1 đến 5 cuốn sách.'; return }
    onCreate({ maDocGia: readerCode.value, maSach: [...selectedBookCodes.value] })
  }

  return {
    rejectReason,
    rejectError,
    readerCode,
    selectedBookCodes,
    createError,
    borrowVariants,
    bookVariants,
    submitRejection,
    submitCreate,
  }
}
