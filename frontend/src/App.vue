<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <nav class="nav" :class="{ 'nav-scrolled': isScrolled }">
      <div class="nav-left">
        <div class="nav-logo" @click="router.push('/')">
          <span class="nav-logo-text">平面库配货</span>
        </div>
      </div>

      <div class="nav-center">
        <div class="nav-links">
          <router-link
            v-for="(item, index) in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <span class="nav-link-text">{{ item.name }}</span>
            <span class="nav-link-indicator"></span>
          </router-link>
        </div>
      </div>

      <div class="nav-right">
        <button class="nav-action-btn" @click="themeStore.toggleTheme" :title="themeStore.isDark ? '切换亮色' : '切换暗色'">
          <span class="theme-icon" :class="{ rotated: themeStore.isDark }">
            <svg v-if="themeStore.isDark" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
              <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <!-- 用户菜单 -->
        <div v-if="authStore.isAuthenticated" class="user-menu">
          <el-dropdown @command="handleUserCommand" trigger="click">
            <div class="user-avatar">
              <div class="avatar-placeholder">
                {{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}
              </div>
              <span class="username">{{ authStore.user?.username }}</span>
              <el-icon><arrow-down /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><UserIcon /></el-icon>
                  <span>个人中心</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-else class="auth-buttons">
          <el-button type="text" @click="router.push('/login')">登录</el-button>
          <el-button type="primary" size="small" @click="router.push('/login?register=true')">注册</el-button>
        </div>
      </div>
    </nav>

    <!-- 面包屑导航 -->
    <div class="breadcrumb" v-if="breadcrumbs.length > 1">
      <router-link to="/" class="breadcrumb-item">首页</router-link>
      <span class="breadcrumb-separator">/</span>
      <span
        v-for="(crumb, index) in breadcrumbs"
        :key="index"
        class="breadcrumb-item"
        :class="{ active: index === breadcrumbs.length - 1 }"
      >
        {{ crumb }}
      </span>
    </div>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Toast 提示 -->
    <transition-group name="toast" tag="div" class="toast-container">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">
        <span class="toast-icon" v-if="toast.type === 'success'">✓</span>
        <span class="toast-icon" v-else-if="toast.type === 'warning'">⚠</span>
        <span class="toast-icon" v-else-if="toast.type === 'danger'">✕</span>
        {{ toast.message }}
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { ArrowDown, User as UserIcon, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const isScrolled = ref(false)

// 导航项
const navItems = [
  { path: '/', name: '首页' },
  { path: '/inventory', name: '库存' },
  { path: '/orders', name: '配货单' },
  { path: '/customers', name: '客户' },
  { path: '/ai', name: 'AI识别' },
  { path: '/warehouse', name: '仓库' },
]

// 面包屑
const breadcrumbs = computed(() => {
  const titles: Record<string, string> = {
    '/': '仪表盘',
    '/inventory': '库存管理',
    '/orders': '配货单',
    '/customers': '客户管理',
    '/ai': 'AI识别',
    '/warehouse': '3D 仓库',
    '/test': 'API测试',
  }
  const path = route.path
  if (titles[path]) {
    return [titles[path]]
  }
  return []
})

// 判断路由是否激活
const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

// 滚动监听
const handleScroll = () => {
  isScrolled.value = window.scrollY > 10
}

// Toast系统
interface Toast {
  id: number
  message: string
  type: string
}

const toasts = ref<Toast[]>([])
let toastId = 0

const showToast = (message: string, type = 'default', duration = 2500) => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

// 提供给子组件使用
provide('showToast', showToast)

// 用户菜单命令处理
const handleUserCommand = (command: string) => {
  switch (command) {
    case 'profile':
      // TODO: 跳转到个人中心页面
      showToast('个人中心功能开发中', 'info')
      break
    case 'logout':
      authStore.logout()
      showToast('已退出登录', 'success')
      break
  }
}

// 初始化主题和认证状态
onMounted(() => {
  themeStore.initTheme()
  authStore.initAuth()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped lang="scss">
.app-container {
  min-height: 100vh;
  background: var(--color-bg);
}

// ==================== 导航栏 ====================
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-2xl);
  z-index: var(--z-nav);
  background: var(--nav-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid transparent;
  transition: all var(--transition-normal);

  &.nav-scrolled {
    border-bottom-color: var(--nav-border);
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
  }
}

.nav-left {
  flex: 1;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: opacity var(--transition-fast);

  &:hover {
    opacity: 0.8;
  }

  .nav-logo-text {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text-primary);
    letter-spacing: -0.3px;
  }
}

.nav-center {
  flex: 2;
  display: flex;
  justify-content: center;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-normal);
  animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  &.active {
    background: var(--color-primary);
    color: var(--color-text-inverse);

    .nav-link-indicator {
      width: 16px;
      height: 2px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 1px;
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
    }
  }

  .nav-link-text {
    font-weight: 500;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.nav-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.nav-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-normal), color var(--transition-normal);

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .theme-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--transition-normal);

    &.rotated {
      transform: rotate(360deg);
    }
  }
}

