<script setup>
import bookOpenIcon from '@/assets/icons/book-open-text.svg'
import './DashboardView.css'
</script>

<template>
  <section class="dashboard-view" aria-labelledby="dashboard-title">
    <div class="page-heading">
      <div>
        <p class="eyebrow">TỔNG QUAN</p>
        <h2 id="dashboard-title">Chào mừng đến với QLMS</h2>
        <p>Phiên đăng nhập nhân viên đã được Backend xác minh.</p>
      </div>
      <span class="verified-badge"><span aria-hidden="true"></span> Đã xác thực</span>
    </div>

    <article class="welcome-card">
      <div class="welcome-icon"><img :src="bookOpenIcon" alt="" aria-hidden="true"></div>
      <div>
        <h3>Khu vực quản trị thư viện</h3>
        <p>Các chức năng quản lý sẽ được bổ sung trong những giai đoạn tiếp theo.</p>
      </div>
    </article>
  </section>
</template>
