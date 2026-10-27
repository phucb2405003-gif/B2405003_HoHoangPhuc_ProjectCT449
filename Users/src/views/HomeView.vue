<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import FeaturedBooks from '@/components/home/featured-books/FeaturedBooks.vue'
import './HomeView.css'

const router = useRouter()
const searchTerm = ref('')

function searchBooks() {
  const query = searchTerm.value.trim()
  void router.push({ name: 'books', query: query ? { q: query } : {} })
}
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
          <form class="home-search" role="search" @submit.prevent="searchBooks">
            <input v-model="searchTerm" class="home-search__input" type="search" placeholder="Tìm kiếm sách, tác giả, thể loại..." aria-label="Tìm kiếm sách, tác giả, thể loại" />
            <button class="home-search__button" type="submit">
              <img src="@/assets/icons/search.svg" alt="" />
              <span>Tìm kiếm</span>
            </button>
          </form>
        </div>
      </section>

      <FeaturedBooks />
    </main>

    <AppFooter />
  </div>
</template>
