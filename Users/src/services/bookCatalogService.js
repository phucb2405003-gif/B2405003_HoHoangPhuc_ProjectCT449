import { getReaderAccessToken, initializeAuth, logoutReader } from './authService'
import { getBook, getBooks } from './borrowingService'

function invalidBookResponse() {
  return new Error('Máy chủ trả về thông tin sách không hợp lệ.')
}

function normalizeBook(book) {
  if (
    !book || typeof book !== 'object' || Array.isArray(book) ||
    typeof book.maSach !== 'string' || !book.maSach.trim() ||
    typeof book.tenSach !== 'string' ||
    typeof book.tacGia !== 'string' ||
    typeof book.theLoai !== 'string' ||
    !Number.isSafeInteger(book.soQuyen) || book.soQuyen < 0 ||
    (book.soQuyenConLai !== undefined && book.soQuyenConLai !== null &&
      (!Number.isSafeInteger(book.soQuyenConLai) || book.soQuyenConLai < 0))
  ) {
    throw invalidBookResponse()
  }

  const availableCopies = book.soQuyenConLai
  return {
    ...book,
    id: book.maSach,
    title: book.tenSach,
    author: book.tacGia,
    genre: book.theLoai,
    status: availableCopies === undefined || availableCopies === null
      ? 'Chưa cập nhật tình trạng'
      : availableCopies > 0 ? 'Còn sách' : 'Tạm hết sách',
  }
}

async function withReaderToken(request) {
  await initializeAuth()
  const token = getReaderAccessToken()
  if (!token) {
    const error = new Error('Vui lòng đăng nhập để xem danh mục sách.')
    error.status = 401
    throw error
  }

  try {
    return await request(token)
  } catch (error) {
    if (error?.status === 401) logoutReader()
    throw error
  }
}

export async function getBookCatalog() {
  return withReaderToken(async (token) => {
    const books = await getBooks(token)
    if (!Array.isArray(books)) throw invalidBookResponse()
    return books.map(normalizeBook)
  })
}

export async function getBookByCode(maSach) {
  if (typeof maSach !== 'string' || !maSach.trim()) throw invalidBookResponse()
  return withReaderToken(async (token) => normalizeBook(await getBook(maSach, token)))
}
