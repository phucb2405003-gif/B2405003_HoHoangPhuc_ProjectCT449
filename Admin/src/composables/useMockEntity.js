import { computed, reactive, ref, watch } from 'vue'
import { authState } from '@/services/authService'
import { mockStore } from '@/data/mock/mockStore'

export default function useMockEntity(config) {
  const search = ref('')
  const page = ref(1)
  const pageSize = 6
  const filters = reactive(Object.fromEntries((config.filters || []).map((filter) => [filter.key, ''])))
  const dialogMode = ref('detail')
  const dialogOpen = ref(false)
  const currentRecord = ref({})
  const validationErrors = ref({})
  const confirmOpen = ref(false)
  const pendingStatusChange = ref(null)
  const pendingDeletion = ref(null)
  const actionNotice = ref('')

  const canManage = computed(() => config.writeRoles.includes(authState.user?.chucVu))
  const rows = computed(() => mockStore[config.key])
  const filterOptions = computed(() => Object.fromEntries((config.filters || []).map((filter) => {
    const values = [...new Set(rows.value.map((row) => row[filter.key]))]
    return [filter.key, values.map((value) => filter.boolean ? { label: value ? 'Đang hoạt động' : 'Đã khóa', value } : { label: value, value })]
  })))
  const filteredRows = computed(() => {
    const needle = search.value.trim().toLocaleLowerCase('vi')
    return rows.value.filter((row) => {
      const matchesSearch = !needle || config.searchKeys.some((key) => String(row[key] ?? '').toLocaleLowerCase('vi').includes(needle))
      const matchesFilters = (config.filters || []).every((filter) => filters[filter.key] === '' || String(row[filter.key]) === String(filters[filter.key]))
      return matchesSearch && matchesFilters
    })
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
  const pageRows = computed(() => filteredRows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const publisherOptions = computed(() => mockStore.publishers)

  watch([search, filters], () => { page.value = 1 }, { deep: true })
  watch(pageCount, (count) => { if (page.value > count) page.value = count })

  function openCreate() {
    validationErrors.value = {}
    const values = Object.fromEntries(config.fields.map((field) => {
      const firstOption = field.options?.[0] ?? (field.optionsFrom === 'publishers' ? mockStore.publishers[0]?.[field.optionValue] : undefined)
      const defaultValue = typeof firstOption === 'object' ? firstOption.value : firstOption
      return [field.key, field.defaultValue ?? defaultValue ?? '']
    }))
    for (const key of config.mockFields || []) values[key] = ''
    values[config.codeField] = generateCode()
    if (config.key === 'books') values.soQuyenConLai = values.soQuyen
    currentRecord.value = values
    dialogMode.value = 'create'
    dialogOpen.value = true
  }

  function openEdit(row) {
    validationErrors.value = {}
    currentRecord.value = { ...row }
    dialogMode.value = 'edit'
    dialogOpen.value = true
  }

  function openDetail(row) {
    currentRecord.value = row
    dialogMode.value = 'detail'
    dialogOpen.value = true
  }

  function closeDialog() {
    dialogOpen.value = false
    validationErrors.value = {}
  }

  function validate(record) {
    const errors = {}
    for (const field of config.fields) {
      const value = record[field.key]
      if (field.required && (value === '' || value === null || value === undefined)) {
        errors[field.key] = 'Vui lòng nhập thông tin này.'
      } else if (field.required && typeof value === 'string' && !value.trim()) {
        errors[field.key] = 'Vui lòng nhập thông tin này.'
      } else if (field.minLength && String(value ?? '').trim().length < field.minLength) {
        errors[field.key] = `Tối thiểu ${field.minLength} ký tự.`
      } else if (field.type === 'number' && value !== '' && (Number(value) < field.min || Number(value) > field.max)) {
        errors[field.key] = `Giá trị phải từ ${field.min} đến ${field.max ?? 'không giới hạn'}.`
      }
    }

    if (config.key === 'books' && Number(record.soQuyenConLai) > Number(record.soQuyen)) {
      errors.soQuyenConLai = 'Số lượng khả dụng không được vượt quá số lượng tối đa.'
    }
    const reasonField = config.statusReasonFields?.[record.trangThai]
    if (reasonField && !String(record[reasonField] || '').trim()) {
      errors[reasonField] = `Vui lòng nhập lý do ${record.trangThai.toLocaleLowerCase('vi')}.`
    }

    const code = String(record[config.codeField] || '').trim().toLocaleLowerCase('vi')
    const duplicate = rows.value.some((row) => String(row[config.codeField]).toLocaleLowerCase('vi') === code && row[config.codeField] !== currentRecord.value[config.codeField])
    if (code && duplicate) errors[config.codeField] = 'Mã này đã tồn tại trong dữ liệu mẫu.'
    validationErrors.value = errors
    return Object.keys(errors).length === 0
  }

  function saveRecord(record) {
    if (!canManage.value || !validate(record)) return
    const normalized = Object.fromEntries(config.fields.map((field) => [field.key, record[field.key]]))
    for (const key of config.mockFields || []) normalized[key] = String(record[key] || '').trim()
    normalized[config.codeField] = currentRecord.value[config.codeField]
    for (const field of config.fields) {
      if (field.type === 'number' && normalized[field.key] !== '') normalized[field.key] = Number(normalized[field.key])
    }
    if (dialogMode.value === 'create') mockStore[config.key].unshift(normalized)
    else {
      const index = mockStore[config.key].findIndex((row) => row[config.codeField] === currentRecord.value[config.codeField])
      if (index >= 0) Object.assign(mockStore[config.key][index], normalized)
    }
    page.value = 1
    closeDialog()
  }

  function requestStatusChange(row) {
    pendingDeletion.value = null
    pendingStatusChange.value = row
    confirmOpen.value = true
  }

  function generateCode() {
    const existingCodes = rows.value.map((row) => String(row[config.codeField] || ''))
    const match = existingCodes.find((code) => /\d+$/.test(code))?.match(/^(.*?)(\d+)$/)
    if (!match) return ''
    const [, prefix, digits] = match
    const next = Math.max(...existingCodes.map((code) => Number(code.match(/(\d+)$/)?.[1] || 0))) + 1
    return `${prefix}${String(next).padStart(digits.length, '0')}`
  }

  function requestDelete(row) {
    actionNotice.value = ''
    pendingStatusChange.value = null
    pendingDeletion.value = row
    confirmOpen.value = true
  }

  function confirmStatusChange() {
    if (pendingDeletion.value) {
      if (canManage.value) {
        const index = mockStore[config.key].findIndex((item) => item[config.codeField] === pendingDeletion.value[config.codeField])
        if (index >= 0) mockStore[config.key].splice(index, 1)
        actionNotice.value = `Đã xóa sách ${pendingDeletion.value.maSach} khỏi dữ liệu mẫu.`
      }
      pendingDeletion.value = null
      confirmOpen.value = false
      return
    }
    const row = pendingStatusChange.value
    const action = config.statusAction
    if (canManage.value && row && action) row[action.key] = row[action.key] === action.activeValue ? action.inactiveValue : action.activeValue
    pendingStatusChange.value = null
    confirmOpen.value = false
  }

  function closeConfirmation() {
    confirmOpen.value = false
    pendingDeletion.value = null
    pendingStatusChange.value = null
  }

  const confirmTitle = computed(() => {
    if (pendingDeletion.value) return 'Xóa sách khỏi dữ liệu mẫu?'
    const statusAction = config.statusAction
    return pendingStatusChange.value?.[statusAction?.key] === statusAction?.activeValue ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'
  })
  const confirmMessage = computed(() => pendingStatusChange.value
    ? `Thao tác này chỉ thay đổi trạng thái mẫu của tài khoản ${pendingStatusChange.value.tenDangNhap}.`
    : pendingDeletion.value ? `Xác nhận xóa “${pendingDeletion.value.tenSach}” (${pendingDeletion.value[config.codeField]}). Thao tác này chỉ xóa dữ liệu mẫu; sách đã có lịch sử mượn trả không thể xóa khi kết nối Backend.` : '')
  const confirmLabel = computed(() => pendingDeletion.value ? 'Xóa sách' : pendingStatusChange.value?.[config.statusAction?.key] === config.statusAction?.activeValue ? 'Khóa tài khoản' : 'Mở khóa')

  return {
    search, page, pageSize, filters, filterOptions, canManage, pageRows, filteredRows, pageCount,
    dialogMode, dialogOpen, currentRecord, validationErrors, publisherOptions,
    confirmOpen, confirmTitle, confirmMessage, confirmLabel, actionNotice,
    openCreate, openEdit, openDetail, closeDialog, saveRecord, requestStatusChange, requestDelete, confirmStatusChange, closeConfirmation,
  }
}
