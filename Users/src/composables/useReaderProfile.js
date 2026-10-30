import { computed, ref } from 'vue'
import { getReaderProfile, updateMyReaderProfile } from '@/services/readerProfileService'

export default function useReaderProfile({
  readerId,
  getAccessToken,
  isReaderAccount,
  handleUnauthorized,
  redirectToLogin,
}) {
  const profile = ref(null)
  const profileLoading = ref(true)
  const profileError = ref('')
  const isProfileEditOpen = ref(false)
  const isUpdatingProfile = ref(false)
  const profileUpdateError = ref('')
  const profileUpdateNotice = ref('')
  const profileForm = ref({ hoLot: '', ten: '', ngaySinh: '', phai: null, diaChi: '', dienThoai: '' })

  const fullName = computed(() => [profile.value?.hoLot, profile.value?.ten]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim())
    .join(' '))

  async function loadProfile() {
    const token = getAccessToken()
    if (!token || !readerId.value || !isReaderAccount()) {
      profileLoading.value = false
      await redirectToLogin()
      return
    }

    profileLoading.value = true
    profileError.value = ''
    try {
      const result = await getReaderProfile(readerId.value, token)
      if (result?.maDocGia !== readerId.value) {
        throw new Error('Thông tin hồ sơ không khớp với tài khoản đang đăng nhập.')
      }
      profile.value = result
    } catch (error) {
      if (await handleUnauthorized(error)) return
      profileError.value = error.message || 'Không thể tải thông tin cá nhân.'
    } finally {
      profileLoading.value = false
    }
  }

  function openProfileEditor() {
    const date = profile.value?.ngaySinh ? new Date(profile.value.ngaySinh) : null
    profileForm.value = {
      hoLot: profile.value?.hoLot || '',
      ten: profile.value?.ten || '',
      ngaySinh: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '',
      phai: typeof profile.value?.phai === 'boolean' ? profile.value.phai : null,
      diaChi: profile.value?.diaChi || '',
      dienThoai: profile.value?.dienThoai || '',
    }
    profileUpdateError.value = ''
    profileUpdateNotice.value = ''
    isProfileEditOpen.value = true
  }

  function cancelProfileEdit() {
    if (isUpdatingProfile.value) return
    isProfileEditOpen.value = false
    profileUpdateError.value = ''
    profileForm.value = { hoLot: '', ten: '', ngaySinh: '', phai: null, diaChi: '', dienThoai: '' }
  }

  async function saveReaderProfile() {
    if (isUpdatingProfile.value) return
    profileUpdateError.value = ''
    profileUpdateNotice.value = ''

    const form = profileForm.value
    if (typeof form.hoLot !== 'string' || !form.hoLot.trim() || typeof form.ten !== 'string' || !form.ten.trim()) {
      profileUpdateError.value = 'Vui lòng nhập họ lót và tên.'
      return
    }
    if (typeof form.phai !== 'boolean') {
      profileUpdateError.value = 'Vui lòng chọn giới tính.'
      return
    }
    if (form.ngaySinh && !/^\d{4}-\d{2}-\d{2}$/.test(form.ngaySinh)) {
      profileUpdateError.value = 'Ngày sinh không hợp lệ.'
      return
    }

    const payload = {
      hoLot: form.hoLot.trim(),
      ten: form.ten.trim(),
      phai: form.phai,
      ...(form.ngaySinh ? { ngaySinh: form.ngaySinh } : {}),
      ...(form.diaChi.trim() ? { diaChi: form.diaChi.trim() } : {}),
      ...(form.dienThoai.trim() ? { dienThoai: form.dienThoai.trim() } : {}),
    }
    const token = getAccessToken()
    if (!token) {
      await redirectToLogin()
      return
    }

    isUpdatingProfile.value = true
    try {
      const updated = await updateMyReaderProfile(payload, token)
      if (!updated || updated.maDocGia !== readerId.value) {
        throw new Error('Máy chủ không xác nhận hồ sơ độc giả sau cập nhật.')
      }
      profile.value = { ...profile.value, ...updated }
      isProfileEditOpen.value = false
      profileUpdateNotice.value = 'Cập nhật thông tin cá nhân thành công.'
    } catch (error) {
      if (!await handleUnauthorized(error)) {
        profileUpdateError.value = error.message || 'Không thể cập nhật thông tin cá nhân.'
      }
    } finally {
      isUpdatingProfile.value = false
    }
  }

  return {
    profile,
    profileLoading,
    profileError,
    isProfileEditOpen,
    isUpdatingProfile,
    profileUpdateError,
    profileUpdateNotice,
    profileForm,
    fullName,
    loadProfile,
    openProfileEditor,
    cancelProfileEdit,
    saveReaderProfile,
  }
}
