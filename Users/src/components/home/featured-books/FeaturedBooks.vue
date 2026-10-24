<script setup>
import featuredBooks from '@/data/featuredBooks'
import BookCard from './components/BookCard.vue'
import useFeaturedBooks from './useFeaturedBooks'
import './FeaturedBooks.css'

const {
  displayBooks,
  finishDrag,
  handleKeydown,
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
</script>

<template>
  <section class="featured-books home-page__content" aria-labelledby="featured-books-title">
    <div class="featured-books__topline">
      <div>
        <h2 id="featured-books-title" class="featured-books__heading">Sách nổi bật</h2>
        <p class="featured-books__sample-note">Dữ liệu mẫu minh họa, không phải dữ liệu hệ thống.</p>
      </div>
      <div class="featured-books__controls" role="group" aria-label="Điều khiển cuộn sách">
        <button class="featured-books__arrow" type="button" aria-label="Cuộn về trái" @click="moveOneBook(-1)">
          <span aria-hidden="true">&#x2039;</span>
        </button>
        <button class="featured-books__arrow" type="button" aria-label="Cuộn về phải" @click="moveOneBook(1)">
          <span aria-hidden="true">&#x203a;</span>
        </button>
      </div>
    </div>

    <div
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
