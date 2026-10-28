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
    const error = new Error(payload?.message || 'Không thể hoàn tất yêu cầu.')
    error.status = response.status
    throw error
  }

  return payload
}

export function getReaderProfile(maDocGia, token) {
  return request(`/api/users/${encodeURIComponent(maDocGia)}`, token)
}

export function updateMyReaderProfile(profile, token) {
  return request('/api/users/me', token, {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}

export function changeReaderPassword(currentPassword, newPassword, token) {
  return request('/api/accounts/me/password', token, {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
