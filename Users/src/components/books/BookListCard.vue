<script setup>
import './BookListCard.css'

defineProps({
  book: {
    type: Object,
    required: true,
  },
  detailTo: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <RouterLink class="book-list-card" :to="detailTo">
    <div class="book-list-card__cover-frame">
      <img v-if="book.cover" class="book-list-card__cover" :src="book.cover" :alt="`Bìa sách ${book.title}`" loading="lazy" decoding="async" />
      <span v-else class="book-list-card__cover-placeholder">Chưa có ảnh bìa</span>
    </div>
    <div class="book-list-card__body">
      <span class="book-list-card__status">{{ book.status }}</span>
      <h3 class="book-list-card__title">{{ book.title }}</h3>
      <p class="book-list-card__author">{{ book.author }}</p>
      <span v-if="book.genre" class="book-list-card__genre">{{ book.genre }}</span>
    </div>
  </RouterLink>
</template>
