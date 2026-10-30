<script setup>
import StatCard from '@/components/dashboard/StatCard.vue'
import BorrowTrendChart from '@/components/dashboard/BorrowTrendChart.vue'
import RecentBorrows from '@/components/dashboard/RecentBorrows.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import useDashboard from '@/composables/useDashboard'
import './DashboardView.css'

const { loading, errors, recentRows, trendData, stats, loadDashboard } = useDashboard()
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
