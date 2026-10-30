<script setup>
import libraryIcon from '@/assets/icons/square-library.svg'

defineProps({
  user: { type: Object, default: null },
  staffInitial: { type: String, default: 'N' },
})

const emit = defineEmits(['close-mobile', 'logout'])
</script>

<template>
  <aside class="admin-sidebar" aria-label="Điều hướng quản trị">
    <RouterLink class="sidebar-brand" to="/dashboard" aria-label="QLMS - Tổng quan" @click="emit('close-mobile')">
      <span class="sidebar-logo"><img :src="libraryIcon" alt="" aria-hidden="true"></span>
      <span class="sidebar-brand-copy"><strong>QLMS</strong><small>QUẢN LÝ THƯ VIỆN</small></span>
    </RouterLink>

    <p class="sidebar-section-label">KHÔNG GIAN LÀM VIỆC</p>
    <nav class="sidebar-nav" aria-label="Chức năng chính">
      <RouterLink class="sidebar-link" active-class="is-active" to="/dashboard" @click="emit('close-mobile')">
        <img class="sidebar-link-icon" :src="libraryIcon" alt="" aria-hidden="true">
        <span class="sidebar-link-label">Tổng quan</span>
      </RouterLink>
    </nav>

    <div class="sidebar-bottom">
      <div class="sidebar-staff" :title="`${user?.tenDangNhap || ''} · ${user?.chucVu || ''}`">
        <span class="staff-avatar">{{ staffInitial }}</span>
        <span class="staff-copy"><strong>{{ user?.tenDangNhap }}</strong><small>{{ user?.chucVu || 'Nhân viên' }}</small></span>
      </div>
      <button class="sidebar-logout" type="button" @click="emit('logout')">
        <span class="sidebar-link-label">Đăng xuất</span>
      </button>
    </div>
  </aside>
</template>
