import { computed, onMounted, ref } from 'vue'
import bookIcon from '@/assets/icons/book-open-text.svg'
import readerIcon from '@/assets/icons/user.svg'
import employeeIcon from '@/assets/icons/id-card-lanyard.svg'
import borrowIcon from '@/assets/icons/book-lock.svg'
import { ROLE_MANAGER } from '@/data/permissions'
import { authState } from '@/services/authService'
import { getBooks } from '@/services/bookService'
import { getReaders } from '@/services/readerService'
import { getEmployees } from '@/services/employeeService'
import { getBorrowDetails, getBorrows } from '@/services/borrowService'
import { buildRecentActivity } from '@/utils/dashboardActivity'

export default function useDashboard() {
  const canManage = computed(() => authState.user?.chucVu === ROLE_MANAGER)
  const loading = ref(false)
  const bookCount = ref(null)
  const readerRows = ref(null)
  const employeeCount = ref(null)
  const borrowRows = ref(null)
  const borrowDetails = ref(null)
  const activityDetails = ref([])
  const bookRows = ref(null)
  const recentRows = ref([])
  const errors = ref({})

  function parseBackendDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (typeof value !== 'string') return null
    // Backend Date values serialize as ISO strings; date-only values are parsed without a timezone shift.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (dateOnly) return new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  function monthKey(value) {
    if (typeof value === 'string') {
      const iso = /^(\d{4})-(\d{2})/.exec(value)
      if (iso) return `${iso[1]}-${iso[2]}`
    }
    const parsed = parseBackendDate(value)
    return parsed ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}` : null
  }

  function formatRequestDate(value) {
    const parsed = parseBackendDate(value)
    return parsed ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' }).format(parsed) : '—'
  }

  function calendarDay(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate())
    }
    if (typeof value !== 'string' || !value.trim()) return null
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (dateOnly) {
      const parsed = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      return parsed.getFullYear() === Number(dateOnly[1]) && parsed.getMonth() === Number(dateOnly[2]) - 1 && parsed.getDate() === Number(dateOnly[3]) ? parsed : null
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  const overdueRows = computed(() => {
    if (borrowDetails.value === null) return null
    const today = calendarDay(new Date())
    const booksByCode = new Map((bookRows.value || []).map((book) => [book.maSach, book]))
    const readersByCode = new Map((readerRows.value || []).map((reader) => [reader.maDocGia, reader]))
    const borrowsByCode = new Map((borrowRows.value || []).map((borrow) => [borrow.maPhieu, borrow]))
    return borrowDetails.value.flatMap((detail) => {
      const due = calendarDay(detail.hanTra)
      if (detail.trangThai !== 'Đang mượn' || !due || due >= today) return []
      const readerCode = detail.maDocGia || borrowsByCode.get(detail.maPhieu)?.maDocGia
      return [{
        ...detail,
        tenSach: booksByCode.get(detail.maSach)?.tenSach || detail.maSach,
        tenDocGia: readersByCode.get(readerCode)?.hoTen || readerCode || '—',
        soNgayQuaHan: Math.floor((today - due) / 86400000),
      }]
    }).sort((a, b) => b.soNgayQuaHan - a.soNgayQuaHan)
  })

  const activeBookCount = computed(() => borrowDetails.value?.reduce(
    (total, detail) => total + (detail.trangThai === 'Đang mượn' ? 1 : 0), 0,
  ) ?? null)
  const overdueBookCount = computed(() => overdueRows.value?.length ?? null)
  const activityItems = computed(() => buildRecentActivity({
    borrows: borrowRows.value || [],
    details: activityDetails.value,
    readers: readerRows.value || [],
    books: bookRows.value || [],
  }))
  const pendingCount = computed(() => borrowRows.value?.filter((borrow) => borrow.trangThai === 'Chờ duyệt').length ?? null)
  const trendData = computed(() => {
    if (!borrowRows.value) return []
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1))
    const counts = new Map(months.map((date) => [`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, 0]))
    for (const borrow of borrowRows.value) {
      const key = monthKey(borrow.ngayYeuCau)
      if (key && counts.has(key)) counts.set(key, counts.get(key) + 1)
    }
    return months.map((date) => ({
      month: new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(date),
      count: counts.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`),
    }))
  })
  const stats = computed(() => [
    { label: 'Đầu sách', value: bookCount.value ?? '—', caption: 'Trong danh mục', icon: bookIcon },
    { label: 'Độc giả', value: readerRows.value?.length ?? '—', caption: 'Hồ sơ độc giả', icon: readerIcon },
    ...(canManage.value ? [{ label: 'Nhân viên', value: employeeCount.value ?? '—', caption: 'Hồ sơ nhân viên', icon: employeeIcon }] : []),
    { label: 'Chờ duyệt', value: pendingCount.value ?? '—', caption: 'Phiếu cần xử lý', icon: borrowIcon },
    { label: 'Sách đang mượn', value: activeBookCount.value ?? '—', caption: 'Theo trạng thái từng sách', icon: borrowIcon },
    { label: 'Sách quá hạn trả', value: overdueBookCount.value ?? '—', caption: 'Đang mượn quá hạn', icon: borrowIcon },
  ].map((stat) => ({
    ...stat,
    to: ({
      [bookIcon]: '/books',
      [readerIcon]: '/readers',
      [employeeIcon]: '/employees',
      [borrowIcon]: '/borrows',
    })[stat.icon],
  })))

  async function loadDashboard() {
    loading.value = true
    errors.value = {}

    const requests = [
      ['books', getBooks],
      ['readers', getReaders],
      ['borrows', getBorrows],
      ...(canManage.value ? [['employees', getEmployees]] : []),
    ]
    const results = await Promise.allSettled(requests.map(([, request]) => request()))
    const loaded = {}
    results.forEach((result, index) => {
      const [key] = requests[index]
      if (result.status === 'fulfilled') loaded[key] = result.value
      else errors.value[key] = result.reason?.message || 'Không thể tải dữ liệu.'
    })

    bookCount.value = loaded.books?.length ?? null
    bookRows.value = loaded.books ?? null
    readerRows.value = loaded.readers ?? null
    employeeCount.value = loaded.employees?.length ?? null
    borrowRows.value = loaded.borrows ?? null

    if (loaded.borrows) {
      const detailResults = await Promise.allSettled(loaded.borrows.map((borrow) => getBorrowDetails(borrow.maPhieu)))
      const failedDetail = detailResults.find((result) => result.status === 'rejected')
      if (failedDetail) {
        errors.value.borrowDetails = failedDetail.reason?.message || 'Không thể tải chi tiết phiếu mượn.'
        borrowDetails.value = null
        activityDetails.value = detailResults.flatMap((result) => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [])
      } else {
        const details = detailResults.flatMap((result) => result.value)
        borrowDetails.value = details
        activityDetails.value = details
      }
    } else {
      borrowDetails.value = null
      activityDetails.value = []
    }

    if (loaded.borrows && loaded.readers) {
      const readerNames = new Map(loaded.readers.map((reader) => [reader.maDocGia, reader.hoTen]))
      recentRows.value = [...loaded.borrows]
        .sort((a, b) => (parseBackendDate(b.ngayYeuCau)?.getTime() ?? -Infinity) - (parseBackendDate(a.ngayYeuCau)?.getTime() ?? -Infinity))
        .slice(0, 5)
        .map((borrow) => ({ ...borrow, tenDocGia: readerNames.get(borrow.maDocGia) || borrow.maDocGia, ngayYeuCau: formatRequestDate(borrow.ngayYeuCau) }))
    } else {
      recentRows.value = []
    }

    loading.value = false
  }

  onMounted(loadDashboard)

  return {
    canManage,
    loading,
    bookCount,
    readerRows,
    employeeCount,
    borrowRows,
    borrowDetails,
    activityItems,
    recentRows,
    errors,
    activeBookCount,
    overdueBookCount,
    overdueRows,
    pendingCount,
    trendData,
    stats,
    loadDashboard,
  }
}
