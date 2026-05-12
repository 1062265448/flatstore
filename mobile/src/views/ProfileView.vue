<template>
  <div class="profile-view">
    <div class="page-header">
      <div class="header-label">平面库配货</div>
      <h1 class="header-title">我的</h1>
    </div>

    <div class="profile-header">
      <div class="avatar">{{ initial }}</div>
      <div class="user-info">
        <div class="username">{{ authStore.user?.username || '未登录' }}</div>
        <div class="role">{{ authStore.user?.role || '-' }}</div>
      </div>
    </div>

    <div class="menu-list">
      <div class="menu-item" @click="router.push('/')">
        <span class="menu-label">返回首页</span>
        <span class="menu-arrow">></span>
      </div>
      <div class="menu-item" @click="router.push('/inventory')">
        <span class="menu-label">库存管理</span>
        <span class="menu-arrow">></span>
      </div>
      <div class="menu-item" @click="router.push('/orders')">
        <span class="menu-label">配货单</span>
        <span class="menu-arrow">></span>
      </div>
      <div class="menu-item" @click="router.push('/ai')">
        <span class="menu-label">AI 识别</span>
        <span class="menu-arrow">></span>
      </div>
    </div>

    <button class="logout-btn" @click="handleLogout">退出登录</button>

    <div class="app-info">
      <span>平面库配货 v1.0</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const initial = computed(() => authStore.user?.username?.charAt(0).toUpperCase() || '?')

const handleLogout = () => {
  authStore.logout()
}
</script>

<style scoped>
.profile-view {
  padding-bottom: calc(var(--tab-height) + var(--space-5));
}
.page-header {
  padding: var(--page-header-top) var(--space-5) var(--space-4);
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
}
.header-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.header-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.6px;
  color: var(--text);
  font-family: var(--font-display);
}
.profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-sm);
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}
.user-info { flex: 1; }
.username {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}
.role {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.menu-list {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-sm);
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background var(--duration-micro) var(--ease-out);
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: var(--surface-alt); }
.menu-label { font-size: 15px; font-weight: 500; color: var(--text); }
.menu-arrow {
  font-size: 16px;
  color: var(--text-tertiary);
  font-weight: 300;
}

.logout-btn {
  width: 100%;
  height: 50px;
  background: var(--red-soft);
  color: var(--red);
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
  transition: all var(--duration-micro) var(--ease-out);
  margin-bottom: var(--space-6);
  border: 1px solid transparent;
}
.logout-btn:active { transform: scale(0.98); }

.app-info {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}
</style>
