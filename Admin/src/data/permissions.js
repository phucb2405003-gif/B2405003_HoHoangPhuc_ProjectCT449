export const ROLE_MANAGER = 'Quản lý'
export const ROLE_LIBRARIAN = 'Thủ thư'

// Bản mô phỏng menu bám theo route Backend đã đọc; Backend vẫn là nguồn quyết định quyền.
const roleAccess = {
  [ROLE_MANAGER]: ['dashboard', 'books', 'readers', 'borrows', 'publishers', 'employees', 'accounts', 'profile'],
  [ROLE_LIBRARIAN]: ['dashboard', 'books', 'readers', 'borrows', 'publishers', 'profile'],
}

export function canOpenModule(role, moduleKey) {
  return roleAccess[role]?.includes(moduleKey) ?? moduleKey === 'dashboard'
}

export const adminNavigation = [
  { key: 'dashboard', label: 'Tổng quan', to: '/dashboard', icon: 'panels-top-left', section: 'workspace' },
  { key: 'books', label: 'Quản lý sách', to: '/books', icon: 'book-open-text', section: 'collection' },
  { key: 'readers', label: 'Quản lý độc giả', to: '/readers', icon: 'user', section: 'collection' },
  { key: 'borrows', label: 'Quản lý mượn sách', to: '/borrows', icon: 'book-lock', section: 'collection' },
  { key: 'publishers', label: 'Nhà xuất bản', to: '/publishers', icon: 'publisher', section: 'catalog' },
  { key: 'employees', label: 'Nhân viên', to: '/employees', icon: 'id-card-lanyard', section: 'system' },
  { key: 'accounts', label: 'Tài khoản', to: '/accounts', icon: 'user', section: 'system' },
  { key: 'profile', label: 'Thông tin cá nhân', to: '/profile', icon: 'file-user', section: 'system' },
]

export const navigationSections = [
  { key: 'workspace', label: 'KHÔNG GIAN LÀM VIỆC' },
  { key: 'collection', label: 'NGHIỆP VỤ THƯ VIỆN' },
  { key: 'catalog', label: 'DANH MỤC' },
  { key: 'system', label: 'QUẢN TRỊ HỆ THỐNG' },
]
