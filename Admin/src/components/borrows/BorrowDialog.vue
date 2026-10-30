<script setup>
import { toRef } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import RowActionMenu from '@/components/common/RowActionMenu.vue'
import useBorrowDialog from '@/composables/useBorrowDialog'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'detail' },
  borrow: { type: Object, default: null },
  canManage: { type: Boolean, default: false },
  detailLoading: { type: Boolean, default: false },
  detailError: { type: String, default: '' },
  actionLoading: { type: Boolean, default: false },
  actionError: { type: String, default: '' },
  createLoading: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'approve', 'reject-open', 'reject', 'return-book', 'create'])
const {
  rejectReason,
  rejectError,
  readerCode,
  bookCodesInput,
  selectedBookCodes,
  createError,
  borrowVariants,
  bookVariants,
  submitRejection,
  submitCreate,
} = useBorrowDialog({
  open: toRef(props, 'open'),
  mode: toRef(props, 'mode'),
  onReject: (reason) => emit('reject', reason),
  onCreate: (payload) => emit('create', payload),
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop" @click.self="!actionLoading && !createLoading && emit('close')" @keydown.esc="!actionLoading && !createLoading && emit('close')">
      <section class="borrow-dialog" role="dialog" aria-modal="true" :aria-labelledby="'borrow-dialog-title'">
        <header class="entity-dialog__header">
          <div><p class="dialog-kicker">{{ mode === 'create' ? 'MƯỢN SÁCH TẠI QUẦY' : 'CHI TIẾT PHIẾU MƯỢN' }}</p><h2 id="borrow-dialog-title">{{ mode === 'create' ? 'Tạo phiếu mượn' : borrow?.maPhieu }}</h2></div>
          <button class="dialog-close" type="button" aria-label="Đóng" :disabled="actionLoading || createLoading" @click="emit('close')">×</button>
        </header>

        <div class="borrow-dialog__body">
          <div v-if="mode === 'create'">
            <form class="borrow-create-form" @submit.prevent="submitCreate">
              <label class="form-field">Độc giả <span aria-hidden="true">*</span>
                <input v-model="readerCode" type="text" autocomplete="off" placeholder="Nhập mã độc giả" :disabled="createLoading">
              </label>
              <label class="form-field">Mã sách (tối đa 5, phân cách bằng dấu phẩy hoặc xuống dòng) <span aria-hidden="true">*</span>
                <textarea v-model="bookCodesInput" rows="4" autocomplete="off" placeholder="Nhập mã sách" :disabled="createLoading"></textarea>
              </label>
              <p v-if="createError" class="field-error" role="alert">{{ createError }}</p>
              <p v-if="actionError" class="dialog-error" role="alert">{{ actionError }}</p>
              <div class="dialog-actions"><button class="button button--secondary" type="button" :disabled="createLoading" @click="emit('close')">Hủy</button><button class="button button--primary" type="submit" :disabled="createLoading">{{ createLoading ? 'Đang tạo…' : 'Tạo phiếu tại quầy' }}</button></div>
            </form>
          </div>
          <template v-else-if="borrow">
          <div class="borrow-summary-grid">
            <div><span>Trạng thái phiếu</span><StatusBadge :value="borrow.trangThai" :variants="borrowVariants" /></div>
            <div><span>Độc giả</span><strong>{{ borrow.tenDocGia }} · {{ borrow.maDocGia }}</strong></div>
            <div><span>Ngày yêu cầu</span><strong>{{ borrow.ngayYeuCau || '—' }}</strong></div>
            <div><span>Ngày mượn</span><strong>{{ borrow.ngayMuon || 'Chưa ghi nhận' }}</strong></div>
          </div>

          <div v-if="mode === 'reject'" class="reject-form">
            <label for="reject-reason">Lý do từ chối phiếu <b>*</b></label>
            <textarea id="reject-reason" v-model="rejectReason" class="reject-reason" rows="3" placeholder="Nhập lý do từ chối"></textarea>
            <small v-if="rejectError" class="field-error">{{ rejectError }}</small>
            <p v-if="actionError" class="dialog-error" role="alert">{{ actionError }}</p>
            <div class="dialog-actions"><button class="button button--secondary" type="button" :disabled="actionLoading" @click="emit('close')">Quay lại</button><button class="button button--danger" type="button" :disabled="actionLoading" @click="submitRejection">{{ actionLoading ? 'Đang gửi…' : 'Từ chối phiếu' }}</button></div>
          </div>

          <template v-else>
            <p v-if="borrow.lyDoTuChoi" class="borrow-rejection-note"><strong>Lý do từ chối:</strong> {{ borrow.lyDoTuChoi }}</p>
            <p v-if="borrow.trangThai === 'Hủy' && borrow.lyDoHuy" class="borrow-cancellation-note"><strong>Lý do hủy:</strong> {{ borrow.lyDoHuy }}</p>
            <p v-if="detailLoading" class="management-state">Đang tải chi tiết phiếu…</p>
            <p v-else-if="detailError" class="dialog-error" role="alert">{{ detailError }}</p>
            <p v-if="actionError" class="dialog-error" role="alert">{{ actionError }}</p>
            <h3 class="borrow-books-title">Sách trong phiếu <span>{{ borrow.chiTiet.length }}</span></h3>
            <div class="borrow-books-list">
              <article v-for="book in borrow.chiTiet" :key="book.maSach" class="borrow-book-row">
                <div class="borrow-book-copy"><strong>{{ book.tenSach }}</strong><small>Mã sách {{ book.maSach }}<template v-if="book.hanTra"> · Hạn {{ book.hanTra }}</template><template v-if="book.ngayTra"> · Trả {{ book.ngayTra }}</template></small></div>
                <StatusBadge :value="book.trangThaiSach" :variants="bookVariants" />
                <RowActionMenu
                  v-if="canManage && borrow.trangThai === 'Đã duyệt' && book.trangThaiSach === 'Đang mượn'"
                  :actions="[{ event: 'return-book', label: actionLoading ? 'Đang gửi…' : 'Ghi nhận trả', tone: 'positive' }]"
                  :disabled="actionLoading"
                  :trigger-label="actionLoading ? 'Đang gửi…' : 'Thao tác'"
                  @select="emit('return-book', book)"
                />
              </article>
            </div>
            <div v-if="canManage && borrow.trangThai === 'Chờ duyệt'" class="dialog-actions borrow-dialog__actions">
              <button class="button button--danger" type="button" :disabled="actionLoading" @click="emit('reject-open')">Từ chối</button>
              <button class="button button--primary" type="button" :disabled="actionLoading" @click="emit('approve')">Duyệt phiếu</button>
            </div>
            <div v-else class="dialog-actions borrow-dialog__actions"><button class="button button--secondary" type="button" @click="emit('close')">Đóng</button></div>
          </template>
          </template>
        </div>
      </section>
    </div>
  </Teleport>
</template>
