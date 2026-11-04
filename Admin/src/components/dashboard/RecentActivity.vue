<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
</script>

<template>
  <section class="dashboard-panel activity-panel" aria-labelledby="activity-title">
    <header class="dashboard-panel__header"><div><h3 id="activity-title">Hoạt động gần đây</h3><p>Các sự kiện mới nhất</p></div></header>
    <ol v-if="items.length" class="activity-list">
      <li v-for="item in items" :key="item.key" class="activity-item">
        <span class="activity-dot" :class="`activity-dot--${item.type}`"></span>
        <div><strong>{{ item.title }}</strong><p>{{ item.description }}</p><small>{{ item.time }}</small></div>
      </li>
    </ol>
    <p v-if="loading && !items.length" class="activity-empty" role="status">Đang tải hoạt động…</p>
    <p v-else-if="!items.length && error" class="activity-empty activity-empty--error" role="status">Không thể tải đủ dữ liệu để xác định hoạt động.</p>
    <p v-else-if="!items.length" class="activity-empty" role="status">Chưa có hoạt động để hiển thị.</p>
    <p v-if="items.length && error" class="activity-empty activity-empty--error" role="status">Một số chi tiết phiếu chưa tải được; hoạt động trả sách có thể chưa đầy đủ.</p>
  </section>
</template>
