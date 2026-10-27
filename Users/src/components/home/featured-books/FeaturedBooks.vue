<script setup>
import { onMounted, ref } from 'vue'
import { getBookCatalog } from '@/services/bookCatalogService'
import BookCard from './components/BookCard.vue'
import useFeaturedBooks from './useFeaturedBooks'
import chevronLeftIcon from '@/assets/icons/chevron-left.svg'
import chevronRightIcon from '@/assets/icons/chevron-right.svg'
import './FeaturedBooks.css'

const featuredBooks = ref([])
const isLoading = ref(true)
const loadError = ref('')
const {
  displayBooks,
  finishDrag,
  handleKeydown,
  handleClick,
  handleTransitionEnd,
  handleWheel,
  isDragging,
  moveDrag,
  moveOneBook,
  startDrag,
  track,
  trackStyle,
  viewport,
} = useFeaturedBooks(featuredBooks)

onMounted(async () => {
  try {
    featuredBooks.value = (await getBookCatalog()).slice(0, 10)
  } catch (error) {
    loadError.value = error.message || 'Không thể tải sách nổi bật.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="featured-books home-page__content" aria-labelledby="featured-books-title">
    <div class="featured-books__topline">
      <div>
        <h2 id="featured-books-title" class="featured-books__heading">Sách nổi bật</h2>
        <p v-if="isLoading" class="featured-books__sample-note" role="status">Đang tải sách…</p>
        <p v-else-if="loadError" class="featured-books__sample-note" role="alert">{{ loadError }}</p>
        <p v-else-if="!featuredBooks.length" class="featured-books__sample-note" role="status">Chưa có sách để hiển thị.</p>
      </div>
      <div v-if="featuredBooks.length" class="featured-books__controls" role="group" aria-label="Điều khiển cuộn sách">
        <button class="featured-books__arrow" type="button" aria-label="Cuộn về trái" @click="moveOneBook(-4)">
          <img class="featured-books__arrow-icon" :src="chevronLeftIcon" alt="" aria-hidden="true" />
        </button>
        <button class="featured-books__arrow" type="button" aria-label="Cuộn về phải" @click="moveOneBook(4)">
          <img class="featured-books__arrow-icon" :src="chevronRightIcon" alt="" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      v-if="featuredBooks.length"
      ref="viewport"
      class="featured-books__viewport"
      tabindex="0"
      aria-label="Danh sách sách nổi bật"
      @pointerdown="startDrag"
      @pointermove.passive="moveDrag"
      @pointerup="finishDrag"
      @pointercancel="finishDrag"
      @wheel.passive="handleWheel"
      @keydown="handleKeydown"
      @click.capture="handleClick"
    >
      <div
        ref="track"
        class="featured-books__track"
        :class="{ 'is-dragging': isDragging }"
        :style="trackStyle"
        @transitionend="handleTransitionEnd"
      >
        <BookCard v-for="book in displayBooks" :key="book.renderKey" :book="book" />
      </div>
    </div>
  </section>
</template>
