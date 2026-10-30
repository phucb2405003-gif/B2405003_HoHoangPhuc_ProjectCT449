import { computed, reactive, ref } from 'vue'
import { authState } from '@/services/authService'
import { getMyEmployeeProfile, updateMyEmployeeProfile } from '@/services/employeeService'

const fields = ['hoTenNV', 'diaChi', 'soDienThoai']

export default function useStaffProfile() {
  const code = computed(() => authState.user?.maTaiKhoan || '')
  const role = computed(() => authState.user?.chucVu || '')
  const form = reactive({ hoTenNV: '', diaChi: '', soDienThoai: '' })
  const errors = reactive({})
  const message = ref('')
  const messageType = ref('success')
  const savedSnapshot = ref(null)
  const loading = ref(false)
  const updating = ref(false)
  const loadError = ref('')

  async function loadProfile() {
    loading.value = true
    loadError.value = ''
    Object.keys(errors).forEach((key) => delete errors[key])
    message.value = ''
    try {
      const profile = await getMyEmployeeProfile()
      if (!code.value || profile.maNhanVien !== code.value) {
        throw new Error('Backend trả về hồ sơ không khớp với nhân viên đang đăng nhập.')
      }
      Object.assign(form, {
        hoTenNV: profile.hoTenNV || '',
        diaChi: profile.diaChi || '',
        soDienThoai: profile.soDienThoai || '',
      })
      savedSnapshot.value = Object.fromEntries(fields.map((key) => [key, form[key]]))
    } catch (error) {
      loadError.value = error.message || 'Không thể tải hồ sơ nhân viên.'
    } finally {
      loading.value = false
    }
  }

  function cancelChanges() {
    if (savedSnapshot.value) Object.assign(form, savedSnapshot.value)
    Object.keys(errors).forEach((key) => delete errors[key])
    message.value = ''
  }

  async function saveChanges() {
    if (updating.value || loading.value || loadError.value || !savedSnapshot.value) return
    Object.keys(errors).forEach((key) => delete errors[key])
    if (!form.hoTenNV.trim()) errors.hoTenNV = 'Vui lòng nhập họ và tên.'
    if (form.soDienThoai.trim() && !/^[0-9+().\-\s]{9,15}$/.test(form.soDienThoai.trim())) errors.soDienThoai = 'Số điện thoại cần có từ 9 đến 15 chữ số.'
    if (Object.keys(errors).length) {
      messageType.value = 'error'
      message.value = 'Vui lòng kiểm tra lại thông tin.'
      return
    }

    updating.value = true
    message.value = ''
    try {
      const profile = await updateMyEmployeeProfile({
        hoTenNV: form.hoTenNV.trim(),
        diaChi: form.diaChi.trim(),
        soDienThoai: form.soDienThoai.trim(),
      })
      if (!code.value || profile.maNhanVien !== code.value) {
        throw new Error('Backend trả về hồ sơ không khớp với nhân viên đang đăng nhập.')
      }

      const next = Object.fromEntries(fields.map((key) => [key, profile[key] || '']))
      Object.assign(form, next)
      savedSnapshot.value = { ...next }
      messageType.value = 'success'
      message.value = 'Thông tin cá nhân đã được cập nhật thành công.'
    } catch (error) {
      messageType.value = 'error'
      message.value = error.message || 'Không thể cập nhật thông tin cá nhân.'
    } finally {
      updating.value = false
    }
  }

  loadProfile()
  return { code, role, form, errors, message, messageType, loading, updating, loadError, loadProfile, cancelChanges, saveChanges }
}
