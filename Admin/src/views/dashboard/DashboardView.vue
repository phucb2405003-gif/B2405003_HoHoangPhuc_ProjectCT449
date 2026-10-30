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
import MockDataNotice from '@/components/common/MockDataNotice.vue'
import { borrowTrend, recentActivity } from '@/data/mock/dashboard'
import { mockStore } from '@/data/mock/mockStore'
import './DashboardView.css'

const pendingCount = computed(() => mockStore.borrows.filter((borrow) => borrow.trangThai === 'Chờ duyệt').length)
const activeBookCount = computed(() => mockStore.borrows.reduce((total, borrow) => total + borrow.chiTiet.filter((book) => ['Đang mượn', 'Quá hạn'].includes(book.trangThaiSach)).length, 0))
const stats = computed(() => [
  { label: 'Đầu sách', value: mockStore.books.length, caption: 'Trong danh mục mẫu', icon: bookIcon },
  { label: 'Độc giả', value: mockStore.readers.length, caption: 'Hồ sơ minh họa', icon: readerIcon },
  { label: 'Nhân viên', value: mockStore.employees.length, caption: 'Hồ sơ minh họa', icon: employeeIcon },
  { label: 'Chờ duyệt', value: pendingCount.value, caption: 'Phiếu trong dữ liệu mẫu', icon: borrowIcon },
  { label: 'Sách đang mượn', value: activeBookCount.value, caption: 'Bao gồm sách quá hạn', icon: borrowIcon },
])
const recentBorrows = computed(() => mockStore.borrows.slice(0, 5))
</script>

<template>
  <section class="dashboard-page" aria-labelledby="dashboard-title">
    <header class="dashboard-heading">
      <div><p class="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</p><h2 id="dashboard-title">Tổng quan thư viện</h2><p>Theo dõi tình hình hoạt động qua dữ liệu mẫu.</p></div>
      <span class="dashboard-date">Bản xem trước giao diện</span>
    </header>

    <MockDataNotice />

    <div class="stats-grid">
      <StatCard v-for="stat in stats" :key="stat.label" :label="stat.label" :value="stat.value" :caption="stat.caption" :icon="stat.icon" />
    </div>

    <div class="dashboard-main-grid">
      <BorrowTrendChart :data="borrowTrend" />
      <RecentActivity :items="recentActivity" />
    </div>
    <RecentBorrows :rows="recentBorrows" />
  </section>
</template>
