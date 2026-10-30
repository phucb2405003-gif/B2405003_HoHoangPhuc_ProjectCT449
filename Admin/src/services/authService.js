import { reactive } from 'vue'
import { API_BASE_URL } from './apiConfig'

const AUTH_STORAGE_KEY = 'qlms-staff-session'

export const authState = reactive({
  user: null,
  token: null,
  isAuthenticated: false,
  isChecking: false,
  initialized: false,
  verificationError: '',
  canRetryVerification: false,
})

let authInitializationPromise = null

function removeStoredSession() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Storage có thể bị chặn trong chế độ riêng tư.
  }
}

function clearAuthState() {
  authState.user = null
  authState.token = null
  authState.isAuthenticated = false
}

function normalizeStaff(user) {
  if (
    user?.loaiTaiKhoan !== 'NHANVIEN' ||
    typeof user.maTaiKhoan !== 'string' ||
    typeof user.tenDangNhap !== 'string'
  ) return null

  return {
    maTaiKhoan: user.maTaiKhoan,
    tenDangNhap: user.tenDangNhap,
    loaiTaiKhoan: 'NHANVIEN',
    chucVu: typeof user.chucVu === 'string' ? user.chucVu : null,
  }
}

function saveSession(token, user) {
  const staff = normalizeStaff(user)
  if (typeof token !== 'string' || !token || !staff) return false

  authState.token = token
  authState.user = staff
  authState.isAuthenticated = true
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: staff }))
  } catch {
    // Phiên tồn tại đến khi đóng trang nếu storage không dùng được.
  }
  return true
}

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (typeof session?.token !== 'string' || !session.token) {
      removeStoredSession()
      return null
    }
    // Chỉ lấy token từ session; danh tính và chức vụ luôn lấy lại từ Backend.
    return { token: session.token }
  } catch {
    removeStoredSession()
    return null
  }
}

async function readResponse(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function setVerificationFailure(message, canRetry) {
  clearAuthState()
  authState.verificationError = message
  authState.canRetryVerification = canRetry
}

function loginError(response, result) {
  const message = String(result?.message || '').toLocaleLowerCase('vi')
  if (response.status === 429) return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.'
  if (response.status === 401 && message.includes('khoa')) return 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'
  if (response.status === 401) return 'Tên đăng nhập hoặc mật khẩu không chính xác.'
  if (response.status === 400) return 'Vui lòng nhập tên đăng nhập và mật khẩu.'
  return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
}

export async function loginStaff(tenDangNhap, password) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenDangNhap, password }),
    })
  } catch {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.')
  }

  const result = await readResponse(response)
  if (!response.ok || result?.success !== true) throw new Error(loginError(response, result))
  if (!normalizeStaff(result.user)) throw new Error('Tài khoản này không thuộc khu vực nhân viên.')
  if (!saveSession(result.token, result.user)) throw new Error('Máy chủ chưa trả về phiên đăng nhập hợp lệ.')
  authState.initialized = true
  authState.verificationError = ''
  authState.canRetryVerification = false
}

export function initializeAuth({ retry = false } = {}) {
  if (authInitializationPromise) return authInitializationPromise
  if (authState.initialized && !retry) return Promise.resolve()

  authState.isChecking = true
  authState.verificationError = ''
  authState.canRetryVerification = false

  // Tạo chuỗi Promise trước khi chạy logic để cả nhánh không session cũng luôn dọn state an toàn.
  const initialization = Promise.resolve().then(async () => {
    const session = readStoredSession()
    if (!session) {
      removeStoredSession()
      clearAuthState()
      return
    }

    let response
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
    } catch {
      setVerificationFailure('Không thể kết nối để xác minh phiên. Kiểm tra Backend rồi thử lại.', true)
      return
    }

    if (response.status === 401) {
      removeStoredSession()
      setVerificationFailure('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.', false)
      return
    }

    if (!response.ok) {
      setVerificationFailure('Máy chủ chưa thể xác minh phiên. Vui lòng thử lại sau.', true)
      return
    }

    const result = await readResponse(response)
    const staff = normalizeStaff(result?.user)
    if (!staff) {
      removeStoredSession()
      setVerificationFailure('Backend không trả về phiên nhân viên hợp lệ. Vui lòng đăng nhập lại.', false)
      return
    }

    if (readStoredSession()?.token !== session.token) return
    saveSession(session.token, staff)
  }).catch(() => {
    setVerificationFailure('Đã xảy ra lỗi khi xác minh phiên. Vui lòng thử lại.', true)
  }).finally(() => {
    authState.initialized = true
    authState.isChecking = false
    if (authInitializationPromise === initialization) authInitializationPromise = null
  })

  authInitializationPromise = initialization
  return initialization
}

export function logoutStaff() {
  removeStoredSession()
  clearAuthState()
  authState.verificationError = ''
  authState.canRetryVerification = false
  authState.initialized = true
}
