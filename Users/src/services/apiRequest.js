import { API_BASE_URL } from './apiConfig'

const NETWORK_ERROR_MESSAGE = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'

export async function requestApi(path, {
  token,
  options = {},
  fallbackMessage = 'Không thể hoàn tất yêu cầu mượn sách.',
} = {}) {
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
    throw new Error(NETWORK_ERROR_MESSAGE)
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
