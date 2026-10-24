<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
    <section class="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg sm:p-12">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-600">Lỗi 404</p>
      <h1 class="mt-3 text-3xl font-bold text-slate-900">Không tìm thấy trang</h1>
      <p class="mt-4 text-slate-600">Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
      <RouterLink
        to="/"
        class="mt-8 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        Quay về trang chủ
      </RouterLink>
    </section>
  </main>
</template>
