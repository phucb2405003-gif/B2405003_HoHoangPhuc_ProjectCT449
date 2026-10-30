<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import BookListCard from '@/components/books/BookListCard.vue'
import booksBanner from '@/assets/images/banner.jpg'
import useBooks from '@/composables/useBooks'
import searchIcon from '@/assets/icons/search.svg'
import './BooksView.css'

const {
  authors,
  books,
  booksLoadError,
  currentPage,
  filteredBooks,
  genreCounts,
  genres,
  isLoadingBooks,
  isSidebarOpen,
  pageCount,
  pageNumbers,
  resetFilters,
  searchTerm,
  selectedAuthor,
  selectedGenre,
  sidebarAuthors,
  sidebarGenres,
  sortOrder,
  visibleBooks,
} = useBooks()
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
                  v-for="genre in sidebarGenres"
                  :key="genre"
                  class="books-sidebar__option"
                  :class="{ 'is-selected': selectedGenre === genre }"
                  type="button"
                  @click="selectedGenre = genre"
                >{{ genre }} <span>{{ genreCounts[genre] || 0 }}</span></button>
              </section>

              <section class="books-sidebar__section">
                <h2>Tác giả trong danh mục</h2>
                <button
                  v-for="author in sidebarAuthors"
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
                <p>{{ filteredBooks.length }} sách phù hợp.</p>
              </div>
              <span class="books-results__page-count">Trang {{ currentPage }} / {{ pageCount }}</span>
            </div>

            <div v-if="isLoadingBooks" class="books-empty" role="status">Đang tải danh sách sách…</div>
            <div v-else-if="booksLoadError" class="books-empty" role="alert">{{ booksLoadError }}</div>
            <div v-else-if="!books.length" class="books-empty" role="status">Thư viện chưa có sách để hiển thị.</div>
            <div v-else-if="visibleBooks.length" class="books-grid">
              <BookListCard
                v-for="book in visibleBooks"
                :key="book.id"
                :book="book"
                :detail-to="{
                  name: 'book-detail',
                  params: { maSach: book.id },
                  query: {
                    q: searchTerm || undefined,
                    genre: selectedGenre || undefined,
                    author: selectedAuthor || undefined,
                    sort: sortOrder === 'default' ? undefined : sortOrder,
                    page: currentPage === 1 ? undefined : String(currentPage),
                  },
                }"
              />
            </div>
            <div v-else class="books-empty" role="status">
              <h3>Không tìm thấy sách phù hợp</h3>
              <p>Hãy thử từ khóa khác hoặc đặt lại bộ lọc.</p>
              <button type="button" @click="resetFilters">Xóa bộ lọc</button>
            </div>

            <nav v-if="!isLoadingBooks && !booksLoadError && filteredBooks.length" class="books-pagination" aria-label="Phân trang danh sách sách">
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
