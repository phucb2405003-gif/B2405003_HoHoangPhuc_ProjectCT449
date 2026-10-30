<script setup>
import { entityConfigs } from '@/data/entityConfig'
import useMockEntity from '@/composables/useMockEntity'
import searchIcon from '@/assets/icons/search.svg'
import DataTable from './DataTable.vue'
import EntityDialog from './EntityDialog.vue'
import MockDataNotice from './MockDataNotice.vue'
import PaginationControl from './PaginationControl.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import './ManagementView.css'

const props = defineProps({ moduleKey: { type: String, required: true } })
const config = entityConfigs[props.moduleKey]
const {
  search, page, pageSize, filters, filterOptions, canManage, pageRows, filteredRows, pageCount,
  dialogMode, dialogOpen, currentRecord, validationErrors, publisherOptions,
  confirmOpen, confirmTitle, confirmMessage, confirmLabel,
  openCreate, openEdit, openDetail, closeDialog, saveRecord, requestStatusChange, confirmStatusChange,
} = useMockEntity(config)
</script>

<template>
  <section class="management-page" :aria-labelledby="'management-title-' + moduleKey">
    <header class="management-heading">
      <div>
        <div class="management-heading__eyebrow"><span class="heading-indicator"></span> DỮ LIỆU MẪU · {{ config.title.toLocaleUpperCase('vi') }}</div>
        <h2 :id="'management-title-' + moduleKey">{{ config.title }}</h2>
        <p>{{ config.description }}</p>
      </div>
      <button v-if="canManage && !config.hideCreate" class="button button--primary" type="button" @click="openCreate">
        <span class="button-plus" aria-hidden="true">+</span> Thêm {{ config.singular }}
      </button>
    </header>

    <MockDataNotice />

    <section class="management-card">
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

      <DataTable :config="config" :rows="pageRows" :can-manage="canManage" @detail="openDetail" @edit="openEdit" @toggle-status="requestStatusChange" />
      <PaginationControl :page="page" :page-count="pageCount" :total="filteredRows.length" :page-size="pageSize" @change="page = $event" />
    </section>

    <EntityDialog
      :open="dialogOpen"
      :mode="dialogMode"
      :config="config"
      :record="currentRecord"
      :errors="validationErrors"
      :publishers="publisherOptions"
      @close="closeDialog"
      @save="saveRecord"
    />
    <ConfirmDialog
      :open="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="confirmLabel"
      tone="danger"
      @confirm="confirmStatusChange"
      @close="confirmOpen = false"
    />
  </section>
</template>
