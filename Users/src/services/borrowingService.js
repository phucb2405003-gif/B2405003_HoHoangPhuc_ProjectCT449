import { API_BASE_URL } from './apiConfig'

async function request(path, token, options = {}, fallbackMessage = 'Không thể hoàn tất yêu cầu mượn sách.') {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const error = new Error(payload?.message || fallbackMessage)
    error.status = response.status
    throw error
  }

  return payload
}

export function getBook(maSach, token = null) {
  return request(`/api/books/${encodeURIComponent(maSach)}`, token, {}, 'Không thể tải thông tin sách.')
}

export function getBooks(token = null) {
  return request('/api/books', token, {}, 'Không thể tải danh sách sách.')
}

export function getMyBorrows(token) {
  return request('/api/borrows/mine', token)
}

export function getBorrowDetails(maPhieu, token) {
  return request(`/api/borrows/${encodeURIComponent(maPhieu)}/borrow-details`, token)
}

export function createBorrowWithBook(maSach, token) {
  return createBorrowWithBooks([maSach], token)
}

export function createBorrowWithBooks(maSachs, token) {
  return request('/api/borrows', token, {
    method: 'POST',
    body: JSON.stringify({ borrowDetails: maSachs.map((maSach) => ({ maSach })) }),
  })
}

export function submitBorrow(maPhieu, token) {
  return request(`/api/borrows/${encodeURIComponent(maPhieu)}/submit`, token, { method: 'PUT' })
}

export function deleteBorrow(maPhieu, token) {
  return request(`/api/borrows/${encodeURIComponent(maPhieu)}`, token, { method: 'DELETE' })
}

export function deleteBorrowDetail(maPhieu, maSach, token) {
  return request(
    `/api/borrows/${encodeURIComponent(maPhieu)}/borrow-details/${encodeURIComponent(maSach)}`,
    token,
    { method: 'DELETE' },
  )
}
