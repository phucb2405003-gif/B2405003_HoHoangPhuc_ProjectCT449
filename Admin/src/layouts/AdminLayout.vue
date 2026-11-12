<script setup>
import AdminHeader from '@/components/layout/AdminHeader.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import useAdminLayout from '@/composables/useAdminLayout'
import { nextTick, watch } from 'vue'
import { authState } from '@/services/authService'
import '@/components/layout/AdminLayout.css'

const { isCollapsed, isMobileMenuOpen, isMobileViewport, staffInitial, logout } = useAdminLayout()

watch(isMobileMenuOpen, async (isOpen) => {
  if (isOpen || !isMobileViewport.value) return
  await nextTick()
  const sidebar = document.querySelector('.admin-sidebar')
  if (sidebar?.contains(document.activeElement)) {
    document.querySelector('.mobile-toggle')?.focus()
  }
})
</script>

<template>
  <div class="admin-shell" :class="{ 'is-collapsed': isCollapsed, 'mobile-menu-open': isMobileMenuOpen }">
    <button v-if="isMobileMenuOpen" class="sidebar-backdrop" type="button" aria-label="Đóng menu" @click="isMobileMenuOpen = false"></button>

    <AdminSidebar
      :user="authState.user"
      :staff-initial="staffInitial"
      :inert="isMobileViewport && !isMobileMenuOpen"
      :aria-hidden="isMobileViewport && !isMobileMenuOpen ? 'true' : undefined"
      @close-mobile="isMobileMenuOpen = false"
      @logout="logout"
    />

    <div class="admin-main">
      <AdminHeader
        :user="authState.user"
        :staff-initial="staffInitial"
        :is-collapsed="isCollapsed"
        :is-mobile-menu-open="isMobileMenuOpen"
        @toggle-mobile="isMobileMenuOpen = !isMobileMenuOpen"
        @toggle-sidebar="isCollapsed = !isCollapsed"
      />
      <main class="admin-content"><RouterView /></main>
    </div>
  </div>
</template>
