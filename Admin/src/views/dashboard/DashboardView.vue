<script setup>
import StatCard from '@/components/dashboard/StatCard.vue'
import BorrowTrendChart from '@/components/dashboard/BorrowTrendChart.vue'
import RecentBorrows from '@/components/dashboard/RecentBorrows.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import useDashboard from '@/composables/useDashboard'
import './DashboardView.css'

const { loading, errors, recentRows, trendData, stats, overdueRows, activityItems, loadDashboard } = useDashboard()

function formatOverdueDate(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { timeZone: typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : undefined }).format(date)
}
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
      <StatCard v-for="stat in stats" :key="stat.label" :label="stat.label" :value="stat.value" :caption="stat.caption" :icon="stat.icon" :to="stat.to" />
    </div>

    <div class="dashboard-main-grid">
      <BorrowTrendChart :data="trendData" :error="errors.borrows || ''" />
      <RecentActivity :items="activityItems" :loading="loading" :error="errors.borrowDetails || errors.borrows || ''" />
    </div>
    <RecentBorrows :rows="recentRows" :error="errors.borrows || errors.readers || ''" />
    <section class="dashboard-panel overdue-books" aria-labelledby="overdue-books-title">
      <header class="dashboard-panel__header">
        <div><h3 id="overdue-books-title">Sách quá hạn trả</h3><p>Các sách đang mượn đã qua hạn trả</p></div>
        <RouterLink to="/borrows" class="panel-link">Xem quản lý mượn sách <span aria-hidden="true">›</span></RouterLink>
      </header>
      <p v-if="loading" class="overdue-books__state" role="status">Đang tải dữ liệu sách quá hạn…</p>
      <p v-else-if="errors.borrowDetails" class="overdue-books__state overdue-books__state--error" role="alert">Không tải được chi tiết phiếu mượn: {{ errors.borrowDetails }}</p>
      <p v-else-if="errors.borrows" class="overdue-books__state overdue-books__state--error" role="alert">Không tải được danh sách phiếu mượn: {{ errors.borrows }}</p>
      <p v-else-if="errors.books || errors.readers" class="overdue-books__state overdue-books__state--error" role="alert">Không tải được tên sách hoặc độc giả: {{ errors.books || errors.readers }}</p>
      <p v-else-if="!overdueRows?.length" class="overdue-books__state">Hiện không có sách quá hạn trả.</p>
      <div v-else class="overdue-books__scroll">
        <table class="data-table overdue-books__table">
          <thead><tr><th>Mã phiếu</th><th>Tên sách</th><th>Mã sách</th><th>Tên độc giả</th><th>Hạn trả</th><th>Số ngày quá hạn</th></tr></thead>
          <tbody><tr v-for="book in overdueRows" :key="`${book.maPhieu}-${book.maSach}`">
            <td><strong class="table-strong">{{ book.maPhieu }}</strong></td><td>{{ book.tenSach }}</td><td>{{ book.maSach }}</td><td>{{ book.tenDocGia }}</td><td>{{ formatOverdueDate(book.hanTra) }}</td><td><strong class="overdue-books__days">{{ book.soNgayQuaHan }}</strong></td>
          </tr></tbody>
        </table>
      </div>
    </section>
  </section>
</template>
