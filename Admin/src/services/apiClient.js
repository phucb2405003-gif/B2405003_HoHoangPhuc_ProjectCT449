import { API_BASE_URL } from './apiConfig'
import { authState, expireStaffSession } from './authService'

export class ApiError extends Error {
  constructor(message, { status = 0, method = '', path = '', backendMessage = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.method = method
    this.path = path
    this.backendMessage = backendMessage
  }
}

function errorMessage(status, method, path) {
  if (status === 400) return 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.'
  if (status === 401) return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 404) return method === 'DELETE' ? 'Dữ liệu không còn tồn tại trên hệ thống. Danh sách được giữ nguyên.' : 'Không tìm thấy dữ liệu yêu cầu.'
  if (status === 409 && method === 'DELETE' && path.startsWith('/api/publishers/')) return 'Không thể xóa nhà xuất bản đang được sách sử dụng.'
  if (status === 409 && path.startsWith('/api/publishers')) return 'Tên nhà xuất bản đã tồn tại hoặc dữ liệu đang xung đột.'
  if (status === 409) return 'Dữ liệu đang xung đột với một thao tác khác.'
  if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.'
  if (status === 503 && method === 'DELETE' && path.startsWith('/api/publishers/')) return 'Hệ thống đang xử lý phiếu mượn. Vui lòng thử xóa lại sau.'
  if (status === 503) return 'Backend đang tạm thời không khả dụng. Vui lòng thử lại sau.'
  if (status >= 500) return 'Backend gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau.'
  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'
}

async function redirectAfterUnauthorized() {
  expireStaffSession()
  try {
    const { default: router } = await import('@/router')
    const current = router.currentRoute.value
    if (current.name !== 'login') {
      await router.replace({ name: 'login', query: { redirect: current.fullPath } })
    }
  } catch {
    // Auth state and stored session are already cleared if router navigation is unavailable.
  }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authState.token) headers.Authorization = `Bearer ${authState.token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new ApiError('Không thể kết nối đến Backend. Vui lòng kiểm tra kết nối rồi thử lại.', { method, path })
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    // Empty and non-JSON response bodies are allowed; HTTP status still determines success.
  }

  if (response.status === 401) await redirectAfterUnauthorized()
  if (!response.ok) {
    throw new ApiError(errorMessage(response.status, method, path), {
      status: response.status,
      method,
      path,
      backendMessage: typeof data?.message === 'string' ? data.message : '',
    })
  }

  return data
}

export const apiClient = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
}

export default apiClient
