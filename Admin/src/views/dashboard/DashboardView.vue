<script setup>
import { computed, onMounted, ref } from 'vue'
import bookIcon from '@/assets/icons/book-open-text.svg'
import readerIcon from '@/assets/icons/user.svg'
import employeeIcon from '@/assets/icons/id-card-lanyard.svg'
import borrowIcon from '@/assets/icons/book-lock.svg'
import StatCard from '@/components/dashboard/StatCard.vue'
import BorrowTrendChart from '@/components/dashboard/BorrowTrendChart.vue'
import RecentBorrows from '@/components/dashboard/RecentBorrows.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import { ROLE_MANAGER } from '@/data/permissions'
import { authState } from '@/services/authService'
import { getBooks } from '@/services/bookService'
import { getReaders } from '@/services/readerService'
import { getEmployees } from '@/services/employeeService'
import { getBorrowDetails, getBorrows } from '@/services/borrowService'
import './DashboardView.css'

const canManage = computed(() => authState.user?.chucVu === ROLE_MANAGER)
const loading = ref(false)
const bookCount = ref(null)
const readerRows = ref(null)
const employeeCount = ref(null)
const borrowRows = ref(null)
const borrowDetails = ref(null)
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

const activeBookCount = computed(() => borrowDetails.value?.reduce(
  (total, detail) => total + (detail.trangThai === 'Đang mượn' ? 1 : 0), 0,
) ?? null)
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
])

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
  readerRows.value = loaded.readers ?? null
  employeeCount.value = loaded.employees?.length ?? null
  borrowRows.value = loaded.borrows ?? null

  if (loaded.borrows) {
    const detailResults = await Promise.allSettled(loaded.borrows.map((borrow) => getBorrowDetails(borrow.maPhieu)))
    const failedDetail = detailResults.find((result) => result.status === 'rejected')
    if (failedDetail) {
      errors.value.borrowDetails = failedDetail.reason?.message || 'Không thể tải chi tiết phiếu mượn.'
      borrowDetails.value = null
    } else {
      borrowDetails.value = detailResults.flatMap((result) => result.value)
    }
  } else {
    borrowDetails.value = null
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
</script>

<template>
  <section class="dashboard-page" aria-labelledby="dashboard-title">
    <header class="dashboard-heading">
      <div><p class="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</p><h2 id="dashboard-title">Tổng quan thư viện</h2><p>Các chỉ số sẽ xuất hiện khi có dữ liệu.</p></div>
      <span class="dashboard-date">Tình trạng hiện tại</span>
    </header>

    <div v-if="loading || Object.keys(errors).length" class="dashboard-load-state" role="status" aria-live="polite">
      <span v-if="loading">Đang tải dữ liệu Dashboard…</span>
      <template v-else>
        <span>Chưa tải được một số dữ liệu: {{ Object.keys(errors).join(', ') }}.</span>
        <button type="button" @click="loadDashboard">Thử tải lại</button>
      </template>
    </div>

    <div class="stats-grid">
      <StatCard v-for="stat in stats" :key="stat.label" :label="stat.label" :value="stat.value" :caption="stat.caption" :icon="stat.icon" />
    </div>

    <div class="dashboard-main-grid">
      <BorrowTrendChart :data="trendData" :error="errors.borrows || ''" />
      <RecentActivity :items="[]" />
    </div>
    <RecentBorrows :rows="recentRows" :error="errors.borrows || errors.readers || ''" />
  </section>
</template>
