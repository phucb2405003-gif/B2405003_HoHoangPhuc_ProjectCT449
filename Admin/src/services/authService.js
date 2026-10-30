import { reactive } from 'vue'
import { API_BASE_URL } from './apiConfig'

const AUTH_STORAGE_KEY = 'qlms-staff-session'

export const authState = reactive({ user: null, token: null, isAuthenticated: false, isChecking: false, initialized: false })
let authInitializationPromise = null

function removeStoredSession() {
  try { sessionStorage.removeItem(AUTH_STORAGE_KEY) } catch { /* Storage có thể bị chặn trong chế độ riêng tư. */ }
}

function clearAuthState() {
  authState.user = null
  authState.token = null
  authState.isAuthenticated = false
}

function normalizeStaff(user) {
  if (user?.loaiTaiKhoan !== 'NHANVIEN' || typeof user.maTaiKhoan !== 'string' || typeof user.tenDangNhap !== 'string') return null
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
  try { sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: staff })) } catch { /* Phiên tồn tại đến khi đóng trang nếu storage không dùng được. */ }
  return true
}

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    const user = normalizeStaff(session?.user)
    if (typeof session?.token !== 'string' || !session.token || !user) {
      removeStoredSession()
      return null
    }
    return { token: session.token, user }
  } catch {
    removeStoredSession()
    return null
  }
}

async function readResponse(response) {
  try { return await response.json() } catch { return null }
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
}

export function initializeAuth() {
  if (authInitializationPromise) return authInitializationPromise
  if (authState.initialized) return Promise.resolve()
  authState.isChecking = true
  authInitializationPromise = (async () => {
    const session = readStoredSession()
    if (!session) {
      clearAuthState()
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${session.token}` } })
      if (readStoredSession()?.token !== session.token) return
      if (response.status === 401) {
        removeStoredSession()
        clearAuthState()
        return
      }
      if (!response.ok) {
        // Không xác minh được thì khóa trang bảo vệ, giữ phiên để thử lại sau.
        clearAuthState()
        return
      }
      const result = await readResponse(response)
      const staff = normalizeStaff(result?.user)
      if (!staff) {
        removeStoredSession()
        clearAuthState()
        return
      }
      saveSession(session.token, staff)
    } catch {
      clearAuthState()
    } finally {
      authState.initialized = true
      authState.isChecking = false
      authInitializationPromise = null
    }
  })()
  return authInitializationPromise
}

export function logoutStaff() {
  removeStoredSession()
  clearAuthState()
  authState.initialized = true
}
