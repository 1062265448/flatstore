<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="sheet-overlay" @click.self="close"></div>
    </transition>
    <transition name="slide-up">
      <div v-if="visible" class="sheet">
        <div class="sheet-bar" @click="close"></div>
        <slot></slot>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()
const close = () => emit('close')
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 90;
}
.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: 24px 24px 0 0;
  padding: 12px 24px calc(48px + var(--safe-bottom));
  z-index: 100;
  max-height: 80vh;
  overflow-y: auto;
}
.sheet-bar {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 24px;
  cursor: pointer;
}
</style>
