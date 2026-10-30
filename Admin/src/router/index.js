import { createRouter, createWebHistory } from 'vue-router'
import { authState, initializeAuth } from '@/services/authService'
import LoginView from '@/views/LoginView.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import DashboardView from '@/views/dashboard/DashboardView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import { canOpenModule } from '@/data/permissions'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dang-nhap', name: 'login', component: LoginView, meta: { guestOnly: true } },
    {
      path: '/dashboard',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [{ path: '', name: 'dashboard', component: DashboardView }],
    },
    ...[
      { key: 'books', path: '/books', component: () => import('@/views/books/BooksView.vue') },
      { key: 'readers', path: '/readers', component: () => import('@/views/readers/ReadersView.vue') },
      { key: 'borrows', path: '/borrows', component: () => import('@/views/borrows/BorrowsView.vue') },
      { key: 'publishers', path: '/publishers', component: () => import('@/views/publishers/PublishersView.vue') },
      { key: 'employees', path: '/employees', component: () => import('@/views/employees/EmployeesView.vue') },
      { key: 'accounts', path: '/accounts', component: () => import('@/views/accounts/AccountsView.vue') },
      { key: 'profile', path: '/profile', component: () => import('@/views/profile/ProfileView.vue') },
    ].map(({ key, path, component }) => ({
      path,
      component: AdminLayout,
      meta: { requiresAuth: true, moduleKey: key },
      children: [{ path: '', name: key, component }],
    })),
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

router.beforeEach(async (to) => {
  await initializeAuth()
  if (to.meta.requiresAuth && !authState.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath }, replace: true }
  }
  if (to.meta.moduleKey && !canOpenModule(authState.user?.chucVu, to.meta.moduleKey)) {
    return { name: 'dashboard', replace: true }
  }
  if (to.meta.guestOnly && authState.isAuthenticated) return { name: 'dashboard', replace: true }
  return true
})

export default router
