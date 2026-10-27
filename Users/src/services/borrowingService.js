const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'Không thể hoàn tất yêu cầu mượn sách.')
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
