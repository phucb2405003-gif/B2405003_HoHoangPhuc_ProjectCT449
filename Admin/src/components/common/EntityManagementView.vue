<script setup>
import { entityConfigs } from '@/data/entityConfig'
import useEntityManagement from '@/composables/useEntityManagement'
import searchIcon from '@/assets/icons/search.svg'
import plusIcon from '@/assets/icons/plus.svg'
import DataTable from './DataTable.vue'
import EntityDialog from './EntityDialog.vue'
import PaginationControl from './PaginationControl.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import StockAdjustmentDialog from './StockAdjustmentDialog.vue'
import ReaderStatusDialog from './ReaderStatusDialog.vue'
import './ManagementView.css'

const props = defineProps({ moduleKey: { type: String, required: true } })
const config = entityConfigs[props.moduleKey]
const {
  search, page, pageSize, filters, filterOptions, canManage, pageRows, filteredRows, pageCount,
  isPublisher, isBook, isReader, isRemoteEntity, loading, loadError, operationError, isSaving, isDeleting, loadPublishers, loadBooks, loadReaders,
  tableRows, stockDialogOpen, stockMode, stockBook, isStockOperation,
  dialogMode, dialogOpen, currentRecord, validationErrors, publisherOptions,
  confirmOpen, confirmTitle, confirmMessage, confirmLabel,
  actionNotice,
  openCreate, openEdit, openDetail, closeDialog, saveRecord, requestStatusChange, requestStockAdjustment, confirmStockAdjustment, closeStockDialog, requestDelete, confirmStatusChange, closeConfirmation,
  statusDialogOpen, pendingStatusChange, isStatusOperation, saveReaderStatus, closeReaderStatus, credentials, closeCredentials,
} = useEntityManagement(config)
</script>

<template>
  <section class="management-page" :aria-labelledby="'management-title-' + moduleKey">
    <header class="management-heading">
      <div>
        <div class="management-heading__eyebrow"><span class="heading-indicator"></span> QUẢN LÝ DỮ LIỆU · {{ config.title.toLocaleUpperCase('vi') }}</div>
        <h2 :id="'management-title-' + moduleKey">{{ config.title }}</h2>
        <p>{{ config.description }}</p>
      </div>
      <button v-if="canManage && !config.hideCreate" class="button button--primary" type="button" @click="openCreate">
        <img class="button-plus-icon" :src="plusIcon" alt="" aria-hidden="true"> Thêm {{ config.singular }}
      </button>
    </header>

    <p v-if="operationError" class="management-feedback management-feedback--error" role="alert">{{ operationError }}</p>
    <p v-if="actionNotice" class="management-feedback" role="status">{{ actionNotice }}</p>

    <section class="management-card">
      <div v-if="isRemoteEntity && loading" class="management-state" role="status" aria-live="polite">{{ isBook ? 'Đang tải sách và nhà xuất bản…' : isReader ? 'Đang tải danh sách độc giả…' : 'Đang tải danh sách nhà xuất bản…' }}</div>
      <div v-else-if="isRemoteEntity && loadError" class="management-state management-state--error" role="alert">
        <span>{{ loadError }}</span>
        <button class="button button--secondary" type="button" @click="isBook ? loadBooks() : isReader ? loadReaders() : loadPublishers()">Thử tải lại</button>
      </div>
      <template v-else>
      <div class="table-toolbar">
        <label class="search-box">
          <img class="search-box__icon" :src="searchIcon" alt="" aria-hidden="true">
          <input v-model="search" type="search" :placeholder="config.searchPlaceholder" :aria-label="config.searchPlaceholder">
          <button v-if="search" type="button" aria-label="Xóa tìm kiếm" @click="search = ''">×</button>
        </label>
        <div v-if="config.filters?.length" class="table-filters">
          <label v-for="filter in config.filters" :key="filter.key" class="filter-select">
            <span class="sr-only">{{ filter.label }}</span>
            <select v-model="filters[filter.key]">
              <option value="">{{ filter.allLabel }}</option>
              <option v-for="option in filterOptions[filter.key]" :key="String(option.value)" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
        </div>
      </div>

      <DataTable :config="config" :rows="tableRows" :can-manage="canManage" @detail="openDetail" @edit="openEdit" @toggle-status="requestStatusChange" @delete="requestDelete" @add-stock="requestStockAdjustment($event, 'add')" @destroy-stock="requestStockAdjustment($event, 'destroy')" />
      <PaginationControl :page="page" :page-count="pageCount" :total="filteredRows.length" :page-size="pageSize" @change="page = $event" />
      </template>
    </section>

    <EntityDialog
      :open="dialogOpen"
      :mode="dialogMode"
      :config="config"
      :record="currentRecord"
      :errors="validationErrors"
      :publishers="publisherOptions"
      :busy="isRemoteEntity && isSaving"
      :error="isRemoteEntity ? operationError : ''"
      @close="closeDialog"
      @save="saveRecord"
    />
    <ConfirmDialog
      :open="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="confirmLabel"
      tone="danger"
      :busy="isRemoteEntity && isDeleting"
      :error="isRemoteEntity ? operationError : ''"
      @confirm="confirmStatusChange"
      @close="closeConfirmation"
    />
    <StockAdjustmentDialog
      :open="stockDialogOpen"
      :mode="stockMode"
      :book="stockBook"
      :busy="isStockOperation"
      :error="operationError"
      @adjust="confirmStockAdjustment"
      @close="closeStockDialog"
    />
    <ReaderStatusDialog :open="statusDialogOpen" :reader="pendingStatusChange" :options="config.statusOptions || []" :busy="isStatusOperation" :error="operationError" @save="saveReaderStatus" @close="closeReaderStatus" />
    <ConfirmDialog v-if="credentials" :open="true" title="Đã tạo tài khoản độc giả" :message="`Mã độc giả: ${credentials.maDocGia} · Tên đăng nhập: ${credentials.tenDangNhap} · Mật khẩu ban đầu: ${credentials.initialPassword}`" confirm-label="Đã ghi nhận" @confirm="closeCredentials" @close="closeCredentials" />
  </section>
</template>
