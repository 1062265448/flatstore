<template>
  <Teleport to="body">
    <transition name="viewer-fade">
      <div v-if="visible" class="image-viewer" @click="close">
        <div class="viewer-backdrop"></div>
        <div class="viewer-content" @click.stop="close">
          <img :src="src" class="viewer-img" @click.stop />
          <button class="viewer-close" @click="close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; src: string }>()
const emit = defineEmits<{ close: [] }>()
const close = () => emit('close')
</script>

<style scoped>
.image-viewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
}
.viewer-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}
.viewer-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
}
.viewer-close {
  position: absolute;
  top: calc(var(--safe-top, env(safe-area-inset-top, 0px)) + var(--space-4));
  right: var(--space-4);
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: background var(--duration-micro) var(--ease-out);
  z-index: 1;
}
.viewer-close:active {
  background: rgba(255, 255, 255, 0.3);
}
.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}
</style>
