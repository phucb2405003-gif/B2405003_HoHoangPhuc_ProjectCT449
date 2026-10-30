<script setup>
defineProps({ items: { type: Array, default: () => [] } })
</script>

<template>
  <section class="dashboard-panel activity-panel" aria-labelledby="activity-title">
    <header class="dashboard-panel__header"><div><h3 id="activity-title">Hoạt động gần đây</h3><p>Sự kiện minh họa trên giao diện</p></div></header>
    <ol class="activity-list">
      <li v-for="item in items" :key="item.title" class="activity-item">
        <span class="activity-dot" :class="`activity-dot--${item.type}`"></span>
        <div><strong>{{ item.title }}</strong><p>{{ item.description }}</p><small>{{ item.time }}</small></div>
      </li>
    </ol>
  </section>
</template>
