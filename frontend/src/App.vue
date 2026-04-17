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

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()

const isScrolled = ref(false)

// 导航项
const navItems = [
  { path: '/', name: '首页' },
  { path: '/inventory', name: '库存' },
  { path: '/orders', name: '配货单' },
  { path: '/customers', name: '客户' },
  { path: '/ai', name: 'AI识别' },
  { path: '/demos', name: '3D展厅' },
]

// 面包屑
const breadcrumbs = computed(() => {
  const titles: Record<string, string> = {
    '/': '仪表盘',
    '/inventory': '库存管理',
    '/orders': '配货单',
    '/customers': '客户管理',
    '/ai': 'AI识别',
    '/demos': '3D展厅',
    '/test': 'API测试',
    '/demo-industrial': '工业风格',
    '/demo-modern': '现代风格',
    '/demo-cyberpunk': '赛博朋克',
    '/demo-rts': 'RTS风格',
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

// 初始化主题
onMounted(() => {
  themeStore.initTheme()
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
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-normal);
  animation: slideDown 0.4s ease backwards;

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  &.active {
    background: var(--color-primary);
    color: var(--color-text-inverse);

    .nav-link-indicator {
      width: 20px;
      height: 3px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 2px;
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
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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
  transition: all var(--transition-normal);

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
    transform: scale(1.1);
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
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-2xl);
  background: var(--glass-bg);
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
  padding: 12px 20px;
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
</style>
