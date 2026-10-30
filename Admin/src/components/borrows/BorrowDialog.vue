<script setup>
import { ref, watch } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'detail' },
  borrow: { type: Object, default: null },
  canManage: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'approve', 'reject-open', 'reject', 'return-book'])
const rejectReason = ref('')
const rejectError = ref('')
const borrowVariants = { 'Chờ duyệt': 'warning', 'Đang mượn': 'info', 'Hoàn tất': 'success', 'Đã từ chối': 'danger', 'Đã hủy': 'neutral' }
const bookVariants = { 'Chưa giao': 'neutral', 'Đang mượn': 'info', 'Đã trả': 'success', 'Quá hạn': 'danger' }

watch(() => [props.open, props.mode], () => { rejectReason.value = ''; rejectError.value = '' })

function submitRejection() {
  if (!rejectReason.value.trim()) {
    rejectError.value = 'Vui lòng nhập lý do từ chối.'
    return
  }
  emit('reject', rejectReason.value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open && borrow" class="dialog-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
      <section class="borrow-dialog" role="dialog" aria-modal="true" :aria-labelledby="'borrow-dialog-title'">
        <header class="entity-dialog__header">
          <div><p class="dialog-kicker">CHI TIẾT PHIẾU MƯỢN</p><h2 id="borrow-dialog-title">{{ borrow.maPhieu }}</h2></div>
          <button class="dialog-close" type="button" aria-label="Đóng" @click="emit('close')">×</button>
        </header>

        <div class="borrow-dialog__body">
          <div class="borrow-summary-grid">
            <div><span>Trạng thái phiếu</span><StatusBadge :value="borrow.trangThai" :variants="borrowVariants" /></div>
            <div><span>Độc giả</span><strong>{{ borrow.tenDocGia }} · {{ borrow.maDocGia }}</strong></div>
            <div><span>Ngày yêu cầu</span><strong>{{ borrow.ngayYeuCau }}</strong></div>
            <div><span>Ngày mượn</span><strong>{{ borrow.ngayMuon || 'Chưa ghi nhận' }}</strong></div>
          </div>

          <div v-if="mode === 'reject'" class="reject-form">
            <label for="reject-reason">Lý do từ chối phiếu <b>*</b></label>
            <textarea id="reject-reason" v-model="rejectReason" class="reject-reason" rows="3" placeholder="Nhập lý do từ chối"></textarea>
            <small v-if="rejectError" class="field-error">{{ rejectError }}</small>
            <div class="dialog-actions"><button class="button button--secondary" type="button" @click="emit('close')">Quay lại</button><button class="button button--danger" type="button" @click="submitRejection">Từ chối phiếu</button></div>
          </div>

          <template v-else>
            <p v-if="borrow.lyDoTuChoi" class="borrow-rejection-note"><strong>Lý do từ chối:</strong> {{ borrow.lyDoTuChoi }}</p>
            <p v-if="borrow.trangThai === 'Đã hủy' && borrow.lyDoHuy" class="borrow-cancellation-note"><strong>Lý do hủy:</strong> {{ borrow.lyDoHuy }}</p>
            <h3 class="borrow-books-title">Sách trong phiếu <span>{{ borrow.chiTiet.length }}</span></h3>
            <div class="borrow-books-list">
              <article v-for="book in borrow.chiTiet" :key="book.maSach" class="borrow-book-row">
                <div class="borrow-book-copy"><strong>{{ book.tenSach }}</strong><small>Mã sách {{ book.maSach }}<template v-if="book.ngayTra"> · Trả {{ book.ngayTra }}</template></small></div>
                <StatusBadge :value="book.trangThaiSach" :variants="bookVariants" />
                <button v-if="canManage && borrow.trangThai === 'Đang mượn' && ['Đang mượn', 'Quá hạn'].includes(book.trangThaiSach)" class="table-action table-action--positive" type="button" @click="emit('return-book', book)">Ghi nhận trả</button>
              </article>
            </div>
            <div v-if="canManage && borrow.trangThai === 'Chờ duyệt'" class="dialog-actions borrow-dialog__actions">
              <button class="button button--danger" type="button" @click="emit('reject-open')">Từ chối</button>
              <button class="button button--primary" type="button" @click="emit('approve')">Duyệt phiếu</button>
            </div>
            <div v-else class="dialog-actions borrow-dialog__actions"><button class="button button--secondary" type="button" @click="emit('close')">Đóng</button></div>
          </template>
        </div>
      </section>
    </div>
  </Teleport>
</template>
