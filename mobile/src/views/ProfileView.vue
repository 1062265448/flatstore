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
  padding-bottom: calc(var(--tab-height) + 20px);
  padding-top: var(--page-header-top);
}
.page-header {
  padding: 12px 20px 16px;
}
.header-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.header-title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--text);
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  margin-bottom: 24px;
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
  margin-bottom: 24px;
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: var(--bg); }
.menu-label { font-size: 15px; font-weight: 500; color: var(--text); }
.menu-arrow { font-size: 14px; color: var(--text-tertiary); }

.logout-btn {
  width: 100%;
  height: 50px;
  background: var(--red-soft);
  color: var(--red);
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.15s;
  margin-bottom: 24px;
}
.logout-btn:active { transform: scale(0.98); }

.app-info {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
