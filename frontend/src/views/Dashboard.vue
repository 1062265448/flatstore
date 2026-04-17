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
      >
        <div class="stat-icon" :style="{ background: stat.gradient }">
          <span class="stat-icon-inner">{{ stat.icon }}</span>
        </div>
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
          <h3 class="chart-title">
            <span class="chart-icon">📊</span>
            库存状态分布
          </h3>
        </div>
        <div ref="inventoryChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card glass-card fade-in" :style="{ animationDelay: '0.5s' }">
        <div class="chart-header">
          <h3 class="chart-title">
            <span class="chart-icon">📈</span>
            配货单状态
          </h3>
        </div>
        <div ref="orderChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 重量统计 -->
    <div class="weight-grid">
      <div class="weight-card glass-card fade-in" :style="{ animationDelay: '0.6s' }">
        <div class="weight-header">
          <h3 class="chart-title">
            <span class="chart-icon">📦</span>
            库存统计
          </h3>
        </div>
        <div class="weight-stats">
          <div class="weight-item">
            <div class="weight-icon">⚖️</div>
            <div class="weight-info">
              <div class="weight-value">{{ Number(stats?.inventory.totalWeight || 0).toFixed(2) }}</div>
              <div class="weight-label">总重量（吨）</div>
            </div>
          </div>
          <div class="weight-divider"></div>
          <div class="weight-item">
            <div class="weight-icon">📦</div>
            <div class="weight-info">
              <div class="weight-value">{{ stats?.inventory.totalPieces || 0 }}</div>
              <div class="weight-label">总片数</div>
            </div>
          </div>
          <div class="weight-divider"></div>
          <div class="weight-item">
            <div class="weight-icon">🏭</div>
            <div class="weight-info">
              <div class="weight-value">{{ stats?.inventory.total || 0 }}</div>
              <div class="weight-label">库存批次</div>
            </div>
          </div>
        </div>
      </div>

      <div class="weight-card glass-card fade-in" :style="{ animationDelay: '0.7s' }">
        <div class="weight-header">
          <h3 class="chart-title">
            <span class="chart-icon">🚚</span>
            配货单统计
          </h3>
        </div>
        <div class="weight-stats order-stats">
          <div class="order-badge draft">
            <span class="badge-count">{{ stats?.order.draft || 0 }}</span>
            <span class="badge-label">草稿</span>
          </div>
          <div class="order-badge confirmed">
            <span class="badge-count">{{ stats?.order.confirmed || 0 }}</span>
            <span class="badge-label">已确认</span>
          </div>
          <div class="order-badge shipping">
            <span class="badge-count">{{ stats?.order.shipping || 0 }}</span>
            <span class="badge-label">发货中</span>
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
import { useStatisticsStore } from '@/stores/statistics'
import { useThemeStore } from '@/stores/theme'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

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
    icon: '📦',
    label: '库存总数',
    value: stats.value?.inventory.total || 0,
    sub: `可用 ${stats.value?.inventory.available || 0} 批次`,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    icon: '📋',
    label: '配货单',
    value: stats.value?.order.total || 0,
    sub: `进行中 ${(stats.value?.order.confirmed || 0) + (stats.value?.order.shipping || 0)} 单`,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    icon: '🚚',
    label: '已发货',
    value: stats.value?.order.shipped || 0,
    sub: '配货单完成',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    icon: '👥',
    label: '客户数',
    value: stats.value?.customer.total || 0,
    sub: '合作客户',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
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
      data: ['草稿', '已确认', '发货中', '已发货'],
      ...theme,
    },
    yAxis: { type: 'value', ...theme },
    series: [
      {
        type: 'bar',
        data: [
          { value: stats.value?.order.draft || 0, itemStyle: { color: '#8e8e93' } },
          { value: stats.value?.order.confirmed || 0, itemStyle: { color: '#0071e3' } },
          { value: stats.value?.order.shipping || 0, itemStyle: { color: '#ff9500' } },
          { value: stats.value?.order.shipped || 0, itemStyle: { color: '#34c759' } },
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
  cursor: default;

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .stat-icon-inner {
    font-size: 24px;
    animation: bounce 2s ease-in-out infinite;
    animation-delay: var(--delay, 0s);
  }

  .stat-content {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .stat-value {
    font-size: var(--font-size-3xl);
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.2;
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
      width: 200%;
      height: 200%;
      opacity: 0.1;
    }

    .stat-value {
      transform: scale(1.05);
    }

    .stat-icon-inner {
      animation: bounce 0.5s ease-in-out;
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
  padding: var(--spacing-lg);
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

.chart-header {
  margin-bottom: var(--spacing-md);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);

  .chart-icon {
    font-size: 18px;
  }
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
  padding: var(--spacing-lg);
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

.weight-icon {
  font-size: 32px;
}

.weight-value {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
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
    font-size: var(--font-size-2xl);
    font-weight: 600;
    color: var(--color-text-primary);
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
