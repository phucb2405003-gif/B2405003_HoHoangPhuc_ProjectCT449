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
      <img class="book-list-card__cover" :src="book.cover" :alt="`Bìa sách ${book.title}`" loading="lazy" decoding="async" />
    </div>
    <div class="book-list-card__body">
      <span class="book-list-card__status">{{ book.status }}</span>
      <h3 class="book-list-card__title">{{ book.title }}</h3>
      <p class="book-list-card__author">{{ book.author }}</p>
      <span class="book-list-card__genre">{{ book.genre }}</span>
    </div>
  </RouterLink>
</template>
