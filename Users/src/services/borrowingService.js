import { requestApi } from './apiRequest'

export function getBook(maSach, token = null) {
  return requestApi(`/api/books/${encodeURIComponent(maSach)}`, {
    token,
    fallbackMessage: 'Không thể tải thông tin sách.',
  })
}

export function getBooks(token = null) {
  return requestApi('/api/books', {
    token,
    fallbackMessage: 'Không thể tải danh sách sách.',
  })
}

export function getMyBorrows(token) {
  return requestApi('/api/borrows/mine', { token })
}

export function getBorrowDetails(maPhieu, token) {
  return requestApi(`/api/borrows/${encodeURIComponent(maPhieu)}/borrow-details`, { token })
}

export function createBorrowWithBook(maSach, token) {
  return createBorrowWithBooks([maSach], token)
}

export function createBorrowWithBooks(maSachs, token) {
  return requestApi('/api/borrows', {
    token,
    options: {
      method: 'POST',
      body: JSON.stringify({ borrowDetails: maSachs.map((maSach) => ({ maSach })) }),
    },
  })
}

export function submitBorrow(maPhieu, token) {
  return requestApi(`/api/borrows/${encodeURIComponent(maPhieu)}/submit`, {
    token,
    options: { method: 'PUT' },
  })
}

export function deleteBorrow(maPhieu, token) {
  return requestApi(`/api/borrows/${encodeURIComponent(maPhieu)}`, {
    token,
    options: { method: 'DELETE' },
  })
}

export function deleteBorrowDetail(maPhieu, maSach, token) {
  return requestApi(
    `/api/borrows/${encodeURIComponent(maPhieu)}/borrow-details/${encodeURIComponent(maSach)}`,
    { token, options: { method: 'DELETE' } },
  )
}
