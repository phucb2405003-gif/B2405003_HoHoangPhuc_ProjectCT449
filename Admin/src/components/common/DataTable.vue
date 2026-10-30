<script setup>
import StatusBadge from './StatusBadge.vue'
import editIcon from '@/assets/icons/notebook-pen.svg'

defineProps({
  config: { type: Object, required: true },
  rows: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
})

const emit = defineEmits(['detail', 'edit', 'toggle-status', 'delete', 'add-stock', 'destroy-stock'])

function displayDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}
</script>

<template>
  <div class="data-table-scroll">
    <table class="data-table">
      <thead><tr><th v-for="column in config.columns" :key="column.key">{{ column.label }}</th><th class="table-actions-heading">Thao tác</th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row[config.codeField]">
          <td v-for="column in config.columns" :key="column.key">
            <div v-if="column.secondaryKey" class="table-primary-secondary">
              <strong>{{ row[column.key] || '—' }}</strong><small>{{ row[column.secondaryKey] || '—' }}</small>
            </div>
            <StatusBadge v-else-if="column.type === 'status'" :value="row[column.key]" :variants="config.statusVariants" :boolean-status="column.booleanStatus" />
            <strong v-else-if="column.strong" class="table-strong">{{ row[column.key] || '—' }}</strong>
            <span v-else-if="column.key === 'soQuyen'">{{ row.soQuyen ?? 0 }} bản</span>
            <span v-else-if="column.key === 'soQuyenConLai'">{{ row.soQuyenConLai ?? 0 }} bản có thể mượn</span>
            <span v-else>{{ column.type === 'date' ? displayDate(row[column.key]) : row[column.key] ?? '—' }}</span>
          </td>
          <td class="table-actions">
            <button class="table-action" type="button" @click="emit('detail', row)">Chi tiết</button>
            <button v-if="canManage && !config.hideEdit" class="table-action" type="button" @click="emit('edit', row)"><img class="table-action__icon" :src="editIcon" alt="" aria-hidden="true">Sửa</button>
            <button v-if="canManage && config.stockActions" class="table-action table-action--positive" type="button" @click="emit('add-stock', row)">Bổ sung</button>
            <button v-if="canManage && config.stockActions" class="table-action table-action--danger" type="button" @click="emit('destroy-stock', row)">Tiêu hủy</button>
            <button
              v-if="canManage && config.statusAction"
              class="table-action"
              :class="config.key === 'readers' ? row.trangThai === 'Bị cấm' ? 'table-action--danger' : 'table-action--positive' : row[config.statusAction.key] === config.statusAction.activeValue ? 'table-action--danger' : 'table-action--positive'"
              type="button"
              @click="emit('toggle-status', row)"
            >{{ config.key === 'readers' ? 'Đổi trạng thái' : row[config.statusAction.key] === config.statusAction.activeValue ? config.statusAction.activeLabel : config.statusAction.inactiveLabel }}</button>
            <button v-if="canManage && config.deleteAction" class="table-action table-action--danger" type="button" @click="emit('delete', row)">Xóa</button>
          </td>
        </tr>
        <tr v-if="!rows.length"><td class="table-empty" :colspan="config.columns.length + 1"><strong>{{ config.key === 'publishers' ? 'Chưa có nhà xuất bản' : config.key === 'books' ? 'Chưa có sách' : 'Chưa có dữ liệu' }}</strong><span>{{ config.key === 'publishers' ? 'Danh sách nhà xuất bản hiện chưa có dữ liệu.' : config.key === 'books' ? 'Danh sách sách hiện chưa có dữ liệu.' : 'Các bản ghi sẽ xuất hiện tại đây khi có dữ liệu.' }}</span></td></tr>
      </tbody>
    </table>
  </div>
</template>
