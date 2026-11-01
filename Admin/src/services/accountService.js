import apiClient, { ApiError } from './apiClient'
import { authState } from './authService'

const ACCOUNTS_PATH = '/api/accounts'

function normalizeAccount(account) {
  if (!account || typeof account !== 'object' || typeof account.maTaiKhoan !== 'string' || !account.maTaiKhoan.trim() || typeof account.tenDangNhap !== 'string' || typeof account.trangThai !== 'boolean') {
    throw new Error('Máy chủ trả về thông tin tài khoản không hợp lệ.')
  }
  const safeAccount = { ...account }
  delete safeAccount.password
  delete safeAccount.passwordHash
  delete safeAccount.password_hash
  delete safeAccount.matKhau
  delete safeAccount.initialPassword
  const code = safeAccount.maTaiKhoan
  const inferredType = code.startsWith('DG') ? 'Độc giả (suy ra từ mã DG)' : code.startsWith('NV') ? 'Nhân viên (suy ra từ mã NV)' : 'Không xác định'
  return { ...safeAccount, loaiTaiKhoanHienThi: safeAccount.loaiTaiKhoan || inferredType }
}

function translateAccountError(error, operation) {
  if (!(error instanceof ApiError)) return error
  if (operation === 'reset-password' && error.status === 400) return new Error(error.backendMessage || 'Mật khẩu mới không đáp ứng yêu cầu bảo mật.')
  if (operation === 'reset-password' && error.status === 404) return new Error(error.backendMessage || 'Không tìm thấy tài khoản cần đặt lại mật khẩu.')
  if (error.status === 400) return new Error(operation === 'create' ? 'Mã hồ sơ không hợp lệ hoặc hồ sơ liên kết không tồn tại.' : 'Yêu cầu tài khoản không hợp lệ.')
  if (error.status === 404) return new Error('Không tìm thấy tài khoản hoặc hồ sơ liên kết.')
  if (error.status === 409) return new Error('Tài khoản cho hồ sơ này đã tồn tại hoặc thông tin đang xung đột.')
  if (error.status === 503) return new Error('Hệ thống đang xử lý tạo tài khoản. Vui lòng thử lại sau.')
  return error
}

async function withAccountErrors(operation, callback) {
  try { return await callback() }
  catch (error) { throw translateAccountError(error, operation) }
}

export async function getAccounts() {
  return withAccountErrors('read', async () => {
    const result = await apiClient.get(ACCOUNTS_PATH)
    if (!Array.isArray(result)) throw new Error('Máy chủ trả về danh sách tài khoản không hợp lệ.')
    return result.map(normalizeAccount)
  })
}

export async function getAccount(maTaiKhoan) {
  return withAccountErrors('read', async () => normalizeAccount(await apiClient.get(`${ACCOUNTS_PATH}/${encodeURIComponent(maTaiKhoan)}`)))
}

export async function createAccountForProfile(maTaiKhoan) {
  return withAccountErrors('create', async () => {
    const account = await apiClient.post(ACCOUNTS_PATH, { maTaiKhoan })
    if (typeof account?.initialPassword !== 'string' || !account.initialPassword) {
      throw new Error('Không thể ghi nhận mật khẩu khởi tạo do máy chủ chưa trả đủ thông tin.')
    }
    return { account: normalizeAccount(account), initialPassword: account.initialPassword }
  })
}

export async function updateAccountStatus(maTaiKhoan, trangThai) {
  if (typeof trangThai !== 'boolean') throw new Error('Trạng thái tài khoản không hợp lệ.')
  return withAccountErrors('update', async () => normalizeAccount(await apiClient.put(
    `${ACCOUNTS_PATH}/${encodeURIComponent(maTaiKhoan)}`,
    { trangThai },
  )))
}

export async function resetAccountPassword(maTaiKhoan, password) {
  return withAccountErrors('reset-password', async () => normalizeAccount(await apiClient.put(
    `${ACCOUNTS_PATH}/${encodeURIComponent(maTaiKhoan)}`,
    { password },
  )))
}

export async function changeOwnPassword(currentPassword, newPassword) {
  return withAccountErrors('change-own-password', async () => {
    if (!authState.token) throw new Error('Vui lòng đăng nhập để đổi mật khẩu.')

    try {
      return await apiClient.put(`${ACCOUNTS_PATH}/me/password`, { currentPassword, newPassword })
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const backendMessage = error.backendMessage
        if (backendMessage === 'Mật khẩu hiện tại không chính xác.') {
          throw new Error('Mật khẩu hiện tại không chính xác.')
        }
        if (backendMessage.startsWith('Mật khẩu phải có ít nhất 8 ký tự') || backendMessage === 'Thông tin đổi mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại.') {
          throw new Error('Mật khẩu mới không đáp ứng yêu cầu: tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.')
        }
        throw new Error('Thông tin đổi mật khẩu chưa hợp lệ. Vui lòng kiểm tra lại.')
      }
      if (error instanceof ApiError && error.status >= 500) {
        throw new Error('Không thể đổi mật khẩu lúc này. Vui lòng thử lại sau.')
      }
      throw error
    }
  })
}
