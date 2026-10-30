<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  caption: { type: String, required: true },
  icon: { type: String, required: true },
})
</script>

<template>
  <article class="stat-card">
    <span class="stat-card__icon"><img :src="icon" alt="" aria-hidden="true"></span>
    <div class="stat-card__copy"><p>{{ label }}</p><strong>{{ value }}</strong><small>{{ caption }}</small></div>
  </article>
</template>
