import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, getReaderAccessToken, initializeAuth } from '@/services/authService'
import { getBookCatalog } from '@/services/bookCatalogService'
import { createBorrowWithBook, getBorrowDetails, getMyBorrows } from '@/services/borrowingService'

export default function useBookDetail() {

const route = useRoute()
const router = useRouter()
const book = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const isBorrowDialogOpen = ref(false)
const isLoadingBorrows = ref(false)
const isCreatingBorrow = ref(false)
const borrowError = ref('')
const borrowNotice = ref('')
const allBorrows = ref([])
const pendingBorrows = ref([])
const selectedBorrowId = ref('')
const borrowDetailsById = ref({})
let bookLoadVersion = 0

const title = computed(() => book.value?.tenSach || book.value?.title || 'Chi tiết sách')
const author = computed(() => book.value?.tacGia || book.value?.author || '')
const genre = computed(() => book.value?.genre || '')
const publisher = computed(() => book.value?.tenNXB || '')
const availableCopies = computed(() => Number.isSafeInteger(book.value?.soQuyenConLai) ? book.value.soQuyenConLai : null)
const activeDuplicate = computed(() => allBorrows.value.some((borrow) => {
  const details = borrowDetailsById.value[borrow.maPhieu] || []
  return details.some((detail) => detail.maSach === book.value?.maSach && ['Chờ duyệt', 'Đang mượn'].includes(detail.trangThai))
}))
const selectedBorrowHasBook = computed(() => {
  const details = borrowDetailsById.value[selectedBorrowId.value] || []
  return details.some((detail) => detail.maSach === book.value?.maSach)
})
const backQuery = computed(() => Object.fromEntries(
  ['q', 'genre', 'author', 'sort', 'page']
    .filter((key) => typeof route.query[key] === 'string')
    .map((key) => [key, route.query[key]])
))

async function loadBook() {
  const requestVersion = ++bookLoadVersion
  isLoading.value = true
  loadError.value = ''
  book.value = null

  try {
    const catalog = await getBookCatalog()
    if (requestVersion !== bookLoadVersion) return
    book.value = catalog.find((item) => item.id === route.params.maSach) || null
    if (!book.value) throw new Error('Không tìm thấy dữ liệu sách hợp lệ.')
  } catch (error) {
    if (requestVersion !== bookLoadVersion) return
    loadError.value = error.message || 'Không thể tải thông tin sách.'
  }

  if (requestVersion !== bookLoadVersion) return
  isLoading.value = false
}

async function goBackToBooks() {
  const previousPath = window.history.state?.back
  if (typeof previousPath === 'string' && previousPath.startsWith('/sach')) {
    await router.back()
    return
  }
  await router.push({ name: 'books', query: backQuery.value })
}

async function loadBorrowChoices(token) {
  isLoadingBorrows.value = true
  borrowError.value = ''
  try {
    const borrows = await getMyBorrows(token)
    allBorrows.value = Array.isArray(borrows) ? borrows : []
    pendingBorrows.value = allBorrows.value.filter((item) => item.trangThai === 'Chờ duyệt')

    const details = await Promise.all(allBorrows.value.map(async (item) => {
      try {
        const rows = await getBorrowDetails(item.maPhieu, token)
        return [item.maPhieu, Array.isArray(rows) ? rows : []]
      } catch {
        return [item.maPhieu, []]
      }
    }))
    borrowDetailsById.value = Object.fromEntries(details)
    selectedBorrowId.value = pendingBorrows.value[0]?.maPhieu || 'new'
  } catch (error) {
    borrowError.value = error.message || 'Không thể tải các phiếu mượn của bạn.'
  } finally {
    isLoadingBorrows.value = false
  }
}

async function openBorrowDialog() {
  borrowNotice.value = ''
  borrowError.value = ''
  await initializeAuth({ revalidate: true })
  if (!authState.isAuthenticated || authState.user?.loaiTaiKhoan !== 'DOCGIA') {
    await router.push({ name: 'login' })
    return
  }

  isBorrowDialogOpen.value = true
  const token = getReaderAccessToken()
  if (!token) {
    borrowError.value = 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
    return
  }
  await loadBorrowChoices(token)
}

async function createNewBorrow() {
  const token = getReaderAccessToken()
  if (!token || selectedBorrowId.value !== 'new' || !book.value?.maSach || activeDuplicate.value || availableCopies.value === 0) return

  isCreatingBorrow.value = true
  borrowError.value = ''
  try {
    const created = await createBorrowWithBook(book.value.maSach, token)
    borrowNotice.value = created?.maPhieu
      ? `Đã tạo phiếu ${created.maPhieu} ở trạng thái Chờ duyệt và thêm sách này vào phiếu.`
      : 'Đã tạo phiếu mượn và thêm sách. Phiếu đang chờ duyệt.'
    isBorrowDialogOpen.value = false
  } catch (error) {
    borrowError.value = error.message || 'Không thể tạo phiếu mượn.'
  } finally {
    isCreatingBorrow.value = false
  }
}

watch(() => route.params.maSach, loadBook)
onMounted(loadBook)

  return {
    activeDuplicate,
    author,
    availableCopies,
    book,
    borrowDetailsById,
    borrowError,
    borrowNotice,
    createNewBorrow,
    genre,
    goBackToBooks,
    isBorrowDialogOpen,
    isCreatingBorrow,
    isLoading,
    isLoadingBorrows,
    loadError,
    openBorrowDialog,
    pendingBorrows,
    publisher,
    selectedBorrowHasBook,
    selectedBorrowId,
    title,
  }
}
