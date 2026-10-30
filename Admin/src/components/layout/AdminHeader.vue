<script setup>
import listIcon from '@/assets/icons/list.svg'

defineProps({
  user: { type: Object, default: null },
  staffInitial: { type: String, default: 'N' },
  isCollapsed: { type: Boolean, default: false },
  isMobileMenuOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-mobile', 'toggle-sidebar'])
</script>

<template>
  <header class="admin-header">
    <div class="header-leading">
      <button class="menu-toggle mobile-toggle" type="button" aria-label="Mở menu điều hướng" :aria-expanded="isMobileMenuOpen" @click="emit('toggle-mobile')">
        <img :src="listIcon" alt="" aria-hidden="true">
      </button>
      <button class="menu-toggle desktop-toggle" type="button" :aria-label="isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'" :aria-expanded="!isCollapsed" @click="emit('toggle-sidebar')">
        <img :src="listIcon" alt="" aria-hidden="true">
      </button>
      <div><p class="header-kicker">KHU VỰC NHÂN VIÊN</p><h1 class="header-title">QLMS Admin</h1></div>
    </div>
    <div class="header-account">
      <span class="header-account-copy"><strong>{{ user?.tenDangNhap }}</strong><small>{{ user?.chucVu || 'Nhân viên' }}</small></span>
      <span class="staff-avatar header-avatar">{{ staffInitial }}</span>
    </div>
  </header>
</template>
