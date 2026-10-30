<script setup>
import PaginationControl from '@/components/common/PaginationControl.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import BorrowDialog from '@/components/borrows/BorrowDialog.vue'
import useBorrowManagement from '@/composables/useBorrowManagement'
import '@/components/common/ManagementView.css'
import './BorrowsView.css'
import searchIcon from '@/assets/icons/search.svg'

const {
  search, statusFilter, page, pageSize, statusOptions, filteredBorrows, pageRows, pageCount, canManage,
  listLoading, listError, loadBorrows, dialogOpen, dialogMode, selectedBorrow, detailLoading, detailError,
  actionLoading, actionError, actionNotice, createLoading, confirmOpen, confirmation,
  openDetails, openCreate, openReject, closeDialog, askConfirmation, confirmBorrowAction, rejectBorrow, returnBook, createBorrow,
} = useBorrowManagement()
const borrowVariants = { 'Đang chọn sách': 'neutral', 'Chờ duyệt': 'warning', 'Đã duyệt': 'info', 'Từ chối': 'danger', 'Hủy': 'neutral' }
</script>

<template>
  <section class="borrow-management" aria-labelledby="borrow-page-title">
    <header class="management-heading">
      <div><div class="management-heading__eyebrow"><span class="heading-indicator"></span> NGHIỆP VỤ THƯ VIỆN</div><h2 id="borrow-page-title">Quản lý mượn sách</h2><p>Theo dõi phiếu mượn và tình trạng từng cuốn sách riêng biệt.</p></div>
      <button v-if="canManage" class="button button--primary" type="button" :disabled="createLoading" @click="openCreate">Tạo phiếu tại quầy</button>
    </header>

    <p v-if="actionNotice" class="management-feedback" role="status">{{ actionNotice }}</p>
    <p v-if="actionError && !dialogOpen && !confirmOpen" class="management-feedback management-feedback--error" role="alert">{{ actionError }}</p>
    <section class="management-card">
      <div class="table-toolbar">
        <label class="search-box"><img class="search-box__icon" :src="searchIcon" alt="" aria-hidden="true"><input v-model="search" type="search" placeholder="Tìm mã phiếu, mã hoặc tên độc giả" aria-label="Tìm phiếu mượn"><button v-if="search" type="button" aria-label="Xóa tìm kiếm" @click="search = ''">×</button></label>
        <label class="filter-select"><span class="sr-only">Lọc theo trạng thái phiếu</span><select v-model="statusFilter"><option value="">Tất cả trạng thái phiếu</option><option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option></select></label>
      </div>

      <div v-if="listLoading" class="management-state" role="status">Đang tải danh sách phiếu mượn…</div>
      <div v-else-if="listError" class="management-state management-state--error" role="alert"><strong>{{ listError }}</strong><button class="button button--secondary" type="button" @click="loadBorrows">Thử tải lại</button></div>
      <div v-else class="data-table-scroll">
        <table class="data-table borrow-table">
          <thead><tr><th>Mã phiếu</th><th>Độc giả</th><th>Ngày yêu cầu</th><th>Ngày mượn</th><th>Trạng thái phiếu</th><th class="table-actions-heading">Thao tác</th></tr></thead>
          <tbody>
            <tr v-for="borrow in pageRows" :key="borrow.maPhieu">
              <td><strong class="table-strong">{{ borrow.maPhieu }}</strong></td>
              <td><div class="table-primary-secondary"><strong>{{ borrow.tenDocGia }}</strong><small>{{ borrow.maDocGia }}</small></div></td>
              <td>{{ borrow.ngayYeuCau }}</td><td>{{ borrow.ngayMuon || '—' }}</td>
              <td><StatusBadge :value="borrow.trangThai" :variants="borrowVariants" /></td>
              <td class="table-actions"><button class="table-action" type="button" @click="openDetails(borrow)">Chi tiết</button></td>
            </tr>
            <tr v-if="!pageRows.length"><td class="table-empty" colspan="6"><strong>{{ filteredBorrows.length ? 'Không có phiếu phù hợp' : 'Chưa có phiếu mượn' }}</strong><span>{{ filteredBorrows.length ? 'Thử điều chỉnh từ khóa hoặc bộ lọc.' : 'Các phiếu sẽ xuất hiện tại đây khi có dữ liệu.' }}</span></td></tr>
          </tbody>
        </table>
      </div>
      <PaginationControl v-if="!listLoading && !listError" :page="page" :page-count="pageCount" :total="filteredBorrows.length" :page-size="pageSize" @change="page = $event" />
    </section>

    <BorrowDialog
      :open="dialogOpen"
      :mode="dialogMode"
      :borrow="selectedBorrow"
      :can-manage="canManage"
      :detail-loading="detailLoading"
      :detail-error="detailError"
      :action-loading="actionLoading"
      :action-error="actionError"
      :create-loading="createLoading"
      @close="closeDialog"
      @approve="askConfirmation('approve', selectedBorrow)"
      @reject-open="openReject(selectedBorrow)"
      @reject="rejectBorrow"
      @return-book="returnBook"
      @create="createBorrow"
    />
    <ConfirmDialog :open="confirmOpen" :title="confirmation.title" :message="confirmation.message" :confirm-label="confirmation.confirmLabel" :tone="confirmation.tone" :busy="actionLoading" :error="actionError" @confirm="confirmBorrowAction" @close="!actionLoading && (confirmOpen = false)" />
  </section>
</template>
