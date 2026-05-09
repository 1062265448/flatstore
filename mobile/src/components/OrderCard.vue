<template>
  <div class="order-card" @click="$emit('click')">
    <div class="order-head">
      <span class="order-no">{{ order.orderNo || '#' + order.id }}</span>
      <span class="order-badge" :class="badgeClass">{{ statusText }}</span>
    </div>
    <div class="order-cust">{{ order.customer?.name || order.customerName || '-' }}</div>
    <div class="order-meta">
      <span>{{ order.totalWeight ? Number(order.totalWeight).toFixed(2) + 't' : '-' }}</span>
      <span>{{ order.items?.length || 0 }} 批</span>
      <span v-if="order.driverName">{{ order.driverName }} · {{ order.vehicleNo }}</span>
      <span v-else>待发货</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DistributionOrder } from '@/types'

const props = defineProps<{
  order: DistributionOrder
}>()

defineEmits<{ click: [] }>()

const statusText = computed(() => {
  const map: Record<string, string> = { draft: '草稿', shipping: '发货中', shipped: '已完成', cancelled: '已取消' }
  return map[props.order.status] || props.order.status
})

const badgeClass = computed(() => {
  const map: Record<string, string> = { draft: 'badge-gray', shipping: 'badge-amber', shipped: 'badge-green', cancelled: 'badge-red' }
  return map[props.order.status] || 'badge-gray'
})
</script>

<style scoped>
.order-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  margin: 0 20px 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.order-card:active {
  transform: scale(0.985);
}

.order-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.order-no {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.order-badge {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.badge-green { background: var(--green-soft); color: var(--green); }
.badge-amber { background: var(--amber-soft); color: var(--amber); }
.badge-gray { background: #F5F5F5; color: var(--text-secondary); }
.badge-red { background: var(--red-soft); color: var(--red); }

.order-cust {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.order-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
