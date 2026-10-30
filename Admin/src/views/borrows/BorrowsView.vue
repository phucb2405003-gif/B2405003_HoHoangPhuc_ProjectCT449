<script setup>
import MockDataNotice from '@/components/common/MockDataNotice.vue'
import PaginationControl from '@/components/common/PaginationControl.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import BorrowDialog from '@/components/borrows/BorrowDialog.vue'
import useMockBorrows from '@/composables/useMockBorrows'
import './BorrowsView.css'
import searchIcon from '@/assets/icons/search.svg'

const {
  search, statusFilter, page, pageSize, statusOptions, filteredBorrows, pageRows, pageCount, canManage,
  dialogOpen, dialogMode, selectedBorrow, confirmOpen, confirmation,
  openDetails, openReject, closeDialog, askConfirmation, confirmBorrowAction, rejectBorrow, returnBook,
} = useMockBorrows()
const borrowVariants = { 'Chờ duyệt': 'warning', 'Đang mượn': 'info', 'Hoàn tất': 'success', 'Đã từ chối': 'danger', 'Đã hủy': 'neutral' }
</script>

<template>
  <section class="borrow-management" aria-labelledby="borrow-page-title">
    <header class="management-heading">
      <div><div class="management-heading__eyebrow"><span class="heading-indicator"></span> DỮ LIỆU MẪU · NGHIỆP VỤ THƯ VIỆN</div><h2 id="borrow-page-title">Quản lý mượn sách</h2><p>Theo dõi phiếu mượn và tình trạng từng cuốn sách riêng biệt.</p></div>
    </header>
    <MockDataNotice />

    <section class="management-card">
      <div class="table-toolbar">
        <label class="search-box"><img class="search-box__icon" :src="searchIcon" alt="" aria-hidden="true"><input v-model="search" type="search" placeholder="Tìm mã phiếu, mã hoặc tên độc giả" aria-label="Tìm phiếu mượn"><button v-if="search" type="button" aria-label="Xóa tìm kiếm" @click="search = ''">×</button></label>
        <label class="filter-select"><span class="sr-only">Lọc theo trạng thái phiếu</span><select v-model="statusFilter"><option value="">Tất cả trạng thái phiếu</option><option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option></select></label>
      </div>

      <div class="data-table-scroll">
        <table class="data-table borrow-table">
          <thead><tr><th>Mã phiếu</th><th>Độc giả</th><th>Ngày yêu cầu</th><th>Ngày mượn</th><th>Trạng thái phiếu</th><th class="table-actions-heading">Thao tác</th></tr></thead>
          <tbody>
            <tr v-for="borrow in pageRows" :key="borrow.maPhieu">
              <td><strong class="table-strong">{{ borrow.maPhieu }}</strong></td>
              <td><div class="table-primary-secondary"><strong>{{ borrow.tenDocGia }}</strong><small>{{ borrow.maDocGia }}</small></div></td>
              <td>{{ borrow.ngayYeuCau }}</td><td>{{ borrow.ngayMuon || '—' }}</td>
              <td><StatusBadge :value="borrow.trangThai" :variants="borrowVariants" /></td>
              <td class="table-actions"><button class="table-action" type="button" @click="openDetails(borrow)">Chi tiết / xử lý</button></td>
            </tr>
            <tr v-if="!pageRows.length"><td class="table-empty" colspan="6"><strong>Không tìm thấy phiếu mượn</strong><span>Thử từ khóa hoặc trạng thái khác.</span></td></tr>
          </tbody>
        </table>
      </div>
      <PaginationControl :page="page" :page-count="pageCount" :total="filteredBorrows.length" :page-size="pageSize" @change="page = $event" />
    </section>

    <BorrowDialog
      :open="dialogOpen"
      :mode="dialogMode"
      :borrow="selectedBorrow"
      :can-manage="canManage"
      @close="closeDialog"
      @approve="askConfirmation('approve', selectedBorrow)"
      @reject-open="openReject(selectedBorrow)"
      @reject="rejectBorrow"
      @cancel="askConfirmation('cancel', selectedBorrow)"
      @return-book="returnBook"
    />
    <ConfirmDialog :open="confirmOpen" :title="confirmation.title" :message="confirmation.message" :confirm-label="confirmation.confirmLabel" :tone="confirmation.tone" @confirm="confirmBorrowAction" @close="confirmOpen = false" />
  </section>
</template>
