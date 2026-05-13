<template>
  <div class="page-container dashboard">
    <!-- 页面标题 -->
    <div class="page-header fade-in">
      <h1 class="page-title">数据概览</h1>
      <p class="page-subtitle">实时监控库存与配货状态</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div
        v-for="(stat, index) in statCards"
        :key="stat.label"
        class="stat-card glass-card"
        :style="{ animationDelay: `${index * 0.1}s` }"
        @click="stat.route ? router.push(stat.route) : undefined"
      >
        <div class="stat-content">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-sub">{{ stat.sub }}</div>
        </div>
        <div class="stat-glow" :style="{ background: stat.gradient }"></div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <div class="chart-card glass-card fade-in" :style="{ animationDelay: '0.4s' }">
        <div class="chart-header">
          <h3 class="chart-title">库存状态分布</h3>
        </div>
        <div ref="inventoryChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card glass-card fade-in" :style="{ animationDelay: '0.5s' }">
        <div class="chart-header">
          <h3 class="chart-title">配货单状态</h3>
        </div>
        <div ref="orderChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 重量统计 -->
    <div class="weight-grid">
      <div class="weight-card glass-card fade-in" :style="{ animationDelay: '0.6s' }">
        <div class="weight-header">
          <h3 class="chart-title">库存统计</h3>
        </div>
        <div class="weight-stats">
          <div class="weight-item">
            <div class="weight-info">
              <div class="weight-value">{{ Number(stats?.inventory.totalWeight || 0).toFixed(2) }}</div>
              <div class="weight-label">总重量（吨）</div>
            </div>
          </div>
          <div class="weight-divider"></div>
          <div class="weight-item">
            <div class="weight-info">
              <div class="weight-value">{{ stats?.inventory.totalPieces || 0 }}</div>
              <div class="weight-label">总片数</div>
            </div>
          </div>
          <div class="weight-divider"></div>
          <div class="weight-item">
            <div class="weight-info">
              <div class="weight-value">{{ stats?.inventory.total || 0 }}</div>
              <div class="weight-label">库存批次</div>
            </div>
          </div>
        </div>
      </div>

      <div class="weight-card glass-card fade-in" :style="{ animationDelay: '0.7s' }">
        <div class="weight-header">
          <h3 class="chart-title">配货单统计</h3>
        </div>
        <div class="weight-stats order-stats">
          <div class="order-badge draft">
            <span class="badge-count">{{ stats?.order.draft || 0 }}</span>
            <span class="badge-label">草稿</span>
          </div>
          <div class="order-badge shipped">
            <span class="badge-count">{{ stats?.order.shipped || 0 }}</span>
            <span class="badge-label">已发货</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStatisticsStore } from '@/stores/statistics'
import { useThemeStore } from '@/stores/theme'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const router = useRouter()
const statisticsStore = useStatisticsStore()
const themeStore = useThemeStore()

const stats = computed(() => statisticsStore.stats)
const inventoryChartRef = ref<HTMLElement>()
const orderChartRef = ref<HTMLElement>()
let inventoryChart: echarts.ECharts | null = null
let orderChart: echarts.ECharts | null = null

// 统计卡片配置
const statCards = computed(() => [
  {
    label: '库存总数',
    value: stats.value?.inventory.total || 0,
    sub: `可用 ${stats.value?.inventory.available || 0} 批次`,
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    route: '/inventory',
  },
  {
    label: '配货单',
    value: stats.value?.order.total || 0,
    sub: `进行中 ${stats.value?.order.draft || 0} 单`,
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    route: '/orders',
  },
  {
    label: '已发货',
    value: stats.value?.order.shipped || 0,
    sub: '配货单完成',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    route: '/orders',
  },
  {
    label: '客户数',
    value: stats.value?.customer.total || 0,
    sub: '合作客户',
    gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
    route: '/customers',
  },
])

const getChartTheme = () => ({
  textStyle: {
    color: themeStore.isDark ? '#86868b' : '#666',
  },
})

const initInventoryChart = () => {
  if (!inventoryChartRef.value) return

  if (!inventoryChart) {
    inventoryChart = echarts.init(inventoryChartRef.value)
  }

  const theme = getChartTheme()
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: themeStore.isDark ? '#1d1d1f' : '#fff',
      borderColor: themeStore.isDark ? '#333' : '#eee',
      textStyle: { color: themeStore.isDark ? '#f5f5f7' : '#1d1d1f' },
    },
    legend: {
      ...theme,
      bottom: '5%',
      left: 'center',
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: themeStore.isDark ? '#0d0d0d' : '#fff',
          borderWidth: 3,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: [
          { value: stats.value?.inventory.available || 0, name: '可用', itemStyle: { color: '#34c759' } },
          { value: stats.value?.inventory.reserved || 0, name: '已预留', itemStyle: { color: '#ff9500' } },
          { value: stats.value?.inventory.shipped || 0, name: '已发货', itemStyle: { color: '#8e8e93' } },
        ],
      },
    ],
  }

  inventoryChart.setOption(option)
}

