<script setup>
import { computed, toRefs } from 'vue'
import StatusBadge from './StatusBadge.vue'
import RowActionMenu from './RowActionMenu.vue'

const props = defineProps({
  config: { type: Object, required: true },
  rows: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
})
const { config, rows, canManage } = toRefs(props)

const emit = defineEmits(['detail', 'edit', 'toggle-status', 'delete', 'add-stock', 'destroy-stock', 'reset-password'])

function displayDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}

function actionsFor(row, config, canManage) {
  if (!canManage) return []
  const actions = []
  if (!config.hideEdit) actions.push({ event: 'edit', label: 'Sửa' })
  if (config.key === 'accounts') actions.push({ event: 'reset-password', label: 'Đặt lại mật khẩu', ariaLabel: `Đặt lại mật khẩu cho ${row.tenDangNhap}` })
  if (config.stockActions) {
    actions.push({ event: 'add-stock', label: 'Bổ sung', tone: 'positive' })
    actions.push({ event: 'destroy-stock', label: 'Tiêu hủy', tone: 'danger' })
  }
  if (config.statusAction) {
    const isDanger = config.key === 'readers'
      ? row.trangThai === 'Bị cấm'
      : row[config.statusAction.key] === config.statusAction.activeValue
    actions.push({
      event: 'toggle-status',
      label: config.key === 'readers'
        ? 'Đổi trạng thái'
        : isDanger ? config.statusAction.activeLabel : config.statusAction.inactiveLabel,
      tone: isDanger ? 'danger' : 'positive',
    })
  }
  if (config.deleteAction) actions.push({ event: 'delete', label: 'Xóa', tone: 'danger' })
  return actions
}

function selectAction(action, row) {
  emit(action.event, row)
}

const actionsByRow = computed(() => new Map(rows.value.map((row) => [
  row,
  actionsFor(row, config.value, canManage.value),
])))
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
            <RowActionMenu v-if="actionsByRow.get(row).length" :actions="actionsByRow.get(row)" @select="selectAction($event, row)" />
          </td>
        </tr>
        <tr v-if="!rows.length"><td class="table-empty" :colspan="config.columns.length + 1"><strong>{{ config.key === 'publishers' ? 'Chưa có nhà xuất bản' : config.key === 'books' ? 'Chưa có sách' : 'Chưa có dữ liệu' }}</strong><span>{{ config.key === 'publishers' ? 'Danh sách nhà xuất bản hiện chưa có dữ liệu.' : config.key === 'books' ? 'Danh sách sách hiện chưa có dữ liệu.' : 'Các bản ghi sẽ xuất hiện tại đây khi có dữ liệu.' }}</span></td></tr>
      </tbody>
    </table>
  </div>
</template>
