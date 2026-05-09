<template>
  <nav class="tab-bar">
    <div
      v-for="tab in tabs"
      :key="tab.name"
      class="tab"
      :class="{ active: currentTab === tab.name }"
      @click="switchTab(tab.name)"
    >
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
  height: var(--tab-height);
  padding-bottom: var(--safe-bottom);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: flex-start;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  z-index: 50;
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
}
.tab.active {
  color: var(--text);
}
.tab-label {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.3px;
  position: relative;
}
.tab.active .tab-label::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 3px;
  background: var(--text);
  border-radius: 2px;
}
</style>
