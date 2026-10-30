<script setup>
import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps({ rows: { type: Array, default: () => [] }, error: { type: String, default: '' } })
const variants = { 'Đang chọn sách': 'neutral', 'Chờ duyệt': 'warning', 'Đã duyệt': 'info', 'Từ chối': 'danger', 'Hủy': 'neutral' }
</script>

<template>
  <section class="dashboard-panel recent-borrows" aria-labelledby="recent-borrows-title">
    <header class="dashboard-panel__header">
      <div><h3 id="recent-borrows-title">Phiếu mượn gần đây</h3><p>Các phiếu mượn mới nhất</p></div>
      <RouterLink to="/borrows" class="panel-link">Xem danh sách <span aria-hidden="true">›</span></RouterLink>
    </header>
    <div class="recent-borrows__scroll">
      <table class="data-table recent-borrows__table">
        <colgroup>
          <col class="recent-borrows__col recent-borrows__col--code">
          <col class="recent-borrows__col recent-borrows__col--reader">
          <col class="recent-borrows__col recent-borrows__col--date">
          <col class="recent-borrows__col recent-borrows__col--status">
        </colgroup>
        <thead><tr><th>Mã phiếu</th><th>Độc giả</th><th>Ngày yêu cầu</th><th>Trạng thái phiếu</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.maPhieu">
            <td><strong class="table-strong">{{ row.maPhieu }}</strong></td>
            <td>{{ row.tenDocGia }}</td>
            <td>{{ row.ngayYeuCau || '—' }}</td>
            <td><StatusBadge :value="row.trangThai" :variants="variants" /></td>
          </tr>
          <tr v-if="error"><td class="table-empty" colspan="4">{{ error }}</td></tr>
          <tr v-else-if="!rows.length"><td class="table-empty" colspan="4">Chưa có phiếu mượn.</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
