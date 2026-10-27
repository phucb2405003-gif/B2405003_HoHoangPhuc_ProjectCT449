import { reactive } from 'vue'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const AUTH_STORAGE_KEY = 'qlms-reader-session'

export const authState = reactive({
  user: null,
  readerName: null,
  accountActive: false,
  isAuthenticated: false,
  isChecking: false,
  initialized: false,
})

let profileRequestVersion = 0

function setReaderState(user) {
  authState.user = {
    maTaiKhoan: user.maTaiKhoan,
    tenDangNhap: user.tenDangNhap,
    loaiTaiKhoan: 'DOCGIA',
  }
  authState.readerName = null
  // Login and /api/auth/me succeed only after Backend confirms account.trangThai === true.
  authState.accountActive = true
  authState.isAuthenticated = true
}

function clearReaderState() {
  profileRequestVersion += 1
  authState.user = null
  authState.readerName = null
  authState.accountActive = false
  authState.isAuthenticated = false
}

function removeStoredSession() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function saveSession(token, user) {
  const session = {
    token,
    user: {
      maTaiKhoan: user.maTaiKhoan,
      tenDangNhap: user.tenDangNhap,
      loaiTaiKhoan: 'DOCGIA',
    },
  }

  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // The API response still authenticates this page until it is closed.
  }

  setReaderState(session.user)
  authState.initialized = true
  void loadReaderProfile(token, user.maTaiKhoan)
}

async function loadReaderProfile(token, maDocGia) {
  const requestVersion = ++profileRequestVersion
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(maDocGia)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (requestVersion !== profileRequestVersion) return
    if (response.status === 401 || response.status === 404) {
      removeStoredSession()
      clearReaderState()
      return
    }
    if (!response.ok) return

    const profile = await response.json()
    if (requestVersion !== profileRequestVersion || profile?.maDocGia !== maDocGia) return

    const fullName = [profile.hoLot, profile.ten]
      .filter((part) => typeof part === 'string' && part.trim())
      .map((part) => part.trim())
      .join(' ')
    authState.readerName = fullName || null
  } catch {
    // Keep the verified session and use the login name when the profile request is unavailable.
  }
}

function readStoredSession() {
  let rawSession
  try {
    rawSession = sessionStorage.getItem(AUTH_STORAGE_KEY)
  } catch {
    return null
  }
  if (!rawSession) return null

  try {
    const session = JSON.parse(rawSession)
    if (
      typeof session?.token !== 'string' || !session.token ||
      session.user?.loaiTaiKhoan !== 'DOCGIA' ||
      typeof session.user.maTaiKhoan !== 'string' ||
      typeof session.user.tenDangNhap !== 'string'
    ) {
      removeStoredSession()
      return null
    }
    return session
  } catch {
    removeStoredSession()
    return null
  }
}

export async function loginReader(tenDangNhap, password) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenDangNhap, password }),
    })
  } catch {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(response.ok ? 'Máy chủ trả về dữ liệu không hợp lệ.' : 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  }

  if (!response.ok || result?.success !== true) {
    const message = String(result?.message || '').toLocaleLowerCase('vi')
    if (response.status === 401 && message.includes('khoa')) {
      throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ thư viện để được hỗ trợ.')
    }
    if (response.status === 401) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.')
    }
    if (response.status === 400) {
      throw new Error('Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.')
    }
    if (response.status === 429) {
      throw new Error('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ và thử lại.')
    }
    throw new Error('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  }

  if (result.user?.loaiTaiKhoan !== 'DOCGIA') {
    throw new Error('Tài khoản này không thuộc khu vực độc giả.')
  }

  if (
    typeof result.token !== 'string' || !result.token ||
    typeof result.user.maTaiKhoan !== 'string' ||
    typeof result.user.tenDangNhap !== 'string'
  ) {
    throw new Error('Máy chủ chưa trả về thông tin phiên đăng nhập hợp lệ.')
  }

  saveSession(result.token, result.user)
}

export async function initializeAuth() {
  if (authState.isChecking || (authState.initialized && authState.isAuthenticated)) return

  authState.isChecking = true
  const session = readStoredSession()
  if (!session) {
    clearReaderState()
    authState.initialized = true
    authState.isChecking = false
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })

    if (response.status === 401) {
      removeStoredSession()
      clearReaderState()
      return
    }

    if (!response.ok) {
      clearReaderState()
      return
    }

    const result = await response.json()
    const user = result?.user
    if (
      user?.loaiTaiKhoan !== 'DOCGIA' ||
      typeof user.maTaiKhoan !== 'string' ||
      typeof user.tenDangNhap !== 'string'
    ) {
      removeStoredSession()
      clearReaderState()
      return
    }

    saveSession(session.token, user)
  } catch {
    // Fail closed in the UI; keep the session so a temporary outage can be retried after reload.
    clearReaderState()
  } finally {
    authState.initialized = true
    authState.isChecking = false
  }
}

export function logoutReader() {
  removeStoredSession()
  clearReaderState()
  authState.initialized = true
}
