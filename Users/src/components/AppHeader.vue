<script setup>
import './AppHeader.css'
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink to="/" class="app-header__brand">
        <span class="app-header__logo" aria-hidden="true">
          <img class="app-header__logo-image" src="@/assets/icons/square-library.svg" alt="" />
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
