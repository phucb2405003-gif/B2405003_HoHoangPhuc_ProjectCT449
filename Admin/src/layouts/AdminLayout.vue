<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, logoutStaff } from '@/services/authService'

const router = useRouter()
const isCollapsed = ref(typeof window !== 'undefined' && window.innerWidth <= 1024 && window.innerWidth > 760)
const isMobileMenuOpen = ref(false)
const staffInitial = computed(() => authState.user?.tenDangNhap?.charAt(0)?.toLocaleUpperCase('vi') || 'N')
let wasTablet = typeof window !== 'undefined' && window.innerWidth <= 1024 && window.innerWidth > 760

function syncTabletSidebar() {
  const isTablet = window.innerWidth > 760 && window.innerWidth <= 1024
  if (isTablet !== wasTablet) isCollapsed.value = isTablet
  wasTablet = isTablet
}

onMounted(() => window.addEventListener('resize', syncTabletSidebar))
onUnmounted(() => window.removeEventListener('resize', syncTabletSidebar))

function logout() {
  logoutStaff()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="admin-shell" :class="{ 'is-collapsed': isCollapsed, 'mobile-menu-open': isMobileMenuOpen }">
    <button
      v-if="isMobileMenuOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="Đóng menu"
      @click="isMobileMenuOpen = false"
    ></button>

    <aside class="admin-sidebar" aria-label="Điều hướng quản trị">
      <RouterLink class="sidebar-brand" to="/dashboard" aria-label="QLMS - Tổng quan" @click="isMobileMenuOpen = false">
        <span class="sidebar-logo" aria-hidden="true">Q</span>
        <span class="sidebar-brand-copy"><strong>QLMS</strong><small>QUẢN LÝ THƯ VIỆN</small></span>
      </RouterLink>

      <p class="sidebar-section-label">KHÔNG GIAN LÀM VIỆC</p>
      <nav class="sidebar-nav">
        <RouterLink class="sidebar-link" active-class="is-active" to="/dashboard" @click="isMobileMenuOpen = false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3.8l8.5 6.7v9a1 1 0 0 1-1 1h-5.2v-6.2H9.7v6.2H4.5a1 1 0 0 1-1-1z" /></svg>
          <span class="sidebar-link-label">Tổng quan</span>
        </RouterLink>
      </nav>

      <div class="sidebar-bottom">
        <div class="sidebar-staff" :title="`${authState.user?.tenDangNhap || ''} · ${authState.user?.chucVu || ''}`">
          <span class="staff-avatar">{{ staffInitial }}</span>
          <span class="staff-copy"><strong>{{ authState.user?.tenDangNhap }}</strong><small>{{ authState.user?.chucVu || 'Nhân viên' }}</small></span>
        </div>
        <button class="sidebar-logout" type="button" @click="logout">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10m4-4 4-4-4-4m4 4H9" /></svg>
          <span class="sidebar-link-label">Đăng xuất</span>
        </button>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-header">
        <div class="header-leading">
          <button class="menu-toggle mobile-toggle" type="button" aria-label="Mở menu điều hướng" :aria-expanded="isMobileMenuOpen" @click="isMobileMenuOpen = !isMobileMenuOpen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <button class="menu-toggle desktop-toggle" type="button" :aria-label="isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'" :aria-expanded="!isCollapsed" @click="isCollapsed = !isCollapsed">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16M9 5v14" /></svg>
          </button>
          <div><p class="header-kicker">KHU VỰC NHÂN VIÊN</p><h1 class="header-title">QLMS Admin</h1></div>
        </div>
        <div class="header-account">
          <span class="header-account-copy"><strong>{{ authState.user?.tenDangNhap }}</strong><small>{{ authState.user?.chucVu || 'Nhân viên' }}</small></span>
          <span class="staff-avatar header-avatar">{{ staffInitial }}</span>
        </div>
      </header>

      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
