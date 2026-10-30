import { requestApi } from './apiRequest'

const FALLBACK_ERROR_MESSAGE = 'Không thể hoàn tất yêu cầu.'

export function getReaderProfile(maDocGia, token) {
  return requestApi(`/api/users/${encodeURIComponent(maDocGia)}`, {
    token,
    fallbackMessage: FALLBACK_ERROR_MESSAGE,
  })
}

export function updateMyReaderProfile(profile, token) {
  return requestApi('/api/users/me', {
    token,
    fallbackMessage: FALLBACK_ERROR_MESSAGE,
    options: {
      method: 'PUT',
      body: JSON.stringify(profile),
    },
  })
}

export function changeReaderPassword(currentPassword, newPassword, token) {
  return requestApi('/api/accounts/me/password', {
    token,
    fallbackMessage: FALLBACK_ERROR_MESSAGE,
    options: {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    },
  })
}
