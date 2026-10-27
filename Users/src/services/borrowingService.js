import { API_BASE_URL } from './apiConfig'

async function request(path, token, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
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
    const error = new Error(payload?.message || 'Không thể hoàn tất yêu cầu mượn sách.')
    error.status = response.status
    throw error
  }

  return payload
}

export function getBook(maSach, token) {
  return request(`/api/books/${encodeURIComponent(maSach)}`, token)
}

export function getMyBorrows(token) {
  return request('/api/borrows/mine', token)
}

export function getBorrowDetails(maPhieu, token) {
  return request(`/api/borrows/${encodeURIComponent(maPhieu)}/borrow-details`, token)
}

export function createBorrowWithBook(maSach, token) {
  return request('/api/borrows', token, {
    method: 'POST',
    body: JSON.stringify({ borrowDetails: [{ maSach }] }),
  })
}
