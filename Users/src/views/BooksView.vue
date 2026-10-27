<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import BookListCard from '@/components/books/BookListCard.vue'
import booksBanner from '@/assets/images/banner.jpg'
import books from '@/data/books'
import searchIcon from '@/assets/icons/search.svg'
import './BooksView.css'

const route = useRoute()
const router = useRouter()
const pageSize = 12
const searchTerm = ref('')
const selectedGenre = ref('')
const selectedAuthor = ref('')
const sortOrder = ref('default')
const currentPage = ref(1)
const isSidebarOpen = ref(false)

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .trim()
}

const genres = computed(() => [...new Set(books.map((book) => book.genre))].sort((a, b) => a.localeCompare(b, 'vi')))
const authors = computed(() => [...new Set(books.map((book) => book.author))].sort((a, b) => a.localeCompare(b, 'vi')))
const featuredAuthors = computed(() => authors.value.slice(0, 5))

const filteredBooks = computed(() => {
  const query = normalize(searchTerm.value)
  const result = books.filter((book) => {
    const matchesQuery = !query || normalize(`${book.title} ${book.author}`).includes(query)
    const matchesGenre = !selectedGenre.value || book.genre === selectedGenre.value
    const matchesAuthor = !selectedAuthor.value || book.author === selectedAuthor.value
    return matchesQuery && matchesGenre && matchesAuthor
  })

  if (sortOrder.value === 'title-asc') {
    return result.sort((a, b) => a.title.localeCompare(b.title, 'vi', { sensitivity: 'base' }))
  }
  return result
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredBooks.value.length / pageSize)))
const pageNumbers = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1))
const visibleBooks = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredBooks.value.slice(start, start + pageSize)
})

watch(() => route.query.q, (query) => {
  searchTerm.value = typeof query === 'string' ? query : ''
  currentPage.value = 1
}, { immediate: true })

watch([searchTerm, selectedGenre, selectedAuthor, sortOrder], () => {
  currentPage.value = 1
})

function resetFilters() {
  searchTerm.value = ''
  selectedGenre.value = ''
  selectedAuthor.value = ''
  sortOrder.value = 'default'
  currentPage.value = 1
  isSidebarOpen.value = false
  if (route.query.q) void router.replace({ name: 'books' })
}
</script>

<template>
  <div class="books-page">
    <AppHeader :minimal="true" />

    <main>
      <section class="books-banner" aria-labelledby="books-banner-title">
        <img class="books-banner__image" :src="booksBanner" alt="Không gian thư viện cổ với các kệ sách" />
        <div class="books-banner__overlay" aria-hidden="true"></div>
        <div class="books-banner__content">
          <p class="books-banner__eyebrow">KHÁM PHÁ TRI THỨC</p>
          <h1 id="books-banner-title">Danh sách sách</h1>
          <p>Tìm cuốn sách phù hợp cho hành trình đọc tiếp theo của bạn.</p>
        </div>
      </section>

      <section class="books-content" aria-label="Tìm kiếm và duyệt sách">
        <form class="books-toolbar" role="search" @submit.prevent>
          <label class="books-toolbar__search">
            <span class="visually-hidden">Tìm theo tên sách hoặc tác giả</span>
            <img :src="searchIcon" alt="" />
            <input v-model="searchTerm" type="search" placeholder="Tìm theo tên sách hoặc tác giả..." />
          </label>
          <label class="books-toolbar__select">
            <span class="visually-hidden">Lọc theo thể loại</span>
            <select v-model="selectedGenre">
              <option value="">Tất cả thể loại</option>
              <option v-for="genre in genres" :key="genre" :value="genre">{{ genre }}</option>
            </select>
          </label>
          <label class="books-toolbar__select">
            <span class="visually-hidden">Lọc theo tác giả</span>
            <select v-model="selectedAuthor">
              <option value="">Tất cả tác giả</option>
              <option v-for="author in authors" :key="author" :value="author">{{ author }}</option>
            </select>
          </label>
          <label class="books-toolbar__select">
            <span class="visually-hidden">Sắp xếp sách</span>
            <select v-model="sortOrder">
              <option value="default">Thứ tự mặc định</option>
              <option value="title-asc">Tên sách A–Z</option>
            </select>
          </label>
          <button class="books-toolbar__reset" type="button" @click="resetFilters">Đặt lại</button>
        </form>

        <div class="books-layout">
          <aside class="books-sidebar" :class="{ 'books-sidebar--open': isSidebarOpen }">
            <button
              class="books-sidebar__toggle"
              type="button"
              :aria-expanded="isSidebarOpen"
              @click="isSidebarOpen = !isSidebarOpen"
            >{{ isSidebarOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc' }}</button>

            <div class="books-sidebar__content">
              <section class="books-sidebar__section">
                <h2>Thể loại</h2>
                <button
                  class="books-sidebar__option"
                  :class="{ 'is-selected': !selectedGenre }"
                  type="button"
                  @click="selectedGenre = ''"
                >Tất cả sách <span>{{ books.length }}</span></button>
                <button
                  v-for="genre in genres"
                  :key="genre"
                  class="books-sidebar__option"
                  :class="{ 'is-selected': selectedGenre === genre }"
                  type="button"
                  @click="selectedGenre = genre"
                >{{ genre }} <span>{{ books.filter((book) => book.genre === genre).length }}</span></button>
              </section>

              <section class="books-sidebar__section">
                <h2>Tác giả nổi bật <small>(minh họa)</small></h2>
                <button
                  v-for="author in featuredAuthors"
                  :key="author"
                  class="books-sidebar__author"
                  :class="{ 'is-selected': selectedAuthor === author }"
                  type="button"
                  @click="selectedAuthor = selectedAuthor === author ? '' : author"
                >{{ author }}</button>
              </section>
            </div>
          </aside>

          <section class="books-results" aria-labelledby="books-results-title">
            <div class="books-results__heading">
              <div>
                <h2 id="books-results-title">Tất cả sách</h2>
                <p>{{ filteredBooks.length }} cuốn · Thông tin sách đang dùng dữ liệu minh họa và nhãn từ tên ảnh bìa.</p>
              </div>
              <span class="books-results__page-count">Trang {{ currentPage }} / {{ pageCount }}</span>
            </div>

            <div v-if="visibleBooks.length" class="books-grid">
              <BookListCard v-for="book in visibleBooks" :key="book.id" :book="book" />
            </div>
            <div v-else class="books-empty" role="status">
              <h3>Không tìm thấy sách phù hợp</h3>
              <p>Hãy thử từ khóa khác hoặc đặt lại bộ lọc.</p>
              <button type="button" @click="resetFilters">Xóa bộ lọc</button>
            </div>

            <nav v-if="filteredBooks.length" class="books-pagination" aria-label="Phân trang danh sách sách">
              <button type="button" :disabled="currentPage === 1" aria-label="Trang trước" @click="currentPage--">‹</button>
              <button
                v-for="page in pageNumbers"
                :key="page"
                type="button"
                :aria-label="`Trang ${page}`"
                :aria-current="currentPage === page ? 'page' : undefined"
                :class="{ 'is-current': currentPage === page }"
                @click="currentPage = page"
              >{{ page }}</button>
              <button type="button" :disabled="currentPage === pageCount" aria-label="Trang sau" @click="currentPage++">›</button>
            </nav>
          </section>
        </div>
      </section>
    </main>

    <AppFooter />
  </div>
</template>
