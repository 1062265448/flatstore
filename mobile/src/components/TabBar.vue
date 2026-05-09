<template>
  <nav class="tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.name"
      class="tab"
      :class="{ active: currentTab === tab.name }"
      @click="switchTab(tab.name)"
    >
      <svg class="tab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="tab.name === 'home'">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </template>
        <template v-else-if="tab.name === 'inventory'">
          <rect x="2" y="3" width="20" height="18" rx="2"/>
          <line x1="2" y1="9" x2="22" y2="9"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </template>
        <template v-else-if="tab.name === 'orders'">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </template>
        <template v-else-if="tab.name === 'profile'">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </template>
      </svg>
      <span class="tab-label">{{ tab.label }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const tabs = [
  { name: 'home', label: '首页', path: '/' },
  { name: 'inventory', label: '库存', path: '/inventory' },
  { name: 'orders', label: '配货', path: '/orders' },
  { name: 'profile', label: '我的', path: '/profile' },
]

const router = useRouter()
const route = useRoute()

const currentTab = computed(() => {
  const meta = route.meta.tab as string | undefined
  if (meta) return meta
  if (route.path === '/') return 'home'
  return ''
})

const switchTab = (name: string) => {
  const tab = tabs.find(t => t.name === name)
  if (tab) router.push(tab.path)
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: flex-start;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  z-index: 50;
}
@media (prefers-color-scheme: dark) {
  .tab-bar {
    background: rgba(0, 0, 0, 0.88);
  }
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s;
  -webkit-user-select: none;
  user-select: none;
  min-height: 44px;
}
.tab.active {
  color: var(--accent);
}
.tab-icon {
  width: 22px;
  height: 22px;
}
.tab-label {
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.3px;
}
</style>
