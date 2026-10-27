<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import useProfile from '@/composables/useProfile'
import userIcon from '@/assets/icons/user.svg'
import listIcon from '@/assets/icons/list.svg'
import './ProfileView.css'

const {
  activeTab,
  authState,
  bookNames,
  borrowDate,
  borrowDetailErrors,
  borrowDetailLoaded,
  borrowDetailLoading,
  borrowDetails,
  borrows,
  borrowsError,
  borrowsLoaded,
  borrowsLoading,
  chooseTab,
  confirmPassword,
  currentPassword,
  expandedBorrows,
  formatDate,
  fullName,
  isChangingPassword,
  isPasswordFormOpen,
  loadBorrows,
  loadProfile,
  newPassword,
  passwordError,
  passwordNotice,
  profile,
  profileError,
  profileLoading,
  statusClass,
  submitPasswordChange,
  toggleBorrowDetails,
} = useProfile()
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
