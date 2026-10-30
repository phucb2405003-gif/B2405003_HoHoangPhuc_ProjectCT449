import { computed, reactive, ref } from 'vue'
import { authState } from '@/services/authService'
import { entityStore } from '@/data/entityStore'

const fields = ['hoTenNV', 'diaChi', 'soDienThoai']

export default function useStaffProfile() {
  const code = computed(() => authState.user?.maTaiKhoan || '')
  const role = computed(() => authState.user?.chucVu || '')
  const form = reactive({ hoTenNV: '', diaChi: '', soDienThoai: '' })
  const errors = reactive({})
  const message = ref('')
  const messageType = ref('success')
  const savedSnapshot = ref(null)

  function loadProfile() {
    const source = Object.keys(entityStore.staffProfile).length ? entityStore.staffProfile : authState.user
    form.hoTenNV = source?.hoTen || ''
    form.diaChi = source?.diaChi || ''
    form.soDienThoai = source?.soDienThoai || ''
    savedSnapshot.value = Object.fromEntries(fields.map((key) => [key, form[key]]))
    Object.keys(errors).forEach((key) => delete errors[key])
    message.value = ''
  }

  function cancelChanges() {
    if (savedSnapshot.value) Object.assign(form, savedSnapshot.value)
    Object.keys(errors).forEach((key) => delete errors[key])
    message.value = ''
  }

  function saveChanges() {
    Object.keys(errors).forEach((key) => delete errors[key])
    if (!form.hoTenNV.trim()) errors.hoTenNV = 'Vui lòng nhập họ và tên.'
    if (form.soDienThoai.trim() && !/^[0-9+().\-\s]{9,15}$/.test(form.soDienThoai.trim())) errors.soDienThoai = 'Số điện thoại cần có từ 9 đến 15 chữ số.'
    if (Object.keys(errors).length) {
      messageType.value = 'error'
      message.value = 'Vui lòng kiểm tra lại thông tin.'
      return
    }

    const next = Object.fromEntries(fields.map((key) => [key, form[key].trim()]))
    Object.assign(entityStore.staffProfile, next)
    Object.assign(form, next)
    savedSnapshot.value = { ...next }
    messageType.value = 'success'
    message.value = 'Thông tin cá nhân đã được cập nhật trong phiên hiện tại.'
  }

  loadProfile()
  return { code, role, form, errors, message, messageType, cancelChanges, saveChanges }
}
