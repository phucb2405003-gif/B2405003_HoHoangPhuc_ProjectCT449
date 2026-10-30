import apiClient from './apiClient'

const BORROWS_PATH = '/api/borrows'

function normalizeBorrow(borrow) {
  if (!borrow || typeof borrow !== 'object' || Array.isArray(borrow) || typeof borrow.maPhieu !== 'string' || !borrow.maPhieu.trim()) {
    throw new Error('Backend trả về thông tin phiếu mượn không hợp lệ.')
  }
  return { ...borrow, maPhieu: borrow.maPhieu.trim() }
}

function explainBorrowError(error) {
  if (!error?.status) return error
  const backend = error.backendMessage?.trim()
  const messages = {
    400: 'Phiếu hoặc trạng thái hiện tại không hợp lệ.',
    403: 'Bạn không có quyền thực hiện thao tác này hoặc độc giả không đủ điều kiện mượn.',
    404: 'Phiếu hoặc sách trong phiếu không còn tồn tại.',
    409: 'Dữ liệu đang xung đột với tình trạng hiện tại của phiếu hoặc sách.',
    503: 'Backend chưa thể hoàn tất thao tác an toàn. Dữ liệu trên giao diện được giữ nguyên.',
  }
  error.message = backend || messages[error.status] || error.message
  return error
}

async function run(request) {
  try { return await request() } catch (error) { throw explainBorrowError(error) }
}

export async function getBorrows() {
  return run(async () => {
    const result = await apiClient.get(BORROWS_PATH)
    if (!Array.isArray(result)) throw new Error('Backend trả về danh sách phiếu mượn không hợp lệ.')
    return result.map(normalizeBorrow)
  })
}

export async function getBorrow(maPhieu) {
  return run(async () => normalizeBorrow(await apiClient.get(`${BORROWS_PATH}/${encodeURIComponent(maPhieu)}`)))
}

export async function getBorrowDetails(maPhieu) {
  return run(async () => {
    const result = await apiClient.get(`${BORROWS_PATH}/${encodeURIComponent(maPhieu)}/borrow-details`)
    if (!Array.isArray(result)) throw new Error('Backend trả về danh sách sách trong phiếu không hợp lệ.')
    return result
  })
}

export function createDirectBorrow({ maDocGia, maSach }) {
  return run(async () => normalizeBorrow(await apiClient.post(BORROWS_PATH, {
    maDocGia,
    borrowDetails: maSach.map((code) => ({ maSach: code })),
  })))
}

export function approveBorrow(maPhieu) {
  return run(async () => {
    const result = await apiClient.put(`${BORROWS_PATH}/${encodeURIComponent(maPhieu)}/approve`)
    return { ...result, borrow: normalizeBorrow(result?.borrow) }
  })
}

export function rejectBorrow(maPhieu, lyDoTuChoi) {
  return run(async () => {
    const result = await apiClient.put(`${BORROWS_PATH}/${encodeURIComponent(maPhieu)}/reject`, { lyDoTuChoi })
    return { ...result, borrow: normalizeBorrow(result?.borrow) }
  })
}

export function returnBorrowBook(maPhieu, maSach) {
  return run(async () => {
    const result = await apiClient.put(`${BORROWS_PATH}/${encodeURIComponent(maPhieu)}/return/${encodeURIComponent(maSach)}`)
    return { ...result, borrow: normalizeBorrow(result?.borrow), detail: result?.detail }
  })
}
