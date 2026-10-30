<script setup>
import { computed } from 'vue'
import { adminNavigation, canOpenModule, navigationSections } from '@/data/permissions'
import libraryIcon from '@/assets/icons/square-library.svg'
import bookIcon from '@/assets/icons/book-open-text.svg'
import readerIcon from '@/assets/icons/user.svg'
import borrowIcon from '@/assets/icons/book-lock.svg'
import publisherIcon from '@/assets/icons/publisher.svg'
import dashboardIcon from '@/assets/icons/panels-top-left.svg'
import employeeIcon from '@/assets/icons/id-card-lanyard.svg'
import profileIcon from '@/assets/icons/file-user.svg'

const props = defineProps({
  user: { type: Object, default: null },
  staffInitial: { type: String, default: 'N' },
})

const emit = defineEmits(['close-mobile', 'logout'])
const visibleSections = computed(() => navigationSections.map((section) => ({
  ...section,
  items: adminNavigation.filter((item) => item.section === section.key && canOpenModule(props.user?.chucVu, item.key)),
})).filter((section) => section.items.length))
const iconByName = {
  'panels-top-left': dashboardIcon,
  'book-open-text': bookIcon,
  user: readerIcon,
  'book-lock': borrowIcon,
  publisher: publisherIcon,
  'id-card-lanyard': employeeIcon,
  'file-user': profileIcon,
}
</script>

<template>
  <aside class="admin-sidebar" aria-label="Điều hướng quản trị">
    <RouterLink class="sidebar-brand" to="/dashboard" aria-label="QLMS - Tổng quan" @click="emit('close-mobile')">
      <span class="sidebar-logo"><img :src="libraryIcon" alt="" aria-hidden="true"></span>
      <span class="sidebar-brand-copy"><strong>QLMS</strong><small>QUẢN LÝ THƯ VIỆN</small></span>
    </RouterLink>

    <nav class="sidebar-nav" aria-label="Chức năng chính">
      <section v-for="section in visibleSections" :key="section.key" class="sidebar-nav-section">
        <p class="sidebar-section-label">{{ section.label }}</p>
        <RouterLink v-for="item in section.items" :key="item.key" class="sidebar-link" active-class="is-active" exact-active-class="is-exact-active" :to="item.to" @click="emit('close-mobile')">
          <img class="sidebar-link-icon" :src="iconByName[item.icon]" alt="" aria-hidden="true">
          <span class="sidebar-link-label">{{ item.label }}</span>
        </RouterLink>
      </section>
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
