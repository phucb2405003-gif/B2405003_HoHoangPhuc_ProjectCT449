import { ref, unref, watch } from 'vue'

export default function useBorrowDialog({ open, mode, onReject, onCreate }) {
  const rejectReason = ref('')
  const rejectError = ref('')
  const readerCode = ref('')
  const bookCodesInput = ref('')
  const createError = ref('')
  const borrowVariants = { 'Đang chọn sách': 'neutral', 'Chờ duyệt': 'warning', 'Đã duyệt': 'info', 'Từ chối': 'danger', 'Hủy': 'neutral' }
  const bookVariants = { 'Đang chọn sách': 'neutral', 'Chờ duyệt': 'warning', 'Đang mượn': 'info', 'Đã trả': 'success', 'Từ chối': 'danger', 'Hủy': 'neutral' }

  watch(() => [unref(open), unref(mode)], () => {
    rejectReason.value = ''
    rejectError.value = ''
    createError.value = ''
    readerCode.value = ''
    bookCodesInput.value = ''
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
    const maDocGia = readerCode.value.trim()
    const maSach = bookCodesInput.value.split(/[\r\n,]+/).map((code) => code.trim()).filter(Boolean)
    if (!maDocGia) { createError.value = 'Vui lòng nhập mã độc giả.'; return }
    if (maSach.length < 1 || maSach.length > 5) { createError.value = 'Nhập từ 1 đến 5 mã sách.'; return }
    if (new Set(maSach).size !== maSach.length) { createError.value = 'Mã sách không được trùng lặp.'; return }
    onCreate({ maDocGia, maSach: [...maSach] })
  }

  return {
    rejectReason,
    rejectError,
    readerCode,
    bookCodesInput,
    createError,
    borrowVariants,
    bookVariants,
    submitRejection,
    submitCreate,
  }
}
