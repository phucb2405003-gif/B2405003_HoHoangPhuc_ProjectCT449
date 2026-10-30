<script setup>
defineProps({
  page: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  total: { type: Number, required: true },
  pageSize: { type: Number, required: true },
})

const emit = defineEmits(['change'])
</script>

<template>
  <footer class="pagination-bar">
    <p>Hiển thị <strong>{{ total ? (page - 1) * pageSize + 1 : 0 }}–{{ Math.min(page * pageSize, total) }}</strong> trong <strong>{{ total }}</strong> mục</p>
    <div class="pagination-controls" aria-label="Phân trang">
      <button type="button" :disabled="page <= 1" aria-label="Trang trước" @click="emit('change', page - 1)">‹</button>
      <span>Trang {{ page }} / {{ pageCount }}</span>
      <button type="button" :disabled="page >= pageCount" aria-label="Trang sau" @click="emit('change', page + 1)">›</button>
    </div>
  </footer>
</template>