const initOrderChart = () => {
  if (!orderChartRef.value) return

  if (!orderChart) {
    orderChart = echarts.init(orderChartRef.value)
  }

  const theme = getChartTheme()
  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: themeStore.isDark ? '#1d1d1f' : '#fff',
      borderColor: themeStore.isDark ? '#333' : '#eee',
      textStyle: { color: themeStore.isDark ? '#f5f5f7' : '#1d1d1f' },
    },
    legend: { ...theme, top: '5%' },
    xAxis: {
      type: 'category',
      data: ['草稿', '发货中', '已发货', '已取消'],
      ...theme,
    },
    yAxis: { type: 'value', ...theme },
    series: [
      {
        type: 'bar',
        data: [
          { value: stats.value?.order.draft || 0, itemStyle: { color: '#8e8e93' } },
          { value: stats.value?.order.shipped || 0, itemStyle: { color: '#ff9500' } },
          { value: stats.value?.order.cancelled || 0, itemStyle: { color: '#34c759' } },
        ],
        barWidth: '50%',
        itemStyle: { borderRadius: [8, 8, 0, 0] },
      },
    ],
    grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
  }

  orderChart.setOption(option)
}

const initCharts = () => {
  initInventoryChart()
  initOrderChart()
}

const resizeCharts = () => {
  inventoryChart?.resize()
  orderChart?.resize()
}

watch(
  () => themeStore.isDark,
  () => {
    initCharts()
  }
)

onMounted(async () => {
  await statisticsStore.fetchStatistics()
  initCharts()
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  inventoryChart?.dispose()
  orderChart?.dispose()
  window.removeEventListener('resize', resizeCharts)
})
</script>

<style scoped lang="scss">
.dashboard {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-2xl);
}

// ==================== 页面标题 ====================
.page-header {
  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ==================== 统计卡片 ====================
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.stat-card {
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  animation: slideUp 0.6s ease forwards;
  opacity: 0;
  position: relative;
  overflow: hidden;
  cursor: pointer;

  .stat-content {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-bottom: 6px;
    font-weight: 500;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1.15;
    letter-spacing: -0.02em;
    transition: transform 0.3s ease;
  }

  .stat-sub {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    margin-top: var(--spacing-xs);
  }

  .stat-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: all 0.5s ease;
    z-index: 0;
  }

  &:hover {
    .stat-glow {
      width: 250%;
      height: 250%;
      opacity: 0.08;
    }
  }
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

// ==================== 图表 ====================
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.chart-card {
  padding: var(--spacing-xl);
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

.chart-header {
  margin-bottom: var(--spacing-md);
}

.chart-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.chart-container {
  height: 280px;
  transition: opacity 0.3s ease;
}

// ==================== 重量统计 ====================
.weight-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.weight-card {
  padding: var(--spacing-xl);
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

.weight-header {
  margin-bottom: var(--spacing-lg);
}

.weight-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.weight-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
}

.weight-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.weight-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.weight-divider {
  width: 1px;
  height: 48px;
  background: var(--color-divider);
}

// 订单统计徽章
.order-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}

.order-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  transition: all 0.3s ease;
  cursor: default;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }

  .badge-count {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
    transition: color 0.3s ease;
  }

  .badge-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-top: var(--spacing-xs);
  }

  &.draft {
    background: rgba(142, 142, 147, 0.1);
    .badge-count { color: #8e8e93; }
    &:hover { box-shadow: 0 8px 20px rgba(142, 142, 147, 0.2); }
  }

  &.confirmed {
    background: rgba(0, 113, 227, 0.1);
    .badge-count { color: #0071e3; }
    &:hover { box-shadow: 0 8px 20px rgba(0, 113, 227, 0.2); }
  }

  &.shipping {
    background: rgba(255, 149, 0, 0.1);
    .badge-count { color: #ff9500; }
    &:hover { box-shadow: 0 8px 20px rgba(255, 149, 0, 0.2); }
  }

  &.shipped {
    background: rgba(52, 199, 89, 0.1);
    .badge-count { color: #34c759; }
    &:hover { box-shadow: 0 8px 20px rgba(52, 199, 89, 0.2); }
  }
}

// ==================== 响应式 ====================
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid,
  .weight-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .order-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
