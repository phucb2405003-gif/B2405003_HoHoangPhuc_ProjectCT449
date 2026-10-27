import { computed, nextTick, onMounted, onUnmounted, ref, unref, watch } from 'vue'

export default function useFeaturedBooks(featuredBooks) {
  const bookList = computed(() => unref(featuredBooks))
  const bookCount = computed(() => bookList.value.length)
  const viewport = ref(null)
  const track = ref(null)
  const position = ref(bookCount.value)
  const trackOffset = ref(0)
  const stepSize = ref(0)
  const transitionEnabled = ref(false)
  const isDragging = ref(false)
  const isAnimating = ref(false)
  const suppressClick = ref(false)
  const trackStyle = computed(() => ({
    transform: `translate3d(${trackOffset.value}px, 0, 0)`,
    transition: transitionEnabled.value ? 'transform 480ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
  }))
  const displayBooks = computed(() => [
    ...bookList.value.map((book) => ({ ...book, renderKey: `before-${book.id}` })),
    ...bookList.value.map((book) => ({ ...book, renderKey: `source-${book.id}` })),
    ...bookList.value.map((book) => ({ ...book, renderKey: `after-${book.id}` })),
  ])

  const autoplayDelay = 10_000
  let autoplayTimer = null
  let wheelTimer = null
  let wheelDelta = 0
  let resizeObserver
  let transitionFrame = 0
  let dragStartX = 0
  let dragStartOffset = 0
  let dragStartPosition = 0
  let suppressClickTimer = null
  let didDrag = false

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const resetAutoplayTimer = () => {
    if (autoplayTimer !== null) clearTimeout(autoplayTimer)

    autoplayTimer = setTimeout(() => {
      autoplayTimer = null
      if (isDragging.value) {
        resetAutoplayTimer()
        return
      }
      moveOneBook(1, false)
      resetAutoplayTimer()
    }, autoplayDelay)
  }

  const getCurrentTrackOffset = () => {
    const transform = getComputedStyle(track.value).transform
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41
  }

  const normalizeClonedPosition = () => {
    let normalizedPosition = position.value

    if (!bookCount.value) return
    while (normalizedPosition < bookCount.value) normalizedPosition += bookCount.value
    while (normalizedPosition >= bookCount.value * 2) normalizedPosition -= bookCount.value
    if (normalizedPosition === position.value) return

    transitionEnabled.value = false
    isAnimating.value = false
    position.value = normalizedPosition
    trackOffset.value = -normalizedPosition * stepSize.value
    if (transitionFrame) cancelAnimationFrame(transitionFrame)
    transitionFrame = requestAnimationFrame(() => {
      transitionEnabled.value = true
      transitionFrame = 0
    })
  }

  const moveOneBook = (direction, userInitiated = true) => {
    if (userInitiated) resetAutoplayTimer()
    if (stepSize.value <= 0 || !bookCount.value || isDragging.value || isAnimating.value) return

    if (Math.abs(direction) >= bookCount.value) {
      const logicalPosition = position.value - bookCount.value
      position.value = bookCount.value + ((logicalPosition + direction) % bookCount.value + bookCount.value) % bookCount.value
    } else {
      position.value += direction
    }
    trackOffset.value = -position.value * stepSize.value

    if (prefersReducedMotion()) {
      transitionEnabled.value = false
      normalizeClonedPosition()
    } else {
      transitionEnabled.value = true
      isAnimating.value = true
    }
  }

  const updateStepSize = () => {
    if (!viewport.value || !track.value) return
    const firstCard = track.value.querySelector('.book-card')
    if (!firstCard) return

    const gap = Number.parseFloat(getComputedStyle(track.value).columnGap) || 0
    const nextStepSize = firstCard.getBoundingClientRect().width + gap
    if (nextStepSize <= 0) return

    const count = bookCount.value
    if (!count) return
    const logicalBook = ((position.value - count) % count + count) % count
    stepSize.value = nextStepSize
    position.value = count + logicalBook
    transitionEnabled.value = false
    isAnimating.value = false
    trackOffset.value = -position.value * stepSize.value
    if (transitionFrame) cancelAnimationFrame(transitionFrame)
    transitionFrame = requestAnimationFrame(() => {
      transitionEnabled.value = true
      transitionFrame = 0
    })
  }

  const handleTransitionEnd = (event) => {
    if (event.target !== track.value || event.propertyName !== 'transform') return
    isAnimating.value = false
    normalizeClonedPosition()
  }

  const startDrag = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    resetAutoplayTimer()
    if (!stepSize.value) return

    isDragging.value = true
    isAnimating.value = false
    didDrag = false
    transitionEnabled.value = false
    trackOffset.value = getCurrentTrackOffset()
    position.value = Math.round(-trackOffset.value / stepSize.value)
    dragStartPosition = position.value
    dragStartOffset = trackOffset.value
    dragStartX = event.clientX
  }

  const moveDrag = (event) => {
    if (!isDragging.value) return
    const delta = event.clientX - dragStartX
    if (!didDrag && Math.abs(delta) < 8) return
    if (!didDrag) {
      didDrag = true
      if (viewport.value?.setPointerCapture) viewport.value.setPointerCapture(event.pointerId)
    }
    if (Math.abs(delta) > 1) resetAutoplayTimer()
    trackOffset.value = dragStartOffset + delta
  }

  const finishDrag = (event) => {
    if (!isDragging.value) return
    const delta = event.clientX - dragStartX
    if (didDrag) {
      suppressClick.value = true
      if (suppressClickTimer !== null) clearTimeout(suppressClickTimer)
      suppressClickTimer = setTimeout(() => {
        suppressClick.value = false
        suppressClickTimer = null
      }, 350)
    }
    const threshold = Math.max(24, stepSize.value * 0.16)
    let targetPosition = Math.round(-trackOffset.value / stepSize.value)

    if (delta < -threshold) targetPosition = dragStartPosition + 1
    else if (delta > threshold) targetPosition = dragStartPosition - 1

    isDragging.value = false
    if (!didDrag) {
      transitionEnabled.value = true
      resetAutoplayTimer()
      return
    }
    didDrag = false
    resetAutoplayTimer()
    position.value = targetPosition
    trackOffset.value = -targetPosition * stepSize.value
    if (prefersReducedMotion()) {
      transitionEnabled.value = false
      normalizeClonedPosition()
    } else {
      transitionEnabled.value = true
      isAnimating.value = true
    }
  }

  const handleClick = (event) => {
    if (!suppressClick.value) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick.value = false
    if (suppressClickTimer !== null) clearTimeout(suppressClickTimer)
    suppressClickTimer = null
  }

  const handleWheel = (event) => {
    const delta = event.shiftKey ? event.deltaY : event.deltaX
    if (Math.abs(delta) < 1 || (!event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY))) return

    resetAutoplayTimer()
    wheelDelta += delta
    if (wheelTimer !== null) clearTimeout(wheelTimer)
    wheelTimer = setTimeout(() => {
      const direction = Math.sign(wheelDelta)
      wheelDelta = 0
      wheelTimer = null
      if (direction) moveOneBook(direction)
    }, 120)
  }

  const handleKeydown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      moveOneBook(event.key === 'ArrowRight' ? 1 : -1)
    }
  }

  onMounted(() => {
    updateStepSize()
    if (viewport.value && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(updateStepSize)
      resizeObserver.observe(viewport.value)
    }
    resetAutoplayTimer()
  })

  watch(() => bookCount.value, async (count) => {
    if (!count) return
    await nextTick()
    updateStepSize()
  }, { flush: 'post' })

  onUnmounted(() => {
    if (autoplayTimer !== null) clearTimeout(autoplayTimer)
    if (wheelTimer !== null) clearTimeout(wheelTimer)
    if (suppressClickTimer !== null) clearTimeout(suppressClickTimer)
    if (transitionFrame) cancelAnimationFrame(transitionFrame)
    resizeObserver?.disconnect()
  })

  return {
    displayBooks,
    finishDrag,
    handleKeydown,
    handleClick,
    handleTransitionEnd,
    handleWheel,
    isDragging,
    moveDrag,
    moveOneBook,
    startDrag,
    track,
    trackStyle,
    viewport,
  }
}
