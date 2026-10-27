<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { authState, getReaderAccessToken, logoutReader } from '@/services/authService'
import { getBook, getBorrowDetails, getMyBorrows } from '@/services/borrowingService'
import { changeReaderPassword, getReaderProfile } from '@/services/readerProfileService'
import userIcon from '@/assets/icons/user.svg'
import listIcon from '@/assets/icons/list.svg'
import './ProfileView.css'

const route = useRoute()
const router = useRouter()
const activeTab = computed(() => route.query.tab === 'muon' ? 'muon' : 'thong-tin')
const readerId = computed(() => authState.user?.maTaiKhoan || '')

const profile = ref(null)
const profileLoading = ref(true)
const profileError = ref('')
const borrows = ref([])
const borrowsLoading = ref(false)
const borrowsLoaded = ref(false)
const borrowsError = ref('')
const expandedBorrows = ref({})
const borrowDetails = ref({})
const borrowDetailLoading = ref({})
const borrowDetailLoaded = ref({})
const borrowDetailErrors = ref({})
const bookNames = ref({})

const isPasswordFormOpen = ref(false)
const isChangingPassword = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const passwordNotice = ref('')
let isRedirectingToLogin = false

const fullName = computed(() => [profile.value?.hoLot, profile.value?.ten]
  .filter((part) => typeof part === 'string' && part.trim())
  .map((part) => part.trim())
  .join(' '))

async function chooseTab(tab) {
  if (activeTab.value === tab) return
  await router.replace({ name: 'reader-profile', query: { tab } })
}

async function handleUnauthorized(error) {
  if (error?.status !== 401 || isRedirectingToLogin) return false

  isRedirectingToLogin = true
  logoutReader()
  await router.replace({ name: 'login', query: { redirect: route.fullPath } })
  return true
}