// ==================== 面包屑 ====================
.breadcrumb {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-2xl);
  background: var(--nav-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  z-index: calc(var(--z-nav) - 1);
  font-size: var(--font-size-sm);
}

.breadcrumb-item {
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);

  &:hover {
    color: var(--color-primary);
  }

  &.active {
    color: var(--color-text-primary);
    font-weight: 500;
  }
}

.breadcrumb-separator {
  margin: 0 var(--spacing-sm);
  color: var(--color-text-tertiary);
}

// ==================== 主内容区 ====================
.main-content {
  padding-top: 60px;
  min-height: 100vh;

  .breadcrumb + & {
    padding-top: 92px;
  }
}

// ==================== Toast ====================
.toast-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  background: var(--color-text-primary);
  color: var(--color-bg-secondary);
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  white-space: nowrap;
  pointer-events: auto;
  box-shadow: var(--glass-shadow-hover);
  display: flex;
  align-items: center;
  gap: 8px;

  .toast-icon {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
  }

  &.success {
    background: var(--color-success);

    .toast-icon {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  &.warning {
    background: var(--color-warning);
  }

  &.danger {
    background: var(--color-danger);
  }
}

// Toast 动画
.toast-enter-active {
  animation: toastIn 0.3s ease forwards;
}

.toast-leave-active {
  animation: toastOut 0.3s ease forwards;
}

// ==================== 响应式 ====================
@media (max-width: 1024px) {
  .nav {
    padding: 0 var(--spacing-lg);
  }

  .nav-logo-text {
    display: none;
  }

  .nav-link-text {
    display: none;
  }

  .nav-link {
    padding: 10px 12px;
  }
}

@media (max-width: 768px) {
  .nav {
    padding: 0 var(--spacing-md);
  }

  .breadcrumb {
    padding: 0 var(--spacing-md);
  }
}

/* 用户菜单样式 */
.user-menu {
  margin-left: 12px;

  .user-avatar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 20px;
    background: var(--color-bg-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-bg-hover);
    }

    .avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .username {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-primary);
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .el-icon {
      color: var(--color-text-tertiary);
      font-size: 12px;
    }
  }

  :deep(.el-dropdown-menu) {
    margin-top: 8px;
    border-radius: var(--radius-md);
    padding: 6px;
    box-shadow: var(--glass-shadow-lg);
    border: 1px solid var(--color-border);

    .el-dropdown-menu__item {
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 8px;

      &:hover {
        background: var(--color-bg-hover);
      }

      .el-icon {
        width: 16px;
        height: 16px;
      }
    }
  }
}

.auth-buttons {
  margin-left: 12px;
  display: flex;
  align-items: center;
  gap: 12px;

  .el-button {
    font-weight: 500;
  }
}
</style>
