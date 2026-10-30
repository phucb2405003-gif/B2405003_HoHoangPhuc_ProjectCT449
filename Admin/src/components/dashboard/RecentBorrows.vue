<script setup>
import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps({ rows: { type: Array, default: () => [] } })
const variants = { 'Chờ duyệt': 'warning', 'Đang mượn': 'info', 'Hoàn tất': 'success', 'Đã từ chối': 'danger', 'Đã hủy': 'neutral' }
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
            <td>{{ new Date(`${row.ngayYeuCau}T00:00:00`).toLocaleDateString('vi-VN') }}</td>
            <td><StatusBadge :value="row.trangThai" :variants="variants" /></td>
          </tr>
          <tr v-if="!rows.length"><td class="table-empty" colspan="4">Chưa có phiếu mượn.</td></tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
