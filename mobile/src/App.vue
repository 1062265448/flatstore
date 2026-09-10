<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <TabBar v-if="showTabBar" />

    <!-- Toast — iOS 风格 -->
    <Teleport to="body">
      <transition-group name="toast" tag="div" class="toast-container">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
          <span class="toast-message">{{ t.message }}</span>
        </div>
      </transition-group>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import { useToast, toasts } from '@/composables/useToast'

const { show: showToast, success, warning, danger } = useToast()

// Expose toast globally for components that don't import useToast
;(window as unknown as Record<string, unknown>).__toast = { show: showToast, success, warning, danger }

const route = useRoute()

const showTabBar = computed(() => {
  if (route.path === '/login') return false
  if (route.meta.tab) return true
  return false
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg);
}

/* Toast 容器 — iOS 风格：顶部居中，大圆角，带微模糊背景 */
.toast-container {
  position: fixed;
  top: calc(var(--safe-top) + 52px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
  width: 90%;
  max-width: 400px;
}

.toast {
  background: rgba(30, 30, 30, 0.88);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: var(--text-inverse);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  pointer-events: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  text-align: center;
  letter-spacing: 0.2px;
}

.toast.success { background: rgba(52, 199, 89, 0.92); }
.toast.warning { background: rgba(255, 149, 0, 0.92); }
.toast.danger { background: rgba(255, 59, 48, 0.92); }
</style>
