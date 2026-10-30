import { computed, onMounted, reactive, ref, watch } from 'vue'
import { authState } from '@/services/authService'
import { entityStore } from '@/data/entityStore'
import { createPublisher, deletePublisher, getPublishers, updatePublisher } from '@/services/publisherService'

export default function useEntityManagement(config) {
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
  const isPublisher = config.key === 'publishers'
  const publisherRows = ref([])
  const loading = ref(false)
  const loadError = ref('')
  const operationError = ref('')
  const isSaving = ref(false)
  const isDeleting = ref(false)

  const canManage = computed(() => config.writeRoles.includes(authState.user?.chucVu))
  const rows = computed(() => isPublisher ? publisherRows.value : entityStore[config.key])
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
  const publisherOptions = computed(() => entityStore.publishers)

  watch([search, filters], () => { page.value = 1 }, { deep: true })
  watch(pageCount, (count) => { if (page.value > count) page.value = count })

  async function loadPublishers() {
    loading.value = true
    loadError.value = ''
    operationError.value = ''
    try {
      publisherRows.value = await getPublishers()
    } catch (error) {
      publisherRows.value = []
      loadError.value = error.message || 'Không thể tải danh sách nhà xuất bản.'
    } finally {
      loading.value = false
    }
  }

  if (isPublisher) onMounted(loadPublishers)

  function openCreate() {
    validationErrors.value = {}
    operationError.value = ''
    actionNotice.value = ''
    const values = Object.fromEntries(config.fields.map((field) => {
      const firstOption = field.options?.[0] ?? (field.optionsFrom === 'publishers' ? entityStore.publishers[0]?.[field.optionValue] : undefined)
      const defaultValue = typeof firstOption === 'object' ? firstOption.value : firstOption
      return [field.key, field.defaultValue ?? defaultValue ?? '']
    }))
    for (const key of config.additionalFields || []) values[key] = ''
    if (!isPublisher) values[config.codeField] = generateCode()
    if (config.key === 'books') values.soQuyenConLai = values.soQuyen
    currentRecord.value = values
    dialogMode.value = 'create'
    dialogOpen.value = true
  }

  function openEdit(row) {
    validationErrors.value = {}
    operationError.value = ''
    actionNotice.value = ''
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
    if (code && duplicate) errors[config.codeField] = 'Mã này đã tồn tại.'
    validationErrors.value = errors
    return Object.keys(errors).length === 0
  }

  async function saveRecord(record) {
    if (!canManage.value || !validate(record)) return
    if (isPublisher && isSaving.value) return
    const normalized = Object.fromEntries(config.fields.map((field) => [field.key, record[field.key]]))
    for (const key of config.additionalFields || []) normalized[key] = String(record[key] || '').trim()
    if (!isPublisher) normalized[config.codeField] = currentRecord.value[config.codeField]
    for (const field of config.fields) {
      if (field.type === 'number' && normalized[field.key] !== '') normalized[field.key] = Number(normalized[field.key])
      else if (isPublisher && typeof normalized[field.key] === 'string') normalized[field.key] = normalized[field.key].trim()
    }

    if (isPublisher) {
      isSaving.value = true
      operationError.value = ''
      try {
        const creating = dialogMode.value === 'create'
        const publisher = creating
          ? await createPublisher(normalized)
          : await updatePublisher(currentRecord.value[config.codeField], normalized)
        const index = publisherRows.value.findIndex((row) => row[config.codeField] === publisher[config.codeField])
        if (index < 0) publisherRows.value.unshift(publisher)
        else publisherRows.value.splice(index, 1, publisher)
        page.value = 1
        actionNotice.value = creating ? 'Đã thêm nhà xuất bản.' : 'Đã cập nhật nhà xuất bản.'
        closeDialog()
      } catch (error) {
        operationError.value = error.message || 'Không thể lưu nhà xuất bản.'
      } finally {
        isSaving.value = false
      }
      return
    }

    if (dialogMode.value === 'create') entityStore[config.key].unshift(normalized)
    else {
      const index = entityStore[config.key].findIndex((row) => row[config.codeField] === currentRecord.value[config.codeField])
      if (index >= 0) Object.assign(entityStore[config.key][index], normalized)
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
    const matchingCodes = existingCodes
      .map((code) => code.match(new RegExp(`^${config.codePrefix}(\\d+)$`)))
      .filter(Boolean)
    const next = Math.max(0, ...matchingCodes.map((match) => Number(match[1]))) + 1
    return `${config.codePrefix}${String(next).padStart(config.codeDigits, '0')}`
  }

  function requestDelete(row) {
    actionNotice.value = ''
    operationError.value = ''
    pendingStatusChange.value = null
    pendingDeletion.value = row
    confirmOpen.value = true
  }

  async function confirmStatusChange() {
    if (pendingDeletion.value) {
      if (isPublisher) {
        if (!canManage.value || isDeleting.value) return
        isDeleting.value = true
        operationError.value = ''
        try {
          const maNXB = pendingDeletion.value[config.codeField]
          await deletePublisher(maNXB)
          const index = publisherRows.value.findIndex((item) => item[config.codeField] === maNXB)
          if (index >= 0) publisherRows.value.splice(index, 1)
          actionNotice.value = `Đã xóa nhà xuất bản ${maNXB}.`
          pendingDeletion.value = null
          confirmOpen.value = false
        } catch (error) {
          operationError.value = error.message || 'Không thể xóa nhà xuất bản.'
        } finally {
          isDeleting.value = false
        }
        return
      }
      if (canManage.value) {
        const index = entityStore[config.key].findIndex((item) => item[config.codeField] === pendingDeletion.value[config.codeField])
        if (index >= 0) entityStore[config.key].splice(index, 1)
        actionNotice.value = `Đã xóa ${config.singular} ${pendingDeletion.value[config.codeField]}.`
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
    operationError.value = ''
    pendingDeletion.value = null
    pendingStatusChange.value = null
  }

  const confirmTitle = computed(() => {
    if (pendingDeletion.value) return `Xóa ${config.singular}?`
    const statusAction = config.statusAction
    return pendingStatusChange.value?.[statusAction?.key] === statusAction?.activeValue ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'
  })
  const confirmMessage = computed(() => pendingStatusChange.value
    ? `Thao tác này chỉ có hiệu lực trong phiên hiện tại đối với tài khoản ${pendingStatusChange.value.tenDangNhap}.`
    : pendingDeletion.value ? isPublisher
      ? `Xác nhận xóa nhà xuất bản (${pendingDeletion.value[config.codeField]})? Nhà xuất bản đang được sách sử dụng sẽ không thể xóa.`
      : `Xác nhận xóa ${config.singular} (${pendingDeletion.value[config.codeField]}). Thao tác này chỉ có hiệu lực trong phiên hiện tại.` : '')
  const confirmLabel = computed(() => pendingDeletion.value ? isPublisher ? 'Xóa nhà xuất bản' : 'Xóa sách' : pendingStatusChange.value?.[config.statusAction?.key] === config.statusAction?.activeValue ? 'Khóa tài khoản' : 'Mở khóa')

  return {
    search, page, pageSize, filters, filterOptions, canManage, pageRows, filteredRows, pageCount,
    isPublisher, loading, loadError, operationError, isSaving, isDeleting, loadPublishers,
    dialogMode, dialogOpen, currentRecord, validationErrors, publisherOptions,
    confirmOpen, confirmTitle, confirmMessage, confirmLabel, actionNotice,
    openCreate, openEdit, openDetail, closeDialog, saveRecord, requestStatusChange, requestDelete, confirmStatusChange, closeConfirmation,
  }
}
