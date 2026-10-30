<script setup>
import { authState } from '@/services/authService'
</script>

<template>
  <div v-if="authState.isChecking" class="auth-loading" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    <span>Đang xác minh phiên nhân viên…</span>
  </div>
  <RouterView v-else />
</template>
