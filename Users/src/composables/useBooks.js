import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBookCatalog } from '@/services/bookCatalogService'

export default function useBooks() {

const route = useRoute()
const router = useRouter()
const pageSize = 12
const books = ref([])
const isLoadingBooks = ref(true)
const booksLoadError = ref('')
const searchTerm = ref('')
const selectedGenre = ref('')
const selectedAuthor = ref('')
const sortOrder = ref('default')
const currentPage = ref(1)
const isSidebarOpen = ref(false)
let booksLoadPending = false

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .trim()
}

const genres = computed(() => [...new Set(books.value.map((book) => book.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')))
const authors = computed(() => [...new Set(books.value.map((book) => book.author).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')))
const sidebarGenres = computed(() => genres.value.slice(0, 10))
const sidebarAuthors = computed(() => authors.value.slice(0, 10))
const genreCounts = computed(() => books.value.reduce((counts, book) => {
  if (book.genre) counts[book.genre] = (counts[book.genre] || 0) + 1
  return counts
}, {}))

const filteredBooks = computed(() => {
  const query = normalize(searchTerm.value)
  const result = books.value.filter((book) => {
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

async function loadBooks() {
  if (booksLoadPending) return
  booksLoadPending = true
  isLoadingBooks.value = true
  booksLoadError.value = ''
  try {
    books.value = await getBookCatalog()
  } catch (error) {
    booksLoadError.value = error.message || 'Không thể tải danh sách sách.'
  } finally {
    isLoadingBooks.value = false
    booksLoadPending = false
  }
}

onMounted(loadBooks)

watch(() => route.query, (query) => {
  searchTerm.value = typeof query.q === 'string' ? query.q : ''
  selectedGenre.value = typeof query.genre === 'string' ? query.genre : ''
  selectedAuthor.value = typeof query.author === 'string' ? query.author : ''
  sortOrder.value = query.sort === 'title-asc' ? 'title-asc' : 'default'
  currentPage.value = Math.max(1, Number.parseInt(query.page, 10) || 1)
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

  return {
    authors,
    books,
    booksLoadError,
    currentPage,
    filteredBooks,
    genreCounts,
    genres,
    isLoadingBooks,
    isSidebarOpen,
    loadBooks,
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
  }
}
