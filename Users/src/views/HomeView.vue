<script setup>
import AppHeader from '@/components/AppHeader.vue'
import './HomeView.css'

const featuredBooks = [
  { title: "Sách mẫu 01", author: "Tác giả minh họa", genre: "Thể loại mẫu", key: 'sample-book-1' },
  { title: "Sách mẫu 02", author: "Tác giả minh họa", genre: "Thể loại mẫu", key: 'sample-book-2' },
  { title: "Sách mẫu 03", author: "Tác giả minh họa", genre: "Thể loại mẫu", key: 'sample-book-3' },
]
</script>

<template>
  <div class="home-page">
    <AppHeader />
    <main>
      <section class="home-hero">
        <div class="home-page__content home-hero__content">
          <p class="home-hero__eyebrow">THƯ VIỆN TRỰC TUYẾN</p>
          <h1>Chào mừng bạn đến với trang độc giả</h1>
          <p class="home-hero__description">Khám phá và theo dõi những cuốn sách bạn yêu thích.</p>
          <form class="home-search" role="search" @submit.prevent>
            <input class="home-search__input" type="search" placeholder="Tìm kiếm sách, tác giả, thể loại..." aria-label="Tìm kiếm sách, tác giả, thể loại" />
            <button class="home-search__button" type="submit" disabled>Tìm kiếm</button>
          </form>
        </div>
      </section>

      <section class="home-page__content featured-books" aria-labelledby="featured-books-title">
        <h2 id="featured-books-title" class="featured-books__heading">Sách nổi bật</h2>
        <p class="featured-books__sample-note">Dữ liệu mẫu minh họa, không phải dữ liệu hệ thống.</p>
        <div class="featured-books__grid">
          <article v-for="book in featuredBooks" :key="book.key" class="book-card">
            <div class="book-card__cover" role="img" aria-label="Ảnh minh họa">Ảnh minh họa</div>
            <div class="book-card__details">
              <h3 class="book-card__title">{{ book.title }}</h3>
              <p class="book-card__author">{{ book.author }}</p>
              <span class="book-card__genre">{{ book.genre }}</span>
            </div>
          </article>
        </div>
      </section>
    </main>
    <footer class="home-footer">
      <div class="home-footer__content">© 2026 Thư viện trực tuyến. Tất cả quyền được bảo lưu.</div>
    </footer>
  </div>
</template>
