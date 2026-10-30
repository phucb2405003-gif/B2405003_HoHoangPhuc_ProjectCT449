import { createRouter, createWebHistory } from 'vue-router'
import { authState, initializeAuth } from '@/services/authService'
import LoginView from '@/views/LoginView.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

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
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

router.beforeEach(async (to) => {
  await initializeAuth()
  if (to.meta.requiresAuth && !authState.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath }, replace: true }
  }
  if (to.meta.guestOnly && authState.isAuthenticated) return { name: 'dashboard', replace: true }
  return true
})

export default router
