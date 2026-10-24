<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import FeaturedBooks from '@/components/home/featured-books/FeaturedBooks.vue'
import './HomeView.css'
</script>

<template>
  <div class="home-page">
    <AppHeader />
    <main>
      <section class="home-hero">
        <div class="home-page__content home-hero__content">
          <p class="home-hero__eyebrow">THƯ VIỆN TRỰC TUYẾN</p>
          <h1>Chào mừng bạn đến với trang độc giả</h1>
          <p class="home-hero__description">Khám phá và theo dõi những cuốn sách bạn yêu thích.</p>
          <form class="home-search" role="search" @submit.prevent>
            <input class="home-search__input" type="search" placeholder="Tìm kiếm sách, tác giả, thể loại..." aria-label="Tìm kiếm sách, tác giả, thể loại" />
            <button class="home-search__button" type="submit" disabled>Tìm kiếm</button>
          </form>
        </div>
      </section>

      <FeaturedBooks />
    </main>

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
            <li><span class="home-footer__unavailable">Danh sách sách <small>Chưa có trang</small></span></li>
            <li><span class="home-footer__unavailable">Đăng nhập <small>Chưa có trang</small></span></li>
            <li><span class="home-footer__unavailable">Đăng ký <small>Chưa có trang</small></span></li>
            <li><span class="home-footer__unavailable">Trang cá nhân <small>Chưa có trang</small></span></li>
          </ul>
        </section>

        <section class="home-footer__column">
          <h2 class="home-footer__heading">Kết nối với thư viện</h2>
          <ul class="home-footer__list home-footer__socials">
            <li><span class="home-footer__social"><img src="@/assets/icons/facebook.svg" alt="" />Facebook <small>Chưa có URL</small></span></li>
            <li><span class="home-footer__social"><img src="@/assets/icons/instagram.svg" alt="" />Instagram <small>Chưa có URL</small></span></li>
            <li><span class="home-footer__social"><img src="@/assets/icons/twitter-alt.svg" alt="" />X <small>Chưa có URL</small></span></li>
          </ul>
        </section>
      </div>
      <div class="home-footer__copyright">© 2026 Thư viện trực tuyến. Tất cả quyền được bảo lưu.</div>
    </footer>
  </div>
</template>
