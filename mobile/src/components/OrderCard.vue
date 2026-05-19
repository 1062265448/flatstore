<template>
  <div class="order-card" @click="$emit('click')">
    <div class="order-head">
      <span class="order-no">{{ order.orderNo || '#' + order.id }}</span>
      <span class="order-badge" :class="badgeClass">{{ statusText }}</span>
    </div>
    <div class="order-cust">{{ order.customer?.name || order.customerName || '-' }}</div>
    <div class="order-meta">
      <span>{{ order.totalWeight ? Number(order.totalWeight).toFixed(3) + 'kg' : '-' }}</span>
      <span>{{ order.items?.length || 0 }} 批</span>
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
  const map: Record<string, string> = { draft: '草稿', shipped: '已发货', cancelled: '已取消' }
  return map[props.order.status] || props.order.status
})

const badgeClass = computed(() => {
  const map: Record<string, string> = { draft: 'badge-gray', shipped: 'badge-green', cancelled: 'badge-red' }
  return map[props.order.status] || 'badge-gray'
})
</script>

<style scoped>
.order-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4) var(--space-5);
  margin: 0 var(--space-5) var(--space-2);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
}
.order-card:active {
  transform: scale(0.985);
  box-shadow: var(--shadow-md);
}

.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.order-no {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-mono);
  letter-spacing: -0.2px;
}
.order-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 600;
}
.badge-green { background: var(--green-soft); color: var(--green); }
.badge-amber { background: var(--amber-soft); color: var(--amber); }
.badge-gray { background: var(--surface-alt); color: var(--text-secondary); }
.badge-red { background: var(--red-soft); color: var(--red); }

.order-cust {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}
.order-meta {
  display: flex;
  gap: var(--space-4);
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}
</style>
