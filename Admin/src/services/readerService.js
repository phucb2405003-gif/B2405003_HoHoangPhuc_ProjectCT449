import apiClient from './apiClient'

const READERS_PATH = '/api/users'
const CREATE_FIELDS = ['hoLot', 'ten', 'ngaySinh', 'phai', 'diaChi', 'dienThoai']
const UPDATE_FIELDS = CREATE_FIELDS
const READER_STATUSES = ['Bình thường', 'Hạn chế', 'Bị cấm']

function pick(source, fields) {
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(source || {}, field)).map((field) => [field, source[field]]))
}

function splitName(value) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) throw new Error('Vui lòng nhập đầy đủ họ và tên độc giả.')
  return { hoLot: words.slice(0, -1).join(' '), ten: words.at(-1) }
}

function normalizeReader(reader) {
  if (!reader || typeof reader !== 'object' || typeof reader.maDocGia !== 'string' || !reader.maDocGia.trim()) {
    throw new Error('Backend trả về hồ sơ độc giả không hợp lệ.')
  }
  return {
    ...reader,
    hoTen: [reader.hoLot, reader.ten].filter((part) => typeof part === 'string' && part.trim()).join(' '),
    gioiTinh: reader.phai === true ? 'Nam' : reader.phai === false ? 'Nữ' : '',
    soDienThoai: reader.dienThoai || '',
    ngaySinh: reader.ngaySinh instanceof Date ? reader.ngaySinh.toISOString().slice(0, 10) : typeof reader.ngaySinh === 'string' ? reader.ngaySinh.slice(0, 10) : '',
  }
}

function toPayload(record, fields) {
  const { hoLot, ten } = splitName(record.hoTen)
  const gender = record.gioiTinh === 'Nam' ? true : record.gioiTinh === 'Nữ' ? false : undefined
  if (gender === undefined) throw new Error('Vui lòng chọn giới tính Nam hoặc Nữ.')
  return pick({ ...record, hoLot, ten, phai: gender, dienThoai: String(record.soDienThoai || '').trim() }, fields)
}

export async function getReaders() {
  const result = await apiClient.get(READERS_PATH)
  if (!Array.isArray(result)) throw new Error('Backend trả về danh sách độc giả không hợp lệ.')
  return result.map(normalizeReader)
}

export async function getReader(maDocGia) {
  return normalizeReader(await apiClient.get(`${READERS_PATH}/${encodeURIComponent(maDocGia)}`))
}

export async function createReader(record) {
  const reader = await apiClient.post(READERS_PATH, toPayload(record, CREATE_FIELDS))
  const normalized = normalizeReader(reader)
  return { reader: normalized, accountCreation: reader.accountCreation || null }
}

export async function updateReader(maDocGia, record) {
  return normalizeReader(await apiClient.put(`${READERS_PATH}/${encodeURIComponent(maDocGia)}`, toPayload(record, UPDATE_FIELDS)))
}

export async function updateReaderStatus(maDocGia, trangThai) {
  if (!READER_STATUSES.includes(trangThai)) throw new Error('Trạng thái độc giả không hợp lệ.')
  return normalizeReader(await apiClient.put(`${READERS_PATH}/${encodeURIComponent(maDocGia)}/status`, { trangThai }))
}

