<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon><Box /></el-icon>
        <span>平面库配货</span>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        class="sidebar-menu"
        :class="{ 'dark-menu': themeStore.isDark }"
      >
        <el-menu-item index="/">
          <el-icon><Odometer /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/inventory">
          <el-icon><Box /></el-icon>
          <span>库存管理</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><List /></el-icon>
          <span>配货单</span>
        </el-menu-item>
        <el-menu-item index="/customers">
          <el-icon><User /></el-icon>
          <span>客户管理</span>
        </el-menu-item>
        <el-menu-item index="/ai">
          <el-icon><Monitor /></el-icon>
          <span>AI 识别</span>
        </el-menu-item>
        <el-menu-item index="/test">
          <el-icon><Tools /></el-icon>
          <span>API 测试</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h2>{{ $route.meta.title }}</h2>
        </div>
        <div class="header-right">
          <el-button
            :icon="themeStore.isDark ? 'Sunny' : 'Moon'"
            circle
            @click="themeStore.toggleTheme"
          />
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import {
  Box,
  Odometer,
  List,
  User,
  Monitor,
  Tools,
} from '@element-plus/icons-vue'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
}

.sidebar {
  background: #001529;
  color: #fff;
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 18px;
    font-weight: bold;
    color: #fff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .sidebar-menu {
    border-right: none;
    background: transparent;
    :deep(.el-menu-item) {
      color: rgba(255, 255, 255, 0.7);
      &.is-active {
        background: #1890ff;
        color: #fff;
      }
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #e8e8e8;
  .header-left h2 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
}

.main-content {
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}
</style>

<style>
html.dark {
  .sidebar {
    background: #141414;
  }
  .header {
    background: #1f1f1f;
    border-bottom-color: #333;
    .header-left h2 {
      color: #fff;
    }
  }
  .main-content {
    background: #0d0d0d;
  }
}
</style>
