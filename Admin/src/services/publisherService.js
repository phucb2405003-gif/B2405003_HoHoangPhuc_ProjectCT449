import apiClient from './apiClient'

const PUBLISHERS_PATH = '/api/publishers'

function normalizePublisher(publisher) {
  if (!publisher || typeof publisher !== 'object' || Array.isArray(publisher)) {
    throw new Error('Backend trả về thông tin nhà xuất bản không hợp lệ.')
  }

  const normalized = {
    ...publisher,
    maNXB: String(publisher.maNXB || ''),
    tenNXB: String(publisher.tenNXB || ''),
    diaChi: String(publisher.diaChi || ''),
    soDienThoai: String(publisher.soDienThoai || ''),
  }

  if (!normalized.maNXB || !normalized.tenNXB) {
    throw new Error('Backend không trả đủ mã và tên nhà xuất bản đã lưu.')
  }

  return normalized
}

export async function getPublishers() {
  const result = await apiClient.get(PUBLISHERS_PATH)
  if (!Array.isArray(result)) throw new Error('Backend trả về danh sách nhà xuất bản không hợp lệ.')
  return result.map(normalizePublisher)
}

export async function getPublisher(maNXB) {
  const result = await apiClient.get(`${PUBLISHERS_PATH}/${encodeURIComponent(maNXB)}`)
  return normalizePublisher(result)
}

export async function createPublisher(fields) {
  const result = await apiClient.post(PUBLISHERS_PATH, fields)
  return normalizePublisher(result)
}

export async function updatePublisher(maNXB, fields) {
  const result = await apiClient.put(`${PUBLISHERS_PATH}/${encodeURIComponent(maNXB)}`, fields)
  return normalizePublisher(result)
}

export function deletePublisher(maNXB) {
  return apiClient.delete(`${PUBLISHERS_PATH}/${encodeURIComponent(maNXB)}`)
}
