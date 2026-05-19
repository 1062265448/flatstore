<template>
  <div class="home-view">
    <div class="page-header">
      <div class="header-label">平面库配货</div>
      <h1 class="header-title">{{ greeting }}</h1>
      <p class="header-date">{{ todayStr }}</p>
    </div>

    <div class="stats">
      <StatCard :value="stats?.inventory.total || 0" label="总批次" />
      <StatCard :value="stats?.inventory.available || 0" label="可用" value-color="var(--green)" />
      <StatCard :value="stats?.inventory.reserved || 0" label="预留" value-color="var(--amber)" />
      <StatCard :value="stats?.inventory.issued || 0" label="已发出" value-color="var(--blue)" />
    </div>

    <!-- 库存状态分布条 -->
    <div class="section-label">库存状态分布</div>
    <div class="status-bar-section">
      <div class="status-bar">
        <div class="bar-segment available" :style="{ width: availablePct + '%' }"></div>
        <div class="bar-segment reserved" :style="{ width: reservedPct + '%' }"></div>
        <div class="bar-segment shipped" :style="{ width: shippedPct + '%' }"></div>
        <div class="bar-segment issued" :style="{ width: issuedPct + '%' }"></div>
      </div>
      <div class="status-legend">
        <div class="legend-item"><span class="legend-dot available"></span>可用 {{ stats?.inventory.available || 0 }}</div>
        <div class="legend-item"><span class="legend-dot reserved"></span>预留 {{ stats?.inventory.reserved || 0 }}</div>
        <div class="legend-item"><span class="legend-dot shipped"></span>已发货 {{ stats?.inventory.shipped || 0 }}</div>
        <div class="legend-item"><span class="legend-dot issued"></span>已发出 {{ stats?.inventory.issued || 0 }}</div>
      </div>
    </div>

    <!-- 最近配货单 -->
    <div class="section-label">最近配货单</div>
    <div class="recent-orders">
      <template v-if="recentOrders.length">
        <OrderCard
          v-for="order in recentOrders"
          :key="order.id"
          :order="order"
          @click="router.push(`/orders/${order.id}`)"
        />
      </template>
      <div v-else class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.4">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <div class="empty-text">暂无配货单</div>
        <div class="empty-hint">前往配货页面创建订单</div>
      </div>
    </div>

    <!-- AI FAB -->
    <button class="ai-fab" @click="router.push('/ai')">AI</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStatisticsStore } from '@/stores/statistics'
import { useOrderStore } from '@/stores/order'
import StatCard from '@/components/StatCard.vue'
import OrderCard from '@/components/OrderCard.vue'

const router = useRouter()
const statisticsStore = useStatisticsStore()
const orderStore = useOrderStore()

const stats = computed(() => statisticsStore.stats)
const recentOrders = computed(() => orderStore.orderList.slice(0, 3))

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const todayStr = computed(() => {
  const d = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${weekdays[d.getDay()]}`
})

const total = computed(() => stats.value?.inventory.total || 0)
const availablePct = computed(() => total.value ? ((stats.value?.inventory.available || 0) / total.value * 100) : 0)
const reservedPct = computed(() => total.value ? ((stats.value?.inventory.reserved || 0) / total.value * 100) : 0)
const shippedPct = computed(() => total.value ? ((stats.value?.inventory.shipped || 0) / total.value * 100) : 0)
const issuedPct = computed(() => total.value ? ((stats.value?.inventory.issued || 0) / total.value * 100) : 0)

onMounted(async () => {
  await Promise.all([
    statisticsStore.fetchStatistics(),
    orderStore.fetchOrders({ limit: 5 }),
  ])
})
</script>

<style scoped>
.home-view {
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
.header-date {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 2px;
  font-weight: 400;
}

.stats {
  display: flex;
  gap: var(--space-2);
  padding: 0 var(--space-5) var(--space-4);
}

.status-bar-section {
  padding: 0 var(--space-5) var(--space-5);
}
.status-bar {
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--surface-alt);
  display: flex;
  overflow: hidden;
}
.bar-segment {
  height: 100%;
  transition: width 0.5s var(--ease-out);
}
.bar-segment.available { background: var(--green); }
.bar-segment.reserved { background: var(--amber); }
.bar-segment.shipped { background: var(--text-tertiary); }
.bar-segment.issued { background: var(--blue); }

.status-legend {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-3);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-dot.available { background: var(--green); }
.legend-dot.reserved { background: var(--amber); }
.legend-dot.shipped { background: var(--text-tertiary); }
.legend-dot.issued { background: var(--blue); }

.recent-orders {
  margin-bottom: var(--space-5);
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  text-align: center;
}
.empty-state .empty-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}
.empty-state .empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}
.empty-hint {
  padding: 0 var(--space-5);
  font-size: 13px;
  color: var(--text-tertiary);
}

.ai-fab {
  position: fixed;
  bottom: calc(var(--tab-height) + var(--space-4));
  right: var(--space-5);
  width: 56px;
  height: 56px;
  background: var(--text);
  color: white;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-display);
  box-shadow: var(--shadow-fab);
  z-index: 60;
  transition: all var(--duration-slow) var(--ease-out-expo);
}
.ai-fab:active {
  transform: scale(0.9);
}
</style>