async function loadProfile() {
  const token = getReaderAccessToken()
  if (!token || !readerId.value || authState.user?.loaiTaiKhoan !== 'DOCGIA') {
    profileLoading.value = false
    await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  profileLoading.value = true
  profileError.value = ''
  try {
    const result = await getReaderProfile(readerId.value, token)
    if (result?.maDocGia !== readerId.value) {
      throw new Error('Thông tin hồ sơ không khớp với tài khoản đang đăng nhập.')
    }
    profile.value = result
  } catch (error) {
    if (await handleUnauthorized(error)) return
    profileError.value = error.message || 'Không thể tải thông tin cá nhân.'
  } finally {
    profileLoading.value = false
  }
}

async function loadBorrows() {
  if (borrowsLoaded.value || borrowsLoading.value) return
  const token = getReaderAccessToken()
  if (!token || authState.user?.loaiTaiKhoan !== 'DOCGIA') {
    await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  borrowsLoading.value = true
  borrowsError.value = ''
  try {
    const result = await getMyBorrows(token)
    if (!Array.isArray(result)) throw new Error('Máy chủ trả về danh sách phiếu mượn không hợp lệ.')
    borrows.value = result
    borrowsLoaded.value = true
  } catch (error) {
    if (await handleUnauthorized(error)) return
    borrowsError.value = error.message || 'Không thể tải lịch sử mượn sách.'
  } finally {
    borrowsLoading.value = false
  }
}

async function toggleBorrowDetails(borrow) {
  const maPhieu = borrow.maPhieu
  if (!maPhieu) return
  expandedBorrows.value[maPhieu] = !expandedBorrows.value[maPhieu]
  if (!expandedBorrows.value[maPhieu] || borrowDetailLoaded.value[maPhieu] || borrowDetailLoading.value[maPhieu]) return

  const token = getReaderAccessToken()
  if (!token) {
    await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  borrowDetailLoading.value[maPhieu] = true
  borrowDetailErrors.value[maPhieu] = ''
  try {
    const rows = await getBorrowDetails(maPhieu, token)
    if (!Array.isArray(rows)) throw new Error('Máy chủ trả về chi tiết phiếu không hợp lệ.')
    borrowDetails.value[maPhieu] = rows
    borrowDetailLoaded.value[maPhieu] = true

    const resolvedNames = await Promise.all(rows.map(async (detail) => {
      try {
        const book = await getBook(detail.maSach, token)
        return [detail.maSach, typeof book?.tenSach === 'string' ? book.tenSach : null]
      } catch (error) {
        if (await handleUnauthorized(error)) return [detail.maSach, null]
        return [detail.maSach, null]
      }
    }))
    bookNames.value = { ...bookNames.value, ...Object.fromEntries(resolvedNames) }
  } catch (error) {
    if (!await handleUnauthorized(error)) {
      borrowDetailErrors.value[maPhieu] = error.message || 'Không thể tải chi tiết phiếu mượn.'
    }
  } finally {
    borrowDetailLoading.value[maPhieu] = false
  }
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật'
  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function borrowDate(borrow) {
  if (borrow.ngayYeuCau) return { label: 'Ngày yêu cầu', value: borrow.ngayYeuCau }
  if (borrow.ngayMuon) return { label: 'Ngày mượn', value: borrow.ngayMuon }
  return { label: 'Ngày', value: null }
}

function statusClass(status) {
  const classes = {
    'Chờ duyệt': 'pending',
    'Đã duyệt': 'approved',
    'Từ chối': 'rejected',
    Hủy: 'cancelled',
    'Đang mượn': 'borrowed',
    'Đã trả': 'returned',
  }
  return classes[status] || 'unknown'
}

function passwordMeetsBackendRules(value) {
  return [...value].length >= 8 &&
    !/^\s*$/u.test(value) &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9\s]/u.test(value)
}

function clearPasswordFields() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

async function submitPasswordChange() {
  passwordError.value = ''
  passwordNotice.value = ''
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu.'
    return
  }
  if (!passwordMeetsBackendRules(newPassword.value)) {
    passwordError.value = 'Mật khẩu mới cần ít nhất 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Mật khẩu xác nhận không khớp.'
    return
  }

  const token = getReaderAccessToken()
  if (!token) {
    await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    return
  }

  isChangingPassword.value = true
  try {
    await changeReaderPassword(currentPassword.value, newPassword.value, token)
    clearPasswordFields()
    isPasswordFormOpen.value = false
    passwordNotice.value = 'Đổi mật khẩu thành công.'
  } catch (error) {
    if (await handleUnauthorized(error)) return
    const message = String(error.message || '')
    passwordError.value = message.toLocaleLowerCase('vi').includes('mat khau hien tai khong dung')
      ? 'Mật khẩu hiện tại không đúng.'
      : message || 'Không thể đổi mật khẩu. Vui lòng thử lại.'
  } finally {
    isChangingPassword.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'muon') void loadBorrows()
}, { immediate: true })

onMounted(loadProfile)
</script>

<template>
  <div class="reader-profile-page">
    <AppHeader :minimal="true" />

    <main>
      <section class="reader-profile-banner" aria-labelledby="reader-profile-title">
        <img class="reader-profile-banner__image" src="@/assets/images/banner.jpg" alt="Không gian thư viện" />
        <div class="reader-profile-banner__overlay" aria-hidden="true"></div>
        <div class="reader-profile-banner__content">
          <p class="reader-profile-banner__eyebrow">TÀI KHOẢN ĐỘC GIẢ</p>
          <h1 id="reader-profile-title">Trang cá nhân</h1>
          <p>Quản lý thông tin cá nhân và theo dõi các phiếu mượn sách.</p>
        </div>
      </section>

      <section class="reader-profile-content" aria-label="Khu vực cá nhân độc giả">
        <nav class="reader-profile-tabs" role="tablist" aria-label="Các mục trang cá nhân">
          <button
            id="reader-profile-tab-info"
            type="button"
            role="tab"
            aria-controls="reader-profile-panel-info"
            :aria-selected="activeTab === 'thong-tin'"
            :class="{ 'is-active': activeTab === 'thong-tin' }"
            @click="chooseTab('thong-tin')"
          >Thông tin cá nhân</button>
          <button
            id="reader-profile-tab-borrows"
            type="button"
            role="tab"
            aria-controls="reader-profile-panel-borrows"
            :aria-selected="activeTab === 'muon'"
            :class="{ 'is-active': activeTab === 'muon' }"
            @click="chooseTab('muon')"
          >Theo dõi mượn sách</button>
        </nav>

        <section v-if="activeTab === 'thong-tin'" id="reader-profile-panel-info" class="reader-profile-panel" role="tabpanel" aria-labelledby="reader-profile-tab-info">
          <div class="reader-profile-section-heading">
            <span class="reader-profile-section-heading__icon"><img :src="userIcon" alt="" aria-hidden="true" /></span>
            <div><p>HỒ SƠ ĐỘC GIẢ</p><h2>Thông tin cá nhân</h2></div>
          </div>

          <div v-if="profileLoading" class="reader-profile-state" role="status">Đang tải thông tin cá nhân…</div>
          <div v-else-if="profileError" class="reader-profile-state reader-profile-state--error" role="alert">
            <p>{{ profileError }}</p>
            <button type="button" @click="loadProfile">Thử tải lại</button>
          </div>
          <template v-else-if="profile">
            <dl class="reader-profile-fields">
              <div class="reader-profile-field reader-profile-field--wide"><dt>Họ và tên</dt><dd>{{ fullName || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Mã độc giả</dt><dd>{{ profile.maDocGia || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Tên đăng nhập</dt><dd>{{ authState.user?.tenDangNhap || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Ngày sinh</dt><dd>{{ formatDate(profile.ngaySinh) }}</dd></div>
              <div><dt>Giới tính</dt><dd>{{ profile.phai || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{{ profile.dienThoai || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Email</dt><dd>{{ authState.user?.email || 'Chưa cập nhật' }}</dd></div>
              <div class="reader-profile-field--wide"><dt>Địa chỉ</dt><dd>{{ profile.diaChi || 'Chưa cập nhật' }}</dd></div>
            </dl>

            <p class="reader-profile-edit-note">Chỉnh sửa hồ sơ hiện chưa được hỗ trợ cho độc giả. API cập nhật hồ sơ chỉ cho phép Quản lý.</p>

            <section class="reader-password-card" aria-labelledby="reader-password-title">
              <div class="reader-password-card__heading">
                <div><p>BẢO MẬT</p><h3 id="reader-password-title">Đổi mật khẩu</h3></div>
                <button type="button" class="reader-password-toggle" :aria-expanded="isPasswordFormOpen" @click="isPasswordFormOpen = !isPasswordFormOpen; passwordError = ''">
                  {{ isPasswordFormOpen ? 'Đóng' : 'Đổi mật khẩu' }}
                </button>
              </div>
              <p v-if="passwordNotice" class="reader-profile-notice" role="status">{{ passwordNotice }}</p>
              <form v-if="isPasswordFormOpen" class="reader-password-form" @submit.prevent="submitPasswordChange">
                <label>Mật khẩu hiện tại<input v-model="currentPassword" type="password" autocomplete="current-password" :disabled="isChangingPassword" /></label>
                <label>Mật khẩu mới<input v-model="newPassword" type="password" autocomplete="new-password" :disabled="isChangingPassword" /></label>
                <label>Xác nhận mật khẩu mới<input v-model="confirmPassword" type="password" autocomplete="new-password" :disabled="isChangingPassword" /></label>
                <p v-if="passwordError" class="reader-profile-state--error" role="alert">{{ passwordError }}</p>
                <button class="reader-profile-primary-button" type="submit" :disabled="isChangingPassword">{{ isChangingPassword ? 'Đang cập nhật…' : 'Lưu mật khẩu mới' }}</button>
              </form>
            </section>
          </template>
        </section>

        <section v-else id="reader-profile-panel-borrows" class="reader-profile-panel" role="tabpanel" aria-labelledby="reader-profile-tab-borrows">
          <div class="reader-profile-section-heading">
            <span class="reader-profile-section-heading__icon"><img :src="listIcon" alt="" aria-hidden="true" /></span>
            <div><p>LỊCH SỬ MƯỢN SÁCH</p><h2>Theo dõi mượn sách</h2></div>
          </div>

          <div v-if="borrowsLoading" class="reader-profile-state" role="status">Đang tải phiếu mượn…</div>
          <div v-else-if="borrowsError" class="reader-profile-state reader-profile-state--error" role="alert">
            <p>{{ borrowsError }}</p>
            <button type="button" @click="borrowsLoaded = false; loadBorrows()">Thử tải lại</button>
          </div>
          <div v-else-if="borrowsLoaded && !borrows.length" class="reader-profile-state">Chưa có phiếu mượn.</div>
          <div v-else class="reader-borrow-list">
            <article v-for="borrow in borrows" :key="borrow.maPhieu" class="reader-borrow-card">
              <div class="reader-borrow-card__summary">
                <div class="reader-borrow-card__code"><span>Mã phiếu</span><strong>{{ borrow.maPhieu || 'Chưa cập nhật' }}</strong></div>
                <div><span>{{ borrowDate(borrow).label }}</span><strong>{{ formatDate(borrowDate(borrow).value) }}</strong></div>
                <div><span>Số sách</span><strong>{{ Number.isSafeInteger(borrow.soLuong) ? borrow.soLuong : 'Chưa cập nhật' }}</strong></div>
                <div><span>Trạng thái phiếu</span><strong class="reader-borrow-status" :class="`reader-borrow-status--${statusClass(borrow.trangThai)}`">{{ borrow.trangThai || 'Chưa cập nhật' }}</strong></div>
                <button type="button" class="reader-borrow-details-toggle" :aria-expanded="Boolean(expandedBorrows[borrow.maPhieu])" @click="toggleBorrowDetails(borrow)">
                  {{ expandedBorrows[borrow.maPhieu] ? 'Ẩn chi tiết' : 'Xem chi tiết' }}
                </button>
              </div>

              <div v-if="expandedBorrows[borrow.maPhieu]" class="reader-borrow-details">
                <p v-if="borrowDetailLoading[borrow.maPhieu]" class="reader-profile-state" role="status">Đang tải chi tiết phiếu…</p>
                <div v-else-if="borrowDetailErrors[borrow.maPhieu]" class="reader-profile-state reader-profile-state--error" role="alert">
                  <p>{{ borrowDetailErrors[borrow.maPhieu] }}</p>
                  <button type="button" @click="borrowDetailLoaded[borrow.maPhieu] = false; expandedBorrows[borrow.maPhieu] = false; toggleBorrowDetails(borrow)">Thử tải lại</button>
                </div>
                <p v-else-if="borrowDetailLoaded[borrow.maPhieu] && !borrowDetails[borrow.maPhieu]?.length" class="reader-profile-state">Phiếu chưa có chi tiết sách.</p>
                <div v-else class="reader-borrow-books">
                  <article v-for="detail in borrowDetails[borrow.maPhieu]" :key="`${detail.maPhieu}-${detail.maSach}`" class="reader-borrow-book">
                    <div><span>Tên sách</span><strong>{{ bookNames[detail.maSach] || detail.maSach || 'Chưa cập nhật' }}</strong></div>
                    <div><span>Mã sách</span><strong>{{ detail.maSach || 'Chưa cập nhật' }}</strong></div>
                    <div><span>Trạng thái sách</span><strong class="reader-borrow-status" :class="`reader-borrow-status--${statusClass(detail.trangThai)}`">{{ detail.trangThai || 'Chưa cập nhật' }}</strong></div>
                    <div><span>Hạn trả</span><strong>{{ formatDate(detail.hanTra) }}</strong></div>
                  </article>
                </div>
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>

    <AppFooter />
  </div>
</template>
