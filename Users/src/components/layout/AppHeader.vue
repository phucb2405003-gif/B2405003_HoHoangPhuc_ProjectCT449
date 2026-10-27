<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, initializeAuth, logoutReader } from '@/services/authService'
import userIcon from '@/assets/icons/user.svg'
import chevronDownIcon from '@/assets/icons/chevron-down.svg'
import chevronUpIcon from '@/assets/icons/chevron-up.svg'
import './AppHeader.css'

defineProps({
  minimal: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const isAccountMenuOpen = ref(false)
void initializeAuth()

function closeAccountMenu(event) {
  if (!event.target.closest?.('.app-header__account')) {
    isAccountMenuOpen.value = false
  }
}

function handleAccountMenuKeydown(event) {
  if (event.key === 'Escape') isAccountMenuOpen.value = false
}

function handleLogout() {
  logoutReader()
  isAccountMenuOpen.value = false
  void router.replace({ name: 'home' })
}

onMounted(() => {
  document.addEventListener('click', closeAccountMenu)
  document.addEventListener('keydown', handleAccountMenuKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAccountMenu)
  document.removeEventListener('keydown', handleAccountMenuKeydown)
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink to="/" class="app-header__brand">
        <span class="app-header__logo" aria-hidden="true">
          <img class="app-header__logo-image" src="@/assets/icons/square-library.svg" alt="" />
        </span>
        <span class="app-header__name">Thư viện trực tuyến</span>
      </RouterLink>
      <nav class="app-header__nav" aria-label="Điều hướng chính">
        <template v-if="!minimal">
          <RouterLink to="/" class="app-header__link app-header__link--active">Trang chủ</RouterLink>
          <RouterLink to="/sach" class="app-header__link">Sách</RouterLink>
          <RouterLink to="/theo-doi-muon-sach" class="app-header__link">Theo dõi mượn sách</RouterLink>
        </template>
        <RouterLink v-if="!authState.isAuthenticated && !authState.isChecking" to="/dang-nhap" class="app-header__login">Đăng nhập</RouterLink>
        <span v-else-if="authState.isChecking" class="app-header__account-loading" aria-label="Đang kiểm tra phiên đăng nhập"></span>
        <div v-else class="app-header__account" @click.stop>
          <button
            class="app-header__account-button"
            type="button"
            aria-haspopup="true"
            :aria-expanded="isAccountMenuOpen"
            @click="isAccountMenuOpen = !isAccountMenuOpen"
          >
            <span class="app-header__avatar" aria-hidden="true"><img :src="userIcon" alt="" /></span>
            <span class="app-header__account-name">{{ authState.readerName || authState.user?.tenDangNhap || authState.user?.maTaiKhoan }}</span>
            <span class="app-header__account-chevron" aria-hidden="true">
              <img :src="isAccountMenuOpen ? chevronUpIcon : chevronDownIcon" alt="" />
            </span>
          </button>
          <Transition name="account-menu">
            <div v-if="isAccountMenuOpen" class="app-header__account-menu">
              <p class="app-header__account-menu-label">Tài khoản độc giả</p>
              <div class="app-header__account-detail">
                <p class="app-header__account-menu-label">
                  {{ authState.readerName ? 'Tên độc giả' : 'Tên hiển thị (tạm dùng tên đăng nhập)' }}
                </p>
                <p class="app-header__account-menu-name">{{ authState.readerName || authState.user?.tenDangNhap }}</p>
              </div>
              <div class="app-header__account-detail">
                <p class="app-header__account-menu-label">Tên đăng nhập</p>
                <p class="app-header__account-menu-id">{{ authState.user?.tenDangNhap }}</p>
              </div>
              <div class="app-header__account-detail">
                <p class="app-header__account-menu-label">Mã độc giả</p>
                <p class="app-header__account-menu-id">{{ authState.user?.maTaiKhoan }}</p>
              </div>
              <p v-if="authState.accountActive" class="app-header__account-status">
                <span class="app-header__account-status-dot" aria-hidden="true"></span>
                Tài khoản đang hoạt động
              </p>
              <button class="app-header__logout" type="button" @click="handleLogout">Đăng xuất</button>
            </div>
          </Transition>
        </div>
      </nav>
    </div>
  </header>
</template>
