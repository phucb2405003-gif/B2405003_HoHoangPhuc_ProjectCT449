<script setup>
import { useRouter } from 'vue-router'
import { authState, logoutStaff } from '@/services/authService'

const router = useRouter()

function logout() {
  logoutStaff()
  router.replace({ name: 'login' })
}
</script>

<template>
  <main class="dashboard-page">
    <header class="dashboard-header">
      <a class="dashboard-brand" href="/dashboard"><span class="brand-mark small">Q</span><span>QLMS <small>NHÂN VIÊN</small></span></a>
      <button class="logout-button" type="button" @click="logout">Đăng xuất</button>
    </header>
    <section class="welcome-card">
      <p class="eyebrow">KHU VỰC NHÂN VIÊN</p>
      <h1>Đăng nhập thành công</h1>
      <p>Chào <strong>{{ authState.user?.tenDangNhap }}</strong>, phiên làm việc của bạn đã được xác minh.</p>
      <div class="staff-details">
        <div><span>Tài khoản</span><strong>{{ authState.user?.maTaiKhoan }}</strong></div>
        <div><span>Chức vụ</span><strong>{{ authState.user?.chucVu || 'Chưa cập nhật' }}</strong></div>
      </div>
      <p class="coming-soon">Các chức năng quản lý thư viện sẽ được bổ sung trong giai đoạn tiếp theo.</p>
    </section>
  </main>
</template>
