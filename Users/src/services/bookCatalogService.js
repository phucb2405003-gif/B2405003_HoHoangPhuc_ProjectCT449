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

export async function getBookCatalog() {
  const books = await getBooks()
  if (!Array.isArray(books)) throw invalidBookResponse()
  return books.map(normalizeBook)
}

export async function getBookByCode(maSach) {
  if (typeof maSach !== 'string' || !maSach.trim()) throw invalidBookResponse()
  return normalizeBook(await getBook(maSach))
}
