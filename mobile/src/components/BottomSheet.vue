<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="sheet-overlay" @click.self="close"></div>
    </transition>
    <transition name="slide-up">
      <div
        v-if="visible"
        ref="sheetRef"
        class="sheet"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="sheet-bar" @click="close">
          <div class="sheet-bar-indicator"></div>
        </div>
        <slot></slot>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ visible: boolean; dismissible?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const sheetRef = ref<HTMLElement>()
const startY = ref(0)
const deltaY = ref(0)

const close = () => emit('close')

const onTouchStart = (e: TouchEvent) => {
  if (props.dismissible === false) return
  startY.value = e.touches[0].clientY
  deltaY.value = 0
}

const onTouchMove = (e: TouchEvent) => {
  if (props.dismissible === false) return
  deltaY.value = e.touches[0].clientY - startY.value
  if (deltaY.value > 0 && sheetRef.value) {
    sheetRef.value.style.transform = `translateY(${deltaY.value}px)`
  }
}

const onTouchEnd = () => {
  if (props.dismissible === false) return
  if (sheetRef.value) {
    sheetRef.value.style.transform = ''
  }
  if (deltaY.value > 80) {
    close()
  }
}

// Body scroll lock
watch(() => props.visible, (v) => {
  if (v) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 90;
}
.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--space-2) var(--space-6) calc(var(--space-12, 48px) + var(--safe-bottom));
  z-index: 100;
  max-height: 85vh;
  overflow-y: auto;
  transition: transform 0.15s ease-out;
}
.sheet-bar {
  display: flex;
  justify-content: center;
  padding: var(--space-2) 0 var(--space-4);
  cursor: pointer;
}
.sheet-bar-indicator {
  width: 40px;
  height: 5px;
  background: var(--border-strong);
  border-radius: var(--radius-full);
  transition: background var(--duration-micro) var(--ease-out);
}
.sheet-bar:active .sheet-bar-indicator {
  background: var(--border-hover);
}
</style>
