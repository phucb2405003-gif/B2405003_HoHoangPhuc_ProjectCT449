import apiClient from './apiClient'

const EMPLOYEES_PATH = '/api/employees'
const CREATE_FIELDS = ['hoTenNV', 'chucVu', 'diaChi', 'soDienThoai']
const UPDATE_FIELDS = ['hoTenNV', 'diaChi', 'soDienThoai']

function normalizeEmployee(employee) {
  if (!employee || typeof employee !== 'object' || typeof employee.maNhanVien !== 'string' || !employee.maNhanVien.trim()) {
    throw new Error('Backend trả về hồ sơ nhân viên không hợp lệ.')
  }
  const profile = { ...employee }
  delete profile.accountCreation
  return {
    ...profile,
    hoTen: employee.hoTenNV || '',
    soDienThoai: employee.soDienThoai || '',
    diaChi: employee.diaChi || '',
  }
}

function toPayload(record, fields) {
  const source = { hoTenNV: String(record.hoTen || '').trim(), chucVu: record.chucVu }
  for (const field of ['diaChi', 'soDienThoai']) {
    const value = String(record[field] || '').trim()
    if (value) source[field] = value
  }
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(source, field)).map((field) => [field, source[field]]))
}

export async function getEmployees() {
  const result = await apiClient.get(EMPLOYEES_PATH)
  if (!Array.isArray(result)) throw new Error('Backend trả về danh sách nhân viên không hợp lệ.')
  return result.map(normalizeEmployee)
}

export async function getEmployee(maNhanVien) {
  return normalizeEmployee(await apiClient.get(`${EMPLOYEES_PATH}/${encodeURIComponent(maNhanVien)}`))
}

export async function createEmployee(record) {
  const employee = await apiClient.post(EMPLOYEES_PATH, toPayload(record, CREATE_FIELDS))
  return {
    employee: normalizeEmployee(employee),
    accountCreation: employee.accountCreation || null,
  }
}

export async function updateEmployee(maNhanVien, record) {
  return normalizeEmployee(await apiClient.put(`${EMPLOYEES_PATH}/${encodeURIComponent(maNhanVien)}`, toPayload(record, UPDATE_FIELDS)))
}
