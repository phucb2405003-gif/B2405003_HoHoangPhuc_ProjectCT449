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
    currentRecord.value = Object.fromEntries(config.fields.map((field) => {
      const firstOption = field.options?.[0] ?? (field.optionsFrom === 'publishers' ? mockStore.publishers[0]?.[field.optionValue] : undefined)
      const defaultValue = typeof firstOption === 'object' ? firstOption.value : firstOption
      return [field.key, field.defaultValue ?? defaultValue ?? '']
    }))
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

    const code = String(record[config.codeField] || '').trim().toLocaleLowerCase('vi')
    const duplicate = rows.value.some((row) => String(row[config.codeField]).toLocaleLowerCase('vi') === code && row[config.codeField] !== currentRecord.value[config.codeField])
    if (code && duplicate) errors[config.codeField] = 'Mã này đã tồn tại trong dữ liệu mẫu.'
    validationErrors.value = errors
    return Object.keys(errors).length === 0
  }

  function saveRecord(record) {
    if (!canManage.value || !validate(record)) return
    const normalized = { ...record }
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
    pendingStatusChange.value = row
    confirmOpen.value = true
  }

  function confirmStatusChange() {
    const row = pendingStatusChange.value
    const action = config.statusAction
    if (canManage.value && row && action) row[action.key] = row[action.key] === action.activeValue ? action.inactiveValue : action.activeValue
    pendingStatusChange.value = null
    confirmOpen.value = false
  }

  const confirmTitle = computed(() => {
    const statusAction = config.statusAction
    return pendingStatusChange.value?.[statusAction?.key] === statusAction?.activeValue ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'
  })
  const confirmMessage = computed(() => pendingStatusChange.value
    ? `Thao tác này chỉ thay đổi trạng thái mẫu của tài khoản ${pendingStatusChange.value.tenDangNhap}.`
    : '')
  const confirmLabel = computed(() => pendingStatusChange.value?.[config.statusAction?.key] === config.statusAction?.activeValue ? 'Khóa tài khoản' : 'Mở khóa')

  return {
    search, page, pageSize, filters, filterOptions, canManage, pageRows, filteredRows, pageCount,
    dialogMode, dialogOpen, currentRecord, validationErrors, publisherOptions,
    confirmOpen, confirmTitle, confirmMessage, confirmLabel,
    openCreate, openEdit, openDetail, closeDialog, saveRecord, requestStatusChange, confirmStatusChange,
  }
}
