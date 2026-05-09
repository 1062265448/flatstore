<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <TabBar v-if="showTabBar" />

    <!-- Toast -->
    <Teleport to="body">
      <transition-group name="toast" tag="div" class="toast-container">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
          {{ t.message }}
        </div>
      </transition-group>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import { toasts } from '@/composables/useToast'

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
.toast-container {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  background: var(--text);
  color: white;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
.toast.success { background: var(--green); }
.toast.warning { background: var(--amber); }
.toast.danger { background: var(--red); }
</style>
