<script setup>
import { computed } from 'vue'

const props = defineProps({ data: { type: Array, required: true } })
const maxValue = computed(() => Math.max(...props.data.map((item) => item.count), 1))
</script>

<template>
  <section class="dashboard-panel trend-panel" aria-labelledby="trend-title">
    <header class="dashboard-panel__header">
      <div><h3 id="trend-title">Tình hình mượn sách</h3><p>Số phiếu theo tháng · dữ liệu minh họa</p></div>
      <span class="chart-legend"><i></i> Phiếu mượn</span>
    </header>
    <div class="trend-chart" role="img" aria-label="Biểu đồ cột số phiếu mượn trong sáu tháng gần đây">
      <div v-for="item in data" :key="item.month" class="trend-column" :aria-label="`${item.month}: ${item.count} phiếu`">
        <strong>{{ item.count }}</strong>
        <div class="trend-column__track"><span :style="{ height: `${Math.max(12, item.count / maxValue * 100)}%` }"></span></div>
        <small>{{ item.month }}</small>
      </div>
    </div>
  </section>
</template>
