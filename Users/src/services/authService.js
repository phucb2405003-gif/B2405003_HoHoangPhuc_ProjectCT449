const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const AUTH_STORAGE_KEY = 'qlms-reader-session'

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

  if (typeof result.token !== 'string' || !result.token) {
    throw new Error('Máy chủ chưa trả về thông tin phiên đăng nhập hợp lệ.')
  }

  const { maTaiKhoan, tenDangNhap: accountName, loaiTaiKhoan } = result.user
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    token: result.token,
    user: { maTaiKhoan, tenDangNhap: accountName, loaiTaiKhoan },
  }))
}
