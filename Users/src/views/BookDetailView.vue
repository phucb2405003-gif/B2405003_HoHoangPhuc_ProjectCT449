<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { authState } from '@/services/authService'
import useBookDetail from '@/composables/useBookDetail'
import authorIcon from '@/assets/icons/author.svg'
import bookIcon from '@/assets/icons/book-open-text.svg'
import bookBorrowIcon from '@/assets/icons/book-lock.svg'
import calendarIcon from '@/assets/icons/calendar.svg'
import circleCheckIcon from '@/assets/icons/circle-check.svg'
import circleXIcon from '@/assets/icons/circle-x.svg'
import pageIcon from '@/assets/icons/page.svg'
import publisherIcon from '@/assets/icons/publisher.svg'
import tagIcon from '@/assets/icons/tag.svg'
import './BookDetailView.css'

const {
  activeDuplicate,
  author,
  availableCopies,
  book,
  borrowDetailsById,
  borrowError,
  borrowNotice,
  createNewBorrow,
  genre,
  goBackToBooks,
  isBorrowDialogOpen,
  isCreatingBorrow,
  isLoading,
  isLoadingBorrows,
  loadError,
  openBorrowDialog,
  pendingBorrows,
  publisher,
  selectedBorrowHasBook,
  selectedBorrowId,
  title,
} = useBookDetail()
</script>

