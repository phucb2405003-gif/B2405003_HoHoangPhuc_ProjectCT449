<script setup>
import { computed } from 'vue'
import './StatusBadge.css'

const props = defineProps({
  value: { type: [String, Number, Boolean], default: '' },
  variants: { type: Object, default: () => ({}) },
  booleanStatus: { type: Boolean, default: false },
})

const label = computed(() => props.booleanStatus ? (props.value ? 'Đang hoạt động' : 'Đã khóa') : String(props.value ?? '—'))
const variant = computed(() => props.variants[String(props.value)] || 'neutral')
</script>

<template>
  <span class="status-badge" :class="`status-badge--${variant}`"><span class="status-badge__dot"></span>{{ label }}</span>
</template>
