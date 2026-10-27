import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import BooksView from '@/views/BooksView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import { authState, initializeAuth } from '@/services/authService'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/dang-nhap',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/sach',
      name: 'books',
      component: BooksView,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.name !== 'login') return true

  await initializeAuth({ revalidate: true })
  if (authState.isAuthenticated && authState.user?.loaiTaiKhoan === 'DOCGIA') {
    return { name: 'home', replace: true }
  }

  return true
})

export default router