<template>
  <div class="book-detail-page">
    <AppHeader :minimal="true" />

    <main>
      <section class="book-detail-banner" aria-labelledby="book-detail-banner-title">
        <img class="book-detail-banner__image" src="@/assets/images/banner.jpg" alt="Không gian thư viện" />
        <div class="book-detail-banner__overlay" aria-hidden="true"></div>
        <div class="book-detail-banner__content">
          <p class="book-detail-banner__eyebrow">KHÁM PHÁ TRI THỨC</p>
          <h1 id="book-detail-banner-title">Chi tiết sách</h1>
          <p>Thông tin và tình trạng bản sách trong thư viện.</p>
        </div>
      </section>

      <section class="book-detail-content" aria-label="Thông tin chi tiết sách">
        <button class="book-detail-back" type="button" @click="goBackToBooks">← Quay lại danh sách sách</button>

        <p v-if="borrowNotice" class="book-detail-notice" role="status" aria-live="polite">{{ borrowNotice }}</p>

        <div v-if="isLoading" class="book-detail-message" role="status">Đang tải thông tin sách…</div>
        <div v-else-if="loadError" class="book-detail-message" role="alert">
          <p>{{ loadError }}</p>
          <RouterLink v-if="!authState.isAuthenticated" :to="{ name: 'login' }">Đăng nhập</RouterLink>
        </div>
        <template v-else-if="book">
          <div class="book-detail-layout">
            <article class="book-detail-card book-detail-main-card">
              <div class="book-detail-cover">
                <img v-if="book.cover" :src="book.cover" :alt="`Bìa sách ${title}`" />
                <img v-else class="book-detail-cover__placeholder" :src="bookIcon" alt="" aria-hidden="true" />
              </div>

              <div class="book-detail-main-card__body">
                <h2>{{ title }}</h2>
                <p class="book-detail-author">
                  <img :src="authorIcon" alt="" aria-hidden="true" />
                  <span>{{ author || 'Chưa cập nhật tác giả' }}</span>
                </p>

                <div class="book-detail-separator"></div>

                <section class="book-detail-genre" aria-label="Thể loại sách">
                  <div class="book-detail-section-label">
                    <img :src="tagIcon" alt="" aria-hidden="true" />
                    <span>Thể loại sách</span>
                  </div>
                  <span class="book-detail-tag">{{ genre || 'Chưa cập nhật' }}</span>
                </section>

                <div class="book-detail-separator"></div>

                <dl class="book-detail-meta">
                  <div>
                    <img :src="publisherIcon" alt="" aria-hidden="true" />
                    <dt>Nhà xuất bản</dt><dd>{{ publisher || 'Chưa cập nhật' }}</dd>
                  </div>
                  <div>
                    <img :src="calendarIcon" alt="" aria-hidden="true" />
                    <dt>Năm xuất bản</dt><dd>Chưa cập nhật</dd>
                  </div>
                  <div>
                    <img :src="pageIcon" alt="" aria-hidden="true" />
                    <dt>Số quyển khả dụng</dt><dd>{{ availableCopies === null ? 'Chưa cập nhật' : availableCopies }}</dd>
                  </div>
                </dl>

                <div class="book-detail-separator"></div>

                <div class="book-detail-stock-line" :class="{ 'book-detail-stock-line--available': availableCopies > 0, 'book-detail-stock-line--empty': availableCopies === 0 }">
                  <img v-if="availableCopies > 0" class="book-detail-stock-line__icon" :src="circleCheckIcon" alt="" aria-hidden="true" />
                  <img v-else-if="availableCopies === 0" class="book-detail-stock-line__icon" :src="circleXIcon" alt="" aria-hidden="true" />
                  <strong v-if="availableCopies === null">Chưa cập nhật tình trạng sách</strong>
                  <strong v-else>{{ availableCopies > 0 ? 'Còn sách' : 'Tạm hết sách' }}</strong>
                  <span v-if="availableCopies !== null">{{ availableCopies }} quyển có sẵn</span>
                </div>

                <section class="book-detail-short-description">
                  <h3>Mô tả ngắn</h3>
                  <p>Chưa có mô tả ngắn cho sách này.</p>
                </section>

              </div>
            </article>

            <aside class="book-detail-card book-borrow-card" aria-labelledby="book-borrow-title">
              <p class="book-detail-kicker book-borrow-card__kicker"><img :src="bookBorrowIcon" alt="" aria-hidden="true" />MƯỢN SÁCH</p>
              <h2 id="book-borrow-title">Thêm sách vào phiếu mượn</h2>
              <div class="book-stock" :class="{ 'book-stock--empty': availableCopies === 0 }">
                <span>Tình trạng sách</span>
                <strong v-if="availableCopies === null">Chưa cập nhật</strong>
                <strong v-else>{{ availableCopies > 0 ? `Còn ${availableCopies} quyển` : 'Tạm hết sách' }}</strong>
              </div>
              <p class="book-borrow-card__hint">Chọn phiếu đang chờ duyệt hoặc xác nhận tạo phiếu mới. API hiện chuyển phiếu mới sang Chờ duyệt ngay khi tạo.</p>
              <button class="book-borrow-button" type="button" :disabled="availableCopies === 0" @click="openBorrowDialog">
                Chọn phiếu mượn
              </button>
            </aside>
          </div>

          <section class="book-detail-card book-detail-long-intro" aria-labelledby="book-detail-intro-title">
            <header class="book-detail-long-intro__heading">
              <img :src="bookIcon" alt="" aria-hidden="true" />
              <h2 id="book-detail-intro-title">Giới thiệu chi tiết</h2>
            </header>
            <div class="book-detail-long-intro__content">
              <p>Chưa có nội dung giới thiệu cho sách này.</p>
              <img v-if="book.cover" class="book-detail-long-intro__image" :src="book.cover" :alt="`Bìa sách ${title}`" loading="lazy" />
            </div>
          </section>

          <div v-if="isBorrowDialogOpen" class="book-borrow-backdrop" @click.self="isBorrowDialogOpen = false">
            <section class="book-borrow-dialog" role="dialog" aria-modal="true" aria-labelledby="borrow-dialog-title">
              <div class="book-borrow-dialog__heading">
                <div>
                  <p class="book-detail-kicker">PHIẾU MƯỢN</p>
                  <h2 id="borrow-dialog-title">Chọn phiếu mượn</h2>
                </div>
                <button type="button" class="book-borrow-dialog__close" aria-label="Đóng hộp thoại" @click="isBorrowDialogOpen = false">×</button>
              </div>

              <p class="book-borrow-dialog__book">Sách đang chọn: <strong>{{ title }}</strong></p>
              <p v-if="isLoadingBorrows" class="book-detail-message" role="status">Đang tải phiếu mượn…</p>
              <p v-else-if="borrowError" class="book-borrow-error" role="alert">{{ borrowError }}</p>
              <template v-else>
                <p v-if="!book.maSach" class="book-borrow-error" role="status">
                  Dữ liệu sách này đang là minh họa, chưa có mã sách từ Backend nên chưa thể tạo phiếu mượn.
                </p>
                <template v-else>
                  <p v-if="pendingBorrows.length" class="book-borrow-dialog__label">Chọn một phiếu đang chờ duyệt hoặc tạo phiếu mới</p>
                  <label v-for="borrow in pendingBorrows" :key="borrow.maPhieu" class="book-borrow-option">
                    <input v-model="selectedBorrowId" type="radio" :value="borrow.maPhieu" />
                    <span><strong>{{ borrow.maPhieu }}</strong><small>{{ borrowDetailsById[borrow.maPhieu]?.length || 0 }} sách · Chờ duyệt</small></span>
                  </label>
                  <label class="book-borrow-option book-borrow-option--new">
                    <input v-model="selectedBorrowId" type="radio" value="new" />
                    <span><strong>Tạo phiếu mượn mới</strong><small>Tạo phiếu Chờ duyệt kèm sách đang chọn</small></span>
                  </label>
                  <p v-if="selectedBorrowId && selectedBorrowId !== 'new'" class="book-borrow-error" role="status">
                    {{ selectedBorrowHasBook ? 'Sách này đã có trong phiếu đang chọn.' : 'Backend hiện chưa có API thêm sách vào phiếu đã tạo. Có thể tạo phiếu mới kèm sách này.' }}
                  </p>
                  <p v-else-if="!pendingBorrows.length" class="book-borrow-dialog__empty">Bạn chưa có phiếu đang chờ duyệt.</p>
                  <p v-if="activeDuplicate" class="book-borrow-error" role="alert">Bạn đã đăng ký hoặc đang mượn sách này trong một phiếu khác.</p>
                  <button
                    class="book-borrow-button"
                    type="button"
                    :disabled="isCreatingBorrow || selectedBorrowId !== 'new' || activeDuplicate || availableCopies === 0"
                    @click="createNewBorrow"
                  >{{ isCreatingBorrow ? 'Đang tạo phiếu…' : selectedBorrowId === 'new' ? 'Tạo phiếu mới và thêm sách' : 'Thêm sách vào phiếu đã chọn' }}</button>
                </template>
              </template>
            </section>
          </div>
        </template>
      </section>
    </main>

    <AppFooter />
  </div>
</template>
