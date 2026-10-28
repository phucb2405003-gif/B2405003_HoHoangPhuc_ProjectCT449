import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default function useHome() {
  const router = useRouter()
  const searchTerm = ref('')

  function searchBooks() {
    const query = searchTerm.value.trim()
    void router.push({ name: 'books', query: query ? { q: query } : {} })
  }

  return { searchBooks, searchTerm }
}
