<script setup>
import { computed } from 'vue'
import BookListCard from '@/components/books/BookListCard.vue'
import './BookCard.css'

const props = defineProps({
  book: {
    type: Object,
    required: true,
  },
})

const cardBook = computed(() => props.book)
const detailTo = computed(() => ({
  name: 'book-detail',
  params: { maSach: props.book.id },
}))
</script>

<template>
  <BookListCard class="book-card" :book="cardBook" :detail-to="detailTo" />
</template>
