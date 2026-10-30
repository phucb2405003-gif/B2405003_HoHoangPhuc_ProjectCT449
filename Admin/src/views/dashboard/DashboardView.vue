<script setup>
import { computed } from 'vue'
import bookIcon from '@/assets/icons/book-open-text.svg'
import readerIcon from '@/assets/icons/user.svg'
import employeeIcon from '@/assets/icons/id-card-lanyard.svg'
import borrowIcon from '@/assets/icons/book-lock.svg'
import StatCard from '@/components/dashboard/StatCard.vue'
import BorrowTrendChart from '@/components/dashboard/BorrowTrendChart.vue'
import RecentBorrows from '@/components/dashboard/RecentBorrows.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import SessionDataNotice from '@/components/common/SessionDataNotice.vue'
import { entityStore } from '@/data/entityStore'
import './DashboardView.css'

const pendingCount = computed(() => entityStore.borrows.filter((borrow) => borrow.trangThai === 'Chờ duyệt').length)
const activeBookCount = computed(() => entityStore.borrows.reduce((total, borrow) => total + borrow.chiTiet.filter((book) => ['Đang mượn', 'Quá hạn'].includes(book.trangThaiSach)).length, 0))
const stats = computed(() => [
  { label: 'Đầu sách', value: entityStore.books.length, caption: 'Trong danh mục', icon: bookIcon },
  { label: 'Độc giả', value: entityStore.readers.length, caption: 'Hồ sơ độc giả', icon: readerIcon },
  { label: 'Nhân viên', value: entityStore.employees.length, caption: 'Hồ sơ nhân viên', icon: employeeIcon },
  { label: 'Chờ duyệt', value: pendingCount.value, caption: 'Phiếu cần xử lý', icon: borrowIcon },
  { label: 'Sách đang mượn', value: activeBookCount.value, caption: 'Bao gồm sách quá hạn', icon: borrowIcon },
])
const recentBorrows = computed(() => entityStore.borrows.slice(0, 5))
</script>

<template>
  <section class="dashboard-page" aria-labelledby="dashboard-title">
    <header class="dashboard-heading">
      <div><p class="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</p><h2 id="dashboard-title">Tổng quan thư viện</h2><p>Các chỉ số sẽ xuất hiện khi có dữ liệu.</p></div>
      <span class="dashboard-date">Tình trạng hiện tại</span>
    </header>

    <SessionDataNotice />

    <div class="stats-grid">
      <StatCard v-for="stat in stats" :key="stat.label" :label="stat.label" :value="stat.value" :caption="stat.caption" :icon="stat.icon" />
    </div>

    <div class="dashboard-main-grid">
      <BorrowTrendChart :data="[]" />
      <RecentActivity :items="[]" />
    </div>
    <RecentBorrows :rows="recentBorrows" />
  </section>
</template>
