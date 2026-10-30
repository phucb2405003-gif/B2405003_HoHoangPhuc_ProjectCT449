import { computed, onMounted, reactive, ref, watch } from 'vue'
import { authState } from '@/services/authService'
import { entityStore } from '@/data/entityStore'
import { createPublisher, deletePublisher, getPublishers, updatePublisher } from '@/services/publisherService'
import { addBookStock, createBook, deleteBook, destroyBookStock, getBooks, updateBook } from '@/services/bookService'
import { createReader, getReader, getReaders, updateReader, updateReaderStatus } from '@/services/readerService'

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
  const isBook = config.key === 'books'
  const isReader = config.key === 'readers'
  const isRemoteEntity = isPublisher || isBook || isReader
  const publisherRows = ref([])
  const bookRows = ref([])
  const readerRows = ref([])
  const bookPublisherRows = ref([])
  const loading = ref(false)
  const loadError = ref('')
  const operationError = ref('')
  const isSaving = ref(false)
  const isDeleting = ref(false)
  const stockDialogOpen = ref(false)
  const stockMode = ref('add')
  const stockBook = ref(null)
  const isStockOperation = ref(false)
  const isStatusOperation = ref(false)
  const credentials = ref(null)

  const canManage = computed(() => config.writeRoles.includes(authState.user?.chucVu))
  const rows = computed(() => isPublisher ? publisherRows.value : isBook ? bookRows.value : isReader ? readerRows.value : entityStore[config.key])
  const publisherOptions = computed(() => isBook ? bookPublisherRows.value : entityStore.publishers)
  const filterOptions = computed(() => Object.fromEntries((config.filters || []).map((filter) => {
    const values = [...new Set(rows.value.map((row) => row[filter.key]))]
    return [filter.key, values.map((value) => {
      if (filter.boolean) return { label: value ? 'Đang hoạt động' : 'Đã khóa', value }
      if (isBook && filter.key === 'maNXB') {
        return { label: bookPublisherRows.value.find((publisher) => publisher.maNXB === value)?.tenNXB || value, value }
      }
      return { label: value, value }
    })]
  })))
  const filteredRows = computed(() => {
    const needle = search.value.trim().toLocaleLowerCase('vi')
    return rows.value.filter((row) => {
      const publisherName = isBook ? bookPublisherRows.value.find((publisher) => publisher.maNXB === row.maNXB)?.tenNXB || '' : ''
      const matchesSearch = !needle || config.searchKeys.some((key) => String(row[key] ?? '').toLocaleLowerCase('vi').includes(needle)) || publisherName.toLocaleLowerCase('vi').includes(needle)
      const matchesFilters = (config.filters || []).every((filter) => filters[filter.key] === '' || String(row[filter.key]) === String(filters[filter.key]))
      return matchesSearch && matchesFilters
    })
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
  const pageRows = computed(() => filteredRows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const tableRows = computed(() => isBook ? pageRows.value.map((book) => ({
    ...book,
    nhaXuatBan: bookPublisherRows.value.find((publisher) => publisher.maNXB === book.maNXB)?.tenNXB || book.maNXB,
  })) : pageRows.value)

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

  async function loadBooks() {
    loading.value = true
    loadError.value = ''
    operationError.value = ''
    try {
      const [books, publishers] = await Promise.all([getBooks(), getPublishers()])
      bookRows.value = books
      bookPublisherRows.value = publishers
    } catch (error) {
      bookRows.value = []
      bookPublisherRows.value = []
      loadError.value = error.message || 'Không thể tải sách và danh sách nhà xuất bản.'
    } finally {
      loading.value = false
    }
  }

  async function loadReaders() {
    loading.value = true
    loadError.value = ''
    operationError.value = ''
    try { readerRows.value = await getReaders() }
    catch (error) { readerRows.value = []; loadError.value = error.message || 'Không thể tải danh sách độc giả.' }
    finally { loading.value = false }
  }

  if (isPublisher) onMounted(loadPublishers)
  if (isBook) onMounted(loadBooks)
  if (isReader) onMounted(loadReaders)

  function openCreate() {
    validationErrors.value = {}
    operationError.value = ''
    actionNotice.value = ''
    const values = Object.fromEntries(config.fields.map((field) => {
      const firstOption = field.options?.[0] ?? (field.optionsFrom === 'publishers' ? publisherOptions.value[0]?.[field.optionValue] : undefined)
      const defaultValue = typeof firstOption === 'object' ? firstOption.value : firstOption
      return [field.key, field.defaultValue ?? defaultValue ?? '']
    }))
    for (const key of config.additionalFields || []) values[key] = ''
    if (!isRemoteEntity) values[config.codeField] = generateCode()
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

  async function openDetail(row) {
    dialogMode.value = 'detail'
    operationError.value = ''
    dialogOpen.value = true
    currentRecord.value = row
    if (isReader) {
      try { currentRecord.value = await getReader(row.maDocGia) }
      catch (error) { operationError.value = error.message || 'Không thể tải chi tiết độc giả.' }
    }
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

    if (isBook && dialogMode.value !== 'edit' && !Number.isSafeInteger(Number(record.soQuyen))) {
      errors.soQuyen = 'Tổng số lượng phải là số nguyên an toàn không âm.'
    }
    const code = String(record[config.codeField] || '').trim().toLocaleLowerCase('vi')
    const duplicate = rows.value.some((row) => String(row[config.codeField]).toLocaleLowerCase('vi') === code && row[config.codeField] !== currentRecord.value[config.codeField])
    if (code && duplicate) errors[config.codeField] = 'Mã này đã tồn tại.'
    validationErrors.value = errors
    return Object.keys(errors).length === 0
  }

  async function saveRecord(record) {
    if (!canManage.value || !validate(record)) return
    if (isRemoteEntity && isSaving.value) return
    const fields = config.fields.filter((field) => !(isBook && dialogMode.value === 'edit' && field.createOnly))
    const normalized = Object.fromEntries(fields.map((field) => [field.key, record[field.key]]))
    for (const key of config.additionalFields || []) normalized[key] = String(record[key] || '').trim()
    if (!isRemoteEntity) normalized[config.codeField] = currentRecord.value[config.codeField]
    for (const field of fields) {
      if (field.type === 'number' && normalized[field.key] !== '') normalized[field.key] = Number(normalized[field.key])
      else if (isRemoteEntity && typeof normalized[field.key] === 'string') normalized[field.key] = normalized[field.key].trim()
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

    if (isBook) {
      isSaving.value = true
      operationError.value = ''
      try {
        const creating = dialogMode.value === 'create'
        const book = creating
          ? await createBook(normalized)
          : await updateBook(currentRecord.value[config.codeField], normalized)
        const index = bookRows.value.findIndex((row) => row[config.codeField] === book[config.codeField])
        if (index < 0) bookRows.value.unshift(book)
        else bookRows.value.splice(index, 1, book)
        page.value = 1
        actionNotice.value = creating ? 'Đã thêm sách.' : 'Đã cập nhật thông tin sách.'
        closeDialog()
      } catch (error) {
        operationError.value = error.message || 'Không thể lưu thông tin sách.'
      } finally {
        isSaving.value = false
      }
      return
    }

    if (isReader) {
      isSaving.value = true
      operationError.value = ''
      try {
        const creating = dialogMode.value === 'create'
        if (creating) {
          const result = await createReader(normalized)
          const index = readerRows.value.findIndex((row) => row.maDocGia === result.reader.maDocGia)
          if (index < 0) readerRows.value.unshift(result.reader)
          page.value = 1
          credentials.value = result.accountCreation?.created && canManage.value
            ? { maDocGia: result.reader.maDocGia, tenDangNhap: result.accountCreation.tenDangNhap, initialPassword: result.accountCreation.initialPassword }
            : null
          actionNotice.value = 'Đã tạo hồ sơ độc giả và tài khoản.'
        } else {
          const reader = await updateReader(currentRecord.value.maDocGia, normalized)
          const index = readerRows.value.findIndex((row) => row.maDocGia === reader.maDocGia)
          if (index >= 0) readerRows.value.splice(index, 1, reader)
          actionNotice.value = 'Đã cập nhật hồ sơ độc giả.'
        }
        closeDialog()
      } catch (error) {
        const data = error.responseData
        if (data?.profileCreated === true && data?.accountCreated === false && typeof data.maDocGia === 'string') {
          actionNotice.value = `Đã tạo hồ sơ độc giả ${data.maDocGia}, nhưng chưa tạo được tài khoản. Hãy tạo tài khoản thủ công cho mã hồ sơ này.`
          await loadReaders()
          operationError.value = ''
          closeDialog()
        } else operationError.value = error.message || 'Không thể lưu hồ sơ độc giả.'
      } finally { isSaving.value = false }
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
    if (isReader) {
      operationError.value = ''
      pendingStatusChange.value = row
      statusDialogOpen.value = true
      return
    }
    pendingDeletion.value = null
    pendingStatusChange.value = row
    confirmOpen.value = true
  }

  const statusDialogOpen = ref(false)
  async function saveReaderStatus(status) {
    if (!isReader || !canManage.value || isStatusOperation.value || !pendingStatusChange.value) return
    isStatusOperation.value = true
    operationError.value = ''
    try {
      const updated = await updateReaderStatus(pendingStatusChange.value.maDocGia, status)
      const index = readerRows.value.findIndex((row) => row.maDocGia === updated.maDocGia)
      if (index >= 0) readerRows.value.splice(index, 1, updated)
      actionNotice.value = 'Đã cập nhật trạng thái độc giả.'
      statusDialogOpen.value = false
      pendingStatusChange.value = null
    } catch (error) { operationError.value = error.message || 'Không thể cập nhật trạng thái độc giả.' }
    finally { isStatusOperation.value = false }
  }

  function closeReaderStatus() {
    if (isStatusOperation.value) return
    statusDialogOpen.value = false
    pendingStatusChange.value = null
    operationError.value = ''
  }

  function closeCredentials() { credentials.value = null }

  function requestStockAdjustment(book, mode) {
    operationError.value = ''
    actionNotice.value = ''
    stockBook.value = book
    stockMode.value = mode
    stockDialogOpen.value = true
  }

  async function confirmStockAdjustment(soLuong) {
    if (!isBook || !canManage.value || isStockOperation.value || !stockBook.value) return
    if (!Number.isSafeInteger(soLuong) || soLuong <= 0) {
      operationError.value = 'Số lượng phải là số nguyên dương.'
      return
    }
    if (stockMode.value === 'destroy' && soLuong > stockBook.value.soQuyenConLai) {
      operationError.value = 'Số lượng tiêu hủy vượt quá số sách còn khả dụng.'
      return
    }

    isStockOperation.value = true
    operationError.value = ''
    try {
      const book = stockMode.value === 'add'
        ? await addBookStock(stockBook.value.maSach, soLuong)
        : await destroyBookStock(stockBook.value.maSach, soLuong)
      const index = bookRows.value.findIndex((row) => row.maSach === book.maSach)
      if (index < 0) throw new Error('Không tìm thấy sách trong danh sách hiện tại để đồng bộ kết quả.')
      bookRows.value.splice(index, 1, book)
      actionNotice.value = stockMode.value === 'add' ? 'Đã bổ sung số lượng sách.' : 'Đã tiêu hủy số lượng sách.'
      stockDialogOpen.value = false
      stockBook.value = null
    } catch (error) {
      operationError.value = error.message || 'Không thể cập nhật số lượng sách.'
    } finally {
      isStockOperation.value = false
    }
  }

  function closeStockDialog() {
    if (isStockOperation.value) return
    stockDialogOpen.value = false
    stockBook.value = null
    operationError.value = ''
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
      if (isBook) {
        if (!canManage.value || isDeleting.value) return
        isDeleting.value = true
        operationError.value = ''
        try {
          const maSach = pendingDeletion.value[config.codeField]
          await deleteBook(maSach)
          const index = bookRows.value.findIndex((item) => item[config.codeField] === maSach)
          if (index >= 0) bookRows.value.splice(index, 1)
          actionNotice.value = `Đã xóa sách ${maSach}.`
          pendingDeletion.value = null
          confirmOpen.value = false
        } catch (error) {
          operationError.value = error.message || 'Không thể xóa sách.'
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
      : isBook
        ? `Xác nhận xóa sách (${pendingDeletion.value[config.codeField]})? Sách có lịch sử mượn trả sẽ không thể xóa.`
        : `Xác nhận xóa ${config.singular} (${pendingDeletion.value[config.codeField]}). Thao tác này chỉ có hiệu lực trong phiên hiện tại.` : '')
  const confirmLabel = computed(() => pendingDeletion.value ? isPublisher ? 'Xóa nhà xuất bản' : 'Xóa sách' : pendingStatusChange.value?.[config.statusAction?.key] === config.statusAction?.activeValue ? 'Khóa tài khoản' : 'Mở khóa')

  return {
    search, page, pageSize, filters, filterOptions, canManage, pageRows, filteredRows, pageCount,
    isPublisher, isBook, isReader, isRemoteEntity, loading, loadError, operationError, isSaving, isDeleting, loadPublishers, loadBooks, loadReaders,
    tableRows, stockDialogOpen, stockMode, stockBook, isStockOperation,
    dialogMode, dialogOpen, currentRecord, validationErrors, publisherOptions,
    confirmOpen, confirmTitle, confirmMessage, confirmLabel, actionNotice,
    openCreate, openEdit, openDetail, closeDialog, saveRecord, requestStatusChange, requestStockAdjustment, confirmStockAdjustment, closeStockDialog, requestDelete, confirmStatusChange, closeConfirmation,
    statusDialogOpen, pendingStatusChange, isStatusOperation, saveReaderStatus, closeReaderStatus, credentials, closeCredentials,
  }
}
