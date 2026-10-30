import apiClient from './apiClient'

const BOOKS_PATH = '/api/books'
const CREATE_FIELDS = ['tenSach', 'tacGia', 'theLoai', 'maNXB', 'soQuyen']
const UPDATE_FIELDS = ['tenSach', 'tacGia', 'theLoai', 'maNXB']

function pickFields(source, fields) {
  return Object.fromEntries(fields.filter((key) => Object.hasOwn(source || {}, key)).map((key) => [key, source[key]]))
}

function normalizeBook(book) {
  if (!book || typeof book !== 'object' || Array.isArray(book)) {
    throw new Error('Backend trả về thông tin sách không hợp lệ.')
  }

  if (typeof book.maSach !== 'string' || !book.maSach.trim()) {
    throw new Error('Backend không trả về mã sách đã lưu.')
  }
  if (!Number.isSafeInteger(book.soQuyen) || book.soQuyen < 0 ||
      !Number.isSafeInteger(book.soQuyenConLai) || book.soQuyenConLai < 0 ||
      book.soQuyenConLai > book.soQuyen) {
    throw new Error(`Dữ liệu tồn kho sách ${book.maSach} không hợp lệ.`)
  }

  return {
    ...book,
    maSach: book.maSach.trim(),
    tenSach: String(book.tenSach || ''),
    tacGia: String(book.tacGia || ''),
    theLoai: String(book.theLoai || ''),
    maNXB: String(book.maNXB || ''),
  }
}

export async function getBooks() {
  const result = await apiClient.get(BOOKS_PATH)
  if (!Array.isArray(result)) throw new Error('Backend trả về danh sách sách không hợp lệ.')
  return result.map(normalizeBook)
}

export async function getBook(maSach) {
  return normalizeBook(await apiClient.get(`${BOOKS_PATH}/${encodeURIComponent(maSach)}`))
}

export async function createBook(fields) {
  return normalizeBook(await apiClient.post(BOOKS_PATH, pickFields(fields, CREATE_FIELDS)))
}

export async function updateBook(maSach, fields) {
  return normalizeBook(await apiClient.put(`${BOOKS_PATH}/${encodeURIComponent(maSach)}`, pickFields(fields, UPDATE_FIELDS)))
}

export async function addBookStock(maSach, soLuong) {
  return normalizeBook(await apiClient.put(`${BOOKS_PATH}/${encodeURIComponent(maSach)}/add-stock`, { soLuong }))
}

export async function destroyBookStock(maSach, soLuong) {
  return normalizeBook(await apiClient.put(`${BOOKS_PATH}/${encodeURIComponent(maSach)}/destroy-stock`, { soLuong }))
}

export function deleteBook(maSach) {
  return apiClient.delete(`${BOOKS_PATH}/${encodeURIComponent(maSach)}`)
}
