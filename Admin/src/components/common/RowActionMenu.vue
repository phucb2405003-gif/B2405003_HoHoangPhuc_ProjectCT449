<script setup>
import { nextTick, onBeforeUnmount, ref } from 'vue'
import chevronDownIcon from '@/assets/icons/chevron-down.svg'
import './RowActionMenu.css'

const props = defineProps({
  actions: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  triggerLabel: { type: String, default: 'Thao tác' },
})
const emit = defineEmits(['select'])

const trigger = ref(null)
const menu = ref(null)
const isOpen = ref(false)
const menuStyle = ref({})
let listenersAttached = false

function addGlobalListeners() {
  if (listenersAttached) return
  document.addEventListener('pointerdown', handleOutsidePointer)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('resize', handleViewportChange)
  listenersAttached = true
}

function removeGlobalListeners() {
  if (!listenersAttached) return
  document.removeEventListener('pointerdown', handleOutsidePointer)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('resize', handleViewportChange)
  listenersAttached = false
}

function closeMenu() {
  isOpen.value = false
  removeGlobalListeners()
}

async function positionMenu() {
  await nextTick()
  if (!trigger.value || !menu.value) return

  const rect = trigger.value.getBoundingClientRect()
  const menuRect = menu.value.getBoundingClientRect()
  const width = menuRect.width
  const height = menuRect.height
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
  const top = rect.bottom + height + 8 <= window.innerHeight
    ? rect.bottom + 4
    : Math.max(8, rect.top - height - 4)
  menuStyle.value = { left: `${left}px`, top: `${top}px` }
  menu.value.querySelector('button')?.focus()
}

async function toggleMenu() {
  if (isOpen.value) {
    closeMenu()
    return
  }
  isOpen.value = true
  addGlobalListeners()
  await positionMenu()
}

function selectAction(action) {
  closeMenu()
  emit('select', action)
}

function handleOutsidePointer(event) {
  if (trigger.value?.contains(event.target) || menu.value?.contains(event.target)) return
  closeMenu()
}

function handleEscape(event) {
  if (!isOpen.value || event.key !== 'Escape') return
  event.stopPropagation()
  closeMenu()
  trigger.value?.focus()
}

function handleViewportChange() {
  if (isOpen.value) closeMenu()
}

onBeforeUnmount(removeGlobalListeners)
</script>

<template>
  <button
    ref="trigger"
    class="row-action-menu__trigger"
    type="button"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :disabled="props.disabled"
    @click="toggleMenu"
  >{{ props.triggerLabel }}<span v-if="!props.disabled" class="row-action-menu__caret" aria-hidden="true"><img :src="chevronDownIcon" alt=""></span></button>
  <Teleport to="body">
    <div v-if="isOpen" ref="menu" class="row-action-menu__panel" role="menu" :style="menuStyle" aria-label="Thao tác cho dòng">
      <button
        v-for="action in props.actions"
        :key="action.event"
        class="row-action-menu__item"
        :class="{ 'row-action-menu__item--danger': action.tone === 'danger', 'row-action-menu__item--positive': action.tone === 'positive' }"
        type="button"
        role="menuitem"
        :aria-label="action.ariaLabel"
        @click="selectAction(action)"
      >
        {{ action.label }}
      </button>
    </div>
  </Teleport>
</template>
