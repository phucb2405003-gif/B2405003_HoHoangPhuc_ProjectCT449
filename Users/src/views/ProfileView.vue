<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import useProfile from '@/composables/useProfile'
import userIcon from '@/assets/icons/user.svg'
import listIcon from '@/assets/icons/list.svg'
import trashIcon from '@/assets/icons/trash.svg'
import './ProfileView.css'

const {
  activeTab,
  authState,
  availableBookCount,
  borrowActionError,
  borrowActionNotice,
  bookNames,
  borrowableBooks,
  borrowableBooksError,
  borrowDate,
  borrowDetailErrors,
  borrowDetailLoaded,
  borrowDetailLoading,
  borrowDetails,
  borrows,
  borrowsError,
  borrowsLoaded,
  borrowsLoading,
  currentBorrowPage,
  borrowPageCount,
  paginatedBorrows,
  previousBorrowPage,
  nextBorrowPage,
  chooseTab,
  confirmPassword,
  currentPassword,
  createDraftBorrow,
  deletingBorrowIds,
  deletingDetailIds,
  submittingBorrowIds,
  submitDraftBorrow,
  expandedBorrows,
  formatDate,
  fullName,
  isChangingPassword,
  isBorrowDialogOpen,
  isCreatingBorrow,
  isLoadingBorrowableBooks,
  isPasswordFormOpen,
  loadBorrows,
  loadProfile,
  hasAvailableStock,
  newPassword,
  passwordError,
  passwordNotice,
  profile,
  profileError,
  profileLoading,
  isProfileEditOpen,
  isUpdatingProfile,
  profileForm,
  profileUpdateError,
  profileUpdateNotice,
  readerStatusClass,
  cancelProfileEdit,
  openProfileEditor,
  saveReaderProfile,
  removeDraftBook,
  removeDraftBorrow,
  selectedBookIds,
  statusClass,
  submitPasswordChange,
  toggleBorrowDetails,
  toggleBookSelection,
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
            <p v-if="profileUpdateNotice" class="reader-profile-notice" role="status">{{ profileUpdateNotice }}</p>
            <dl class="reader-profile-fields">
              <div class="reader-profile-field reader-profile-field--wide"><dt>Họ và tên</dt><dd>{{ fullName || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Mã độc giả</dt><dd>{{ profile.maDocGia || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Tên đăng nhập</dt><dd>{{ authState.user?.tenDangNhap || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Ngày sinh</dt><dd>{{ formatDate(profile.ngaySinh) }}</dd></div>
              <div><dt>Giới tính</dt><dd>{{ profile.phai === true ? 'Nam' : profile.phai === false ? 'Nữ' : 'Chưa cập nhật' }}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{{ profile.dienThoai || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Email</dt><dd>{{ authState.user?.email || 'Chưa cập nhật' }}</dd></div>
              <div><dt>Địa chỉ</dt><dd>{{ profile.diaChi || 'Chưa cập nhật' }}</dd></div>
              <div class="reader-profile-reader-status"><dt>Trạng thái độc giả</dt><dd><span v-if="profile.trangThai" class="reader-profile-reader-status__badge" :class="`reader-profile-reader-status__badge--${readerStatusClass(profile.trangThai)}`">{{ profile.trangThai }}</span><span v-else>Chưa cập nhật</span></dd></div>
            </dl>

            <button v-if="!isProfileEditOpen" type="button" class="reader-profile-primary-button reader-profile-edit-button" @click="openProfileEditor">Chỉnh sửa thông tin</button>
            <form v-if="isProfileEditOpen" class="reader-password-form reader-profile-edit-form" @submit.prevent="saveReaderProfile">
              <label>Họ lót<input v-model="profileForm.hoLot" type="text" autocomplete="family-name" maxlength="100" required :disabled="isUpdatingProfile" /></label>
              <label>Tên<input v-model="profileForm.ten" type="text" autocomplete="given-name" maxlength="100" required :disabled="isUpdatingProfile" /></label>
              <label>Ngày sinh<input v-model="profileForm.ngaySinh" type="date" :disabled="isUpdatingProfile" /></label>
              <label>Giới tính<select v-model="profileForm.phai" required :disabled="isUpdatingProfile"><option :value="null" disabled>Chọn giới tính</option><option :value="true">Nam</option><option :value="false">Nữ</option></select></label>
              <label>Số điện thoại<input v-model="profileForm.dienThoai" type="tel" autocomplete="tel" maxlength="30" :disabled="isUpdatingProfile" /></label>
              <label>Địa chỉ<input v-model="profileForm.diaChi" type="text" autocomplete="street-address" maxlength="250" :disabled="isUpdatingProfile" /></label>
              <p v-if="profileUpdateError" class="reader-profile-state--error" role="alert">{{ profileUpdateError }}</p>
              <div class="reader-profile-edit-actions">
                <button type="button" class="reader-borrow-picker__cancel" :disabled="isUpdatingProfile" @click="cancelProfileEdit">Hủy</button>
                <button type="submit" class="reader-profile-primary-button" :disabled="isUpdatingProfile">{{ isUpdatingProfile ? 'Đang lưu…' : 'Lưu thông tin' }}</button>
              </div>
            </form>

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

          <p v-if="borrowActionNotice" class="reader-profile-notice" role="status">{{ borrowActionNotice }}</p>
          <p v-if="borrowActionError" class="reader-profile-state reader-profile-state--error" role="alert">{{ borrowActionError }}</p>

          <div v-if="borrowsLoading" class="reader-profile-state" role="status">Đang tải phiếu mượn…</div>
          <div v-else-if="borrowsError" class="reader-profile-state reader-profile-state--error" role="alert">
            <p>{{ borrowsError }}</p>
            <button type="button" @click="borrowsLoaded = false; loadBorrows()">Thử tải lại</button>
          </div>
          <div v-else-if="borrowsLoaded && !borrows.length" class="reader-profile-state">Chưa có phiếu mượn.</div>
          <div v-else class="reader-borrow-list">
            <article v-for="borrow in paginatedBorrows" :key="borrow.maPhieu" class="reader-borrow-card">
              <div class="reader-borrow-card__summary">
                <div class="reader-borrow-card__code"><span>Mã phiếu</span><strong>{{ borrow.maPhieu || 'Chưa cập nhật' }}</strong></div>
                <div><span>{{ borrowDate(borrow).label }}</span><strong>{{ formatDate(borrowDate(borrow).value) }}</strong></div>
                <div><span>Số sách</span><strong>{{ Number.isSafeInteger(borrow.soLuong) ? borrow.soLuong : 'Chưa cập nhật' }}</strong></div>
                <div><span>Trạng thái phiếu</span><strong class="reader-borrow-status" :class="`reader-borrow-status--${statusClass(borrow.trangThai)}`">{{ borrow.trangThai || 'Chưa cập nhật' }}</strong></div>
                <div class="reader-borrow-card__actions">
                  <button type="button" class="reader-borrow-details-toggle" :aria-expanded="Boolean(expandedBorrows[borrow.maPhieu])" @click="toggleBorrowDetails(borrow)">
                    {{ expandedBorrows[borrow.maPhieu] ? 'Ẩn chi tiết' : 'Xem chi tiết' }}
                  </button>
                  <button
                    v-if="borrow.trangThai === 'Đang chọn sách'"
                    type="button"
                    class="reader-borrow-submit-button"
                    :disabled="Boolean(submittingBorrowIds[borrow.maPhieu] || deletingBorrowIds[borrow.maPhieu])"
                    @click="submitDraftBorrow(borrow)"
                  >
                    {{ submittingBorrowIds[borrow.maPhieu] ? 'Đang gửi…' : 'Gửi duyệt' }}
                  </button>
                  <button
                    v-if="borrow.trangThai === 'Đang chọn sách'"
                    type="button"
                    class="reader-borrow-delete-button"
                    :disabled="Boolean(deletingBorrowIds[borrow.maPhieu] || submittingBorrowIds[borrow.maPhieu])"
                    :title="`Hủy phiếu nháp ${borrow.maPhieu}`"
                    :aria-label="`Hủy phiếu nháp ${borrow.maPhieu}`"
                    @click="removeDraftBorrow(borrow)"
                  >
                    <img :src="trashIcon" alt="" aria-hidden="true" />
                    {{ deletingBorrowIds[borrow.maPhieu] ? 'Đang hủy…' : 'Hủy phiếu nháp' }}
                  </button>
                </div>
              </div>

              <div v-if="borrow.trangThai === 'Từ chối'" class="reader-borrow-rejection-reason">
                <strong>Lý do từ chối:</strong>
                <span>{{ typeof borrow.lyDoTuChoi === 'string' && borrow.lyDoTuChoi.trim() ? borrow.lyDoTuChoi : 'Chưa cập nhật' }}</span>
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
                    <div class="reader-borrow-book__info">
                      <div class="reader-borrow-book__field"><span>Tên sách</span><strong>{{ bookNames[detail.maSach] || detail.maSach || 'Chưa cập nhật' }}</strong></div>
                      <div class="reader-borrow-book__field"><span>Mã sách</span><strong>{{ detail.maSach || 'Chưa cập nhật' }}</strong></div>
                      <div class="reader-borrow-book__field"><span>Trạng thái sách</span><strong class="reader-borrow-status" :class="`reader-borrow-status--${statusClass(detail.trangThai)}`">{{ detail.trangThai || 'Chưa cập nhật' }}</strong></div>
                      <div class="reader-borrow-book__field"><span>Hạn trả</span><strong>{{ formatDate(detail.hanTra) }}</strong></div>
                    </div>
                    <button
                      v-if="borrow.trangThai === 'Đang chọn sách' && detail.trangThai === 'Đang chọn sách'"
                      type="button"
                      class="reader-borrow-delete-button"
                      :disabled="Boolean(deletingBorrowIds[borrow.maPhieu] || submittingBorrowIds[borrow.maPhieu] || deletingDetailIds[`${borrow.maPhieu}:${detail.maSach}`])"
                      :title="`Xóa ${bookNames[detail.maSach] || detail.maSach} khỏi phiếu nháp`"
                      :aria-label="`Xóa ${bookNames[detail.maSach] || detail.maSach} khỏi phiếu nháp ${borrow.maPhieu}`"
                      @click="removeDraftBook(borrow, detail)"
                    >
                      <img :src="trashIcon" alt="" aria-hidden="true" />
                      {{ deletingDetailIds[`${borrow.maPhieu}:${detail.maSach}`] ? 'Đang xóa…' : 'Xóa sách' }}
                    </button>
                  </article>
                </div>
              </div>
            </article>
          </div>

          <nav v-if="!borrowsLoading && !borrowsError && borrowsLoaded && borrows.length" class="reader-borrow-pagination" aria-label="Phân trang phiếu mượn">
            <button type="button" :disabled="currentBorrowPage <= 1" @click="previousBorrowPage">Trước</button>
            <span>Trang {{ currentBorrowPage }} / {{ borrowPageCount }}</span>
            <button type="button" :disabled="currentBorrowPage >= borrowPageCount" @click="nextBorrowPage">Sau</button>
          </nav>

          <div v-if="isBorrowDialogOpen" class="reader-borrow-picker-backdrop" @click.self="!isCreatingBorrow && (isBorrowDialogOpen = false)">
            <section class="reader-borrow-picker" role="dialog" aria-modal="true" aria-labelledby="reader-borrow-picker-title">
              <header class="reader-borrow-picker__header">
                <div><p>LẬP PHIẾU NHÁP</p><h2 id="reader-borrow-picker-title">Chọn sách muốn mượn</h2></div>
                <button type="button" class="reader-borrow-picker__close" aria-label="Đóng" :disabled="isCreatingBorrow" @click="isBorrowDialogOpen = false">×</button>
              </header>
              <p class="reader-borrow-picker__count">Đã chọn {{ selectedBookIds.length }} / 5 cuốn</p>
              <p v-if="isLoadingBorrowableBooks" class="reader-profile-state" role="status">Đang tải danh sách sách…</p>
              <p v-else-if="borrowableBooksError" class="reader-profile-state reader-profile-state--error" role="alert">{{ borrowableBooksError }}</p>
              <p v-else-if="!borrowableBooks.length" class="reader-profile-state">Hiện chưa có sách khả dụng để đăng ký mượn.</p>
              <div v-else class="reader-borrow-picker__list">
                <label v-for="book in borrowableBooks" :key="book.maSach" class="reader-borrow-picker__option" :class="{ 'reader-borrow-picker__option--unavailable': !hasAvailableStock(book) }">
                  <input
                    type="checkbox"
                    :checked="selectedBookIds.includes(book.maSach)"
                    :disabled="isCreatingBorrow || (!selectedBookIds.includes(book.maSach) && (!hasAvailableStock(book) || selectedBookIds.length >= 5))"
                    @change="toggleBookSelection(book.maSach)"
                  />
                  <span class="reader-borrow-picker__book">
                    <strong>{{ book.tenSach || 'Chưa cập nhật tên sách' }}</strong>
                    <span>{{ book.tacGia || 'Chưa cập nhật tác giả' }} · {{ book.maSach }}</span>
                  </span>
                  <span class="reader-borrow-picker__stock">{{ availableBookCount(book) === null ? 'Chưa cập nhật tồn kho' : `${availableBookCount(book)} quyển khả dụng` }}</span>
                </label>
              </div>
              <p v-if="borrowActionError" class="reader-profile-state reader-profile-state--error" role="alert">{{ borrowActionError }}</p>
              <footer class="reader-borrow-picker__footer">
                <button type="button" class="reader-borrow-picker__cancel" :disabled="isCreatingBorrow" @click="isBorrowDialogOpen = false">Đóng</button>
                <button type="button" class="reader-profile-primary-button" :disabled="isCreatingBorrow || !selectedBookIds.length || selectedBookIds.length > 5" @click="createDraftBorrow">
                  {{ isCreatingBorrow ? 'Đang tạo phiếu…' : 'Tạo phiếu nháp' }}
                </button>
              </footer>
            </section>
          </div>
        </section>
      </section>
    </main>

    <AppFooter />
  </div>
</template>
