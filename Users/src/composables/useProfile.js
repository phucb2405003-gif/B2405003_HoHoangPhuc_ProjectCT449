import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, getReaderAccessToken, logoutReader } from '@/services/authService'
import useReaderProfile from '@/composables/useReaderProfile'
import useReaderPassword from '@/composables/useReaderPassword'
import useBorrowHistory from '@/composables/useBorrowHistory'

export default function useProfile() {
  const route = useRoute()
  const router = useRouter()
  const activeTab = computed(() => route.query.tab === 'muon' ? 'muon' : 'thong-tin')
  const readerId = computed(() => authState.user?.maTaiKhoan || '')
  const isReaderAccount = () => authState.user?.loaiTaiKhoan === 'DOCGIA'

  let isRedirectingToLogin = false

  async function chooseTab(tab) {
    if (activeTab.value === tab) return
    await router.replace({ name: 'reader-profile', query: { tab } })
  }

  async function handleUnauthorized(error) {
    if (error?.status !== 401 || isRedirectingToLogin) return false

    isRedirectingToLogin = true
    logoutReader()
    await redirectToLogin()
    return true
  }

  function redirectToLogin() {
    return router.replace({ name: 'login', query: { redirect: route.fullPath } })
  }

  const readerProfile = useReaderProfile({
    readerId,
    getAccessToken: getReaderAccessToken,
    isReaderAccount,
    handleUnauthorized,
    redirectToLogin,
  })
  const readerPassword = useReaderPassword({
    getAccessToken: getReaderAccessToken,
    handleUnauthorized,
    redirectToLogin,
  })
  const borrowHistory = useBorrowHistory({
    getAccessToken: getReaderAccessToken,
    isReaderAccount,
    handleUnauthorized,
    redirectToLogin,
  })

  function formatDate(value) {
    if (!value) return 'Chưa cập nhật'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật'
    return new Intl.DateTimeFormat('vi-VN').format(date)
  }

  function readerStatusClass(status) {
    const classes = {
      'Bình thường': 'normal',
      'Hạn chế': 'restricted',
      'Bị cấm': 'banned',
    }
    return classes[status] || 'unknown'
  }

  watch(activeTab, (tab) => {
    if (tab === 'muon') void borrowHistory.loadBorrows()
  }, { immediate: true })

  onMounted(readerProfile.loadProfile)

  return {
    ...readerProfile,
    ...readerPassword,
    ...borrowHistory,
    activeTab,
    authState,
    chooseTab,
    formatDate,
    readerStatusClass,
  }
}
