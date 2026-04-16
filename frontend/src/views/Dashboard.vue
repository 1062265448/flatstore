<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon inventory">
            <el-icon><Box /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">库存总数</div>
            <div class="stat-value">{{ stats?.inventory.total || 0 }}</div>
            <div class="stat-sub">可用: {{ stats?.inventory.available || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon order">
            <el-icon><List /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">配货单</div>
            <div class="stat-value">{{ stats?.order.total || 0 }}</div>
            <div class="stat-sub">进行中: {{ (stats?.order.confirmed || 0) + (stats?.order.shipping || 0) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon shipping">
            <el-icon><Van /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">已发货</div>
            <div class="stat-value">{{ stats?.order.shipped || 0 }}</div>
            <div class="stat-sub">发运完成</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon customer">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">客户数</div>
            <div class="stat-value">{{ stats?.customer.total || 0 }}</div>
            <div class="stat-sub">合作客户</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表 -->
    <el-row :gutter="20" class="charts">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>库存状态分布</span>
            </div>
          </template>
          <div ref="inventoryChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>配货单状态分布</span>
            </div>
          </template>
          <div ref="orderChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 重量统计 -->
    <el-row :gutter="20" class="weight-stats">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>库存重量统计</span>
            </div>
          </template>
          <div class="weight-info">
            <el-statistic title="总重量" :value="parseFloat(stats?.inventory.totalWeight || '0')" suffix="吨" />
            <el-divider direction="vertical" />
            <el-statistic title="总片数" :value="stats?.inventory.totalPieces || 0" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>配货单统计</span>
            </div>
          </template>
          <div class="weight-info">
            <el-statistic title="草稿" :value="stats?.order.draft || 0" />
            <el-divider direction="vertical" />
            <el-statistic title="已确认" :value="stats?.order.confirmed || 0" />
            <el-divider direction="vertical" />
            <el-statistic title="发货中" :value="stats?.order.shipping || 0" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import { useThemeStore } from '@/stores/theme'
import * as echarts from 'echarts'
import { Box, List, Van, User } from '@element-plus/icons-vue'
import type { EChartsOption } from 'echarts'

const statisticsStore = useStatisticsStore()
const themeStore = useThemeStore()

// ✅ 使用 computed 保持响应性
const stats = computed(() => statisticsStore.stats)
const inventoryChartRef = ref<HTMLElement>()
const orderChartRef = ref<HTMLElement>()
let inventoryChart: echarts.ECharts | null = null
let orderChart: echarts.ECharts | null = null

const getChartTheme = () => ({
  textStyle: {
    color: themeStore.isDark ? '#fff' : '#666',
  },
})

const initInventoryChart = () => {
  if (!inventoryChartRef.value) return

  if (!inventoryChart) {
    inventoryChart = echarts.init(inventoryChartRef.value)
  }

  const theme = getChartTheme()
  const option: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: {
      ...theme,
      bottom: '5%',
      left: 'center',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: themeStore.isDark ? '#0d0d0d' : '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: [
          { value: stats.value?.inventory.available || 0, name: '可用', itemStyle: { color: '#67C23A' } },
          { value: stats.value?.inventory.reserved || 0, name: '已预留', itemStyle: { color: '#E6A23C' } },
          { value: stats.value?.inventory.shipped || 0, name: '已发货', itemStyle: { color: '#909399' } },
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
    tooltip: { trigger: 'axis' },
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
          { value: stats.value?.order.draft || 0, itemStyle: { color: '#909399' } },
          { value: stats.value?.order.confirmed || 0, itemStyle: { color: '#409EFF' } },
          { value: stats.value?.order.shipping || 0, itemStyle: { color: '#E6A23C' } },
          { value: stats.value?.order.shipped || 0, itemStyle: { color: '#67C23A' } },
        ],
        barWidth: '50%',
        itemStyle: { borderRadius: [4, 4, 0, 0] },
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

// stats 是 computed，自动响应，无需手动 watch

onMounted(async () => {
  await statisticsStore.fetchStatistics()
  initCharts()
  window.addEventListener('resize', resizeCharts)
})

// ✅ 添加 ECharts 内存泄漏清理
onUnmounted(() => {
  inventoryChart?.dispose()
  orderChart?.dispose()
  window.removeEventListener('resize', resizeCharts)
})
</script>

<style scoped lang="scss">
.dashboard {
  .stat-cards {
    margin-bottom: 20px;
  }
  .stat-card {
    .el-card__body {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }
    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: #fff;
      &.inventory { background: linear-gradient(135deg, #409EFF, #66b1ff); }
      &.order { background: linear-gradient(135deg, #67C23A, #85ce61); }
      &.shipping { background: linear-gradient(135deg, #E6A23C, #ebb563); }
      &.customer { background: linear-gradient(135deg, #909399, #a6a9ad); }
    }
    .stat-content {
      flex: 1;
      .stat-label {
        font-size: 14px;
        color: #999;
        margin-bottom: 8px;
      }
      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #333;
      }
      .stat-sub {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }
    }
  }
  .charts {
    margin-bottom: 20px;
    .chart-container {
      height: 300px;
    }
  }
  .weight-stats {
    .weight-info {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px 0;
    }
  }
}

html.dark {
  .stat-card {
    .stat-content {
      .stat-value { color: #fff; }
    }
  }
}
</style>
