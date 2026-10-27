import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import BooksView from '@/views/BooksView.vue'
import BookDetailView from '@/views/BookDetailView.vue'
import ProfileView from '@/views/ProfileView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import { authState, initializeAuth } from '@/services/authService'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from) {
    if (!from.matched.length || to.path !== from.path) {
      return { left: 0, top: 0 }
    }

    return false
  },
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
      path: '/sach/:maSach',
      name: 'book-detail',
      component: BookDetailView,
      props: true,
    },
    {
      path: '/trang-ca-nhan',
      name: 'reader-profile',
      component: ProfileView,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

router.beforeEach(async (to, from) => {
  if (to.name === 'reader-profile') {
    if (from.name === 'reader-profile') return true

    await initializeAuth({ revalidate: true })
    if (authState.isAuthenticated && authState.user?.loaiTaiKhoan === 'DOCGIA') return true

    return {
      name: 'login',
      query: { redirect: to.fullPath },
      replace: true,
    }
  }

  if (to.name !== 'login') return true

  await initializeAuth({ revalidate: true })
  if (authState.isAuthenticated && authState.user?.loaiTaiKhoan === 'DOCGIA') {
    return { name: 'home', replace: true }
  }

  return true
})

export default router
