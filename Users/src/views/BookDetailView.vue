<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import books from '@/data/books'
import { authState, getReaderAccessToken, initializeAuth } from '@/services/authService'
import { createBorrowWithBook, getBook, getBorrowDetails, getMyBorrows } from '@/services/borrowingService'
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

const route = useRoute()
const router = useRouter()
const book = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const isBorrowDialogOpen = ref(false)
const isLoadingBorrows = ref(false)
const isCreatingBorrow = ref(false)
const borrowError = ref('')
const borrowNotice = ref('')
const allBorrows = ref([])
const pendingBorrows = ref([])
const selectedBorrowId = ref('')
const borrowDetailsById = ref({})
let bookLoadVersion = 0

const localBook = computed(() => books.find((item) => item.id === route.params.maSach) || null)
const title = computed(() => book.value?.tenSach || book.value?.title || 'Chi tiết sách')
const author = computed(() => book.value?.tacGia || book.value?.author || '')
const genre = computed(() => book.value?.genre || '')
const publisher = computed(() => book.value?.maNXB || '')
const availableCopies = computed(() => Number.isSafeInteger(book.value?.soQuyenConLai) ? book.value.soQuyenConLai : null)
const activeDuplicate = computed(() => allBorrows.value.some((borrow) => {
  const details = borrowDetailsById.value[borrow.maPhieu] || []
  return details.some((detail) => detail.maSach === book.value?.maSach && ['Chờ duyệt', 'Đang mượn'].includes(detail.trangThai))
}))
const selectedBorrowHasBook = computed(() => {
  const details = borrowDetailsById.value[selectedBorrowId.value] || []
  return details.some((detail) => detail.maSach === book.value?.maSach)
})
const backQuery = computed(() => Object.fromEntries(
  ['q', 'genre', 'author', 'sort', 'page']
    .filter((key) => typeof route.query[key] === 'string')
    .map((key) => [key, route.query[key]])
))

async function loadBook() {
  const requestVersion = ++bookLoadVersion
  isLoading.value = true
  loadError.value = ''
  book.value = localBook.value

  if (!localBook.value) {
    await initializeAuth({ revalidate: true })
    if (requestVersion !== bookLoadVersion) return
    const token = getReaderAccessToken()
    if (!token) {
      loadError.value = 'Đăng nhập bằng tài khoản độc giả để xem thông tin sách từ hệ thống.'
      isLoading.value = false
      return
    }

    try {
      const result = await getBook(route.params.maSach, token)
      if (requestVersion !== bookLoadVersion) return
      book.value = result
      if (!result?.maSach) throw new Error('Không tìm thấy dữ liệu sách hợp lệ.')
    } catch (error) {
      if (requestVersion !== bookLoadVersion) return
      loadError.value = error.message || 'Không thể tải thông tin sách.'
    }
  }

  if (requestVersion !== bookLoadVersion) return
  isLoading.value = false
}

async function goBackToBooks() {
  const previousPath = window.history.state?.back
  if (typeof previousPath === 'string' && previousPath.startsWith('/sach')) {
    await router.back()
    return
  }
  await router.push({ name: 'books', query: backQuery.value })
}

async function loadBorrowChoices(token) {
  isLoadingBorrows.value = true
  borrowError.value = ''
  try {
    const borrows = await getMyBorrows(token)
    allBorrows.value = Array.isArray(borrows) ? borrows : []
    pendingBorrows.value = allBorrows.value.filter((item) => item.trangThai === 'Chờ duyệt')

    const details = await Promise.all(allBorrows.value.map(async (item) => {
      try {
        const rows = await getBorrowDetails(item.maPhieu, token)
        return [item.maPhieu, Array.isArray(rows) ? rows : []]
      } catch {
        return [item.maPhieu, []]
      }
    }))
    borrowDetailsById.value = Object.fromEntries(details)
    selectedBorrowId.value = pendingBorrows.value[0]?.maPhieu || 'new'
  } catch (error) {
    borrowError.value = error.message || 'Không thể tải các phiếu mượn của bạn.'
  } finally {
    isLoadingBorrows.value = false
  }
}

async function openBorrowDialog() {
  borrowNotice.value = ''
  borrowError.value = ''
  await initializeAuth({ revalidate: true })
  if (!authState.isAuthenticated || authState.user?.loaiTaiKhoan !== 'DOCGIA') {
    await router.push({ name: 'login' })
    return
  }

  isBorrowDialogOpen.value = true
  const token = getReaderAccessToken()
  if (!token) {
    borrowError.value = 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
    return
  }
  await loadBorrowChoices(token)
}

async function createNewBorrow() {
  const token = getReaderAccessToken()
  if (!token || selectedBorrowId.value !== 'new' || !book.value?.maSach || activeDuplicate.value || availableCopies.value === 0) return

  isCreatingBorrow.value = true
  borrowError.value = ''
  try {
    const created = await createBorrowWithBook(book.value.maSach, token)
    borrowNotice.value = created?.maPhieu
      ? `Đã tạo phiếu ${created.maPhieu} ở trạng thái Chờ duyệt và thêm sách này vào phiếu.`
      : 'Đã tạo phiếu mượn và thêm sách. Phiếu đang chờ duyệt.'
    isBorrowDialogOpen.value = false
  } catch (error) {
    borrowError.value = error.message || 'Không thể tạo phiếu mượn.'
  } finally {
    isCreatingBorrow.value = false
  }
}

watch(() => route.params.maSach, loadBook)
onMounted(loadBook)
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
                    <dt>Mã nhà xuất bản</dt><dd>{{ publisher || 'Chưa cập nhật' }}</dd>
                  </div>
                  <div>
                    <img :src="calendarIcon" alt="" aria-hidden="true" />
                    <dt>Năm xuất bản</dt><dd>Chưa cập nhật</dd>
                  </div>
                  <div>
                    <img :src="pageIcon" alt="" aria-hidden="true" />
                    <dt>Số trang</dt><dd>Chưa cập nhật</dd>
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
