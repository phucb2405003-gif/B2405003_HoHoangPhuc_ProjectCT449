import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, logoutStaff } from '@/services/authService'

export default function useAdminLayout() {
  const router = useRouter()
  const isTablet = () => typeof window !== 'undefined' && window.innerWidth > 760 && window.innerWidth <= 1024
  const isCollapsed = ref(isTablet())
  const isMobileMenuOpen = ref(false)
  const staffInitial = computed(() => authState.user?.tenDangNhap?.charAt(0)?.toLocaleUpperCase('vi') || 'N')
  let wasTablet = isTablet()

  function syncViewport() {
    const tabletNow = isTablet()
    if (tabletNow !== wasTablet) isCollapsed.value = tabletNow
    if (window.innerWidth > 760) isMobileMenuOpen.value = false
    wasTablet = tabletNow
  }

  function logout() {
    logoutStaff()
    router.replace({ name: 'login' })
  }

  onMounted(() => window.addEventListener('resize', syncViewport))
  onUnmounted(() => window.removeEventListener('resize', syncViewport))

  return { isCollapsed, isMobileMenuOpen, staffInitial, logout }
}
