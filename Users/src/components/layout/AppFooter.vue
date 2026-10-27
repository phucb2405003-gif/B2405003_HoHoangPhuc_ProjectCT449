<script setup>
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authState, initializeAuth } from '@/services/authService'
import './AppFooter.css'

const router = useRouter()
const showLoginNotice = ref(false)
let loginNoticeTimer

async function handleLoginLink() {
  await initializeAuth({ revalidate: true })

  if (authState.isAuthenticated && authState.user?.loaiTaiKhoan === 'DOCGIA') {
    showLoginNotice.value = true
    clearTimeout(loginNoticeTimer)
    loginNoticeTimer = setTimeout(() => {
      showLoginNotice.value = false
      loginNoticeTimer = undefined
    }, 2600)
    return
  }

  void router.push({ name: 'login' })
}

onUnmounted(() => clearTimeout(loginNoticeTimer))
</script>

<template>
  <footer class="home-footer">
    <div class="home-footer__columns">
      <section class="home-footer__column home-footer__about">
        <h2 class="home-footer__brand">
          <img src="@/assets/icons/square-library.svg" alt="" />
          <span>Thư viện trực tuyến</span>
        </h2>
        <p>Mở rộng tri thức, kết nối đam mê đọc sách.</p>
      </section>

      <section class="home-footer__column">
        <h2 class="home-footer__heading">Liên kết nhanh</h2>
        <ul class="home-footer__list">
          <li><RouterLink to="/">Trang chủ</RouterLink></li>
          <li><RouterLink to="/sach">Sách</RouterLink></li>
          <li><a href="/dang-nhap" @click.prevent="handleLoginLink">Đăng nhập</a></li>
          <li><RouterLink :to="{ name: 'reader-profile', query: { tab: 'thong-tin' } }">Trang cá nhân</RouterLink></li>
        </ul>
      </section>

      <section class="home-footer__column">
        <h2 class="home-footer__heading">Kết nối với thư viện</h2>
        <ul class="home-footer__list home-footer__socials">
          <li><span class="home-footer__social"><img src="@/assets/icons/facebook.svg" alt="" />Facebook </span></li>
          <li><span class="home-footer__social"><img src="@/assets/icons/instagram.svg" alt="" />Instagram </span></li>
          <li><span class="home-footer__social"><img src="@/assets/icons/twitter-alt.svg" alt="" />X </span></li>
        </ul>
      </section>
    </div>
    <p v-if="showLoginNotice" class="home-footer__notice" role="status" aria-live="polite">
      Bạn đã đăng nhập rồi
    </p>
    <div class="home-footer__copyright">© 2026 Thư viện trực tuyến. Tất cả quyền được bảo lưu.</div>
  </footer>
</template>
