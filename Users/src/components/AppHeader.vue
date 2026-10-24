<script setup>
import './AppHeader.css'
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink to="/" class="app-header__brand">
        <span class="app-header__logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5.75A2.75 2.75 0 0 1 6.75 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5m4-11h8m-8 4h8" />
          </svg>
        </span>
        <span class="app-header__name">Thư viện trực tuyến</span>
      </RouterLink>
      <nav class="app-header__nav" aria-label="Điều hướng chính">
        <RouterLink to="/" class="app-header__link app-header__link--active">Trang chủ</RouterLink>
        <RouterLink to="/sach" class="app-header__link">Sách</RouterLink>
        <RouterLink to="/theo-doi-muon-sach" class="app-header__link">Theo dõi mượn sách</RouterLink>
        <RouterLink to="/dang-nhap" class="app-header__login">Đăng nhập</RouterLink>
      </nav>
    </div>
  </header>
</template>
