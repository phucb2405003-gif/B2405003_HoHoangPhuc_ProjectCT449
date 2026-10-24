<script setup>
import './BookCard.css'

defineProps({
  book: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article class="book-card">
    <div class="book-card__cover">
      <img
        v-if="book.cover"
        class="book-card__image"
        :class="{ 'book-card__image--1984': book.id === 'sample-book-01' }"
        :src="book.cover"
        :alt="`Bìa sách ${book.title}`"
      />
      <span v-else>Chưa có ảnh bìa</span>
    </div>
    <div class="book-card__details">
      <h3 class="book-card__title">{{ book.title }}</h3>
      <p class="book-card__author">{{ book.author }}</p>
      <span class="book-card__genre">{{ book.genre }}</span>
    </div>
  </article>
</template>
