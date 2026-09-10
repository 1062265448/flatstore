<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content modal-lg glass-card">
          <div class="modal-header">
            <h3 class="modal-title">配货单详情</h3>
            <button class="modal-close" @click="close">✕</button>
          </div>

          <div class="modal-body" v-if="order">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">单号</span>
                <span class="detail-value">
                  {{ order.orderNo || `#${order.id}` }}
                  <button
                    class="copy-btn"
                    title="复制单号"
                    @click="copyOrderNo(order.orderNo)"
                  >复制</button>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态</span>
                <span :class="['tag', ORDER_STATUS_TAG_CLASS[order.status]]">
                  {{ ORDER_STATUS_LABEL[order.status] }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">客户</span>
                <span class="detail-value">{{ order.customer?.name || order.customerName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">目标品级</span>
                <span class="detail-value">{{ order.targetGrade || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">总重量</span>
                <span class="detail-value">{{ order.totalWeight ? Number(order.totalWeight).toFixed(3) + 'kg' : '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">总片数</span>
                <span class="detail-value">{{ order.totalPieces || '-' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">备注</span>
                <span class="detail-value">{{ order.remark || '-' }}</span>
              </div>
            </div>

            <div class="items-section">
              <h4>配货明细</h4>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>批号</th>
                    <th>品级</th>
                    <th>规格</th>
                    <th>重量(kg)</th>
                    <th>片数</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="(group, batchNo) in orderItemGroups" :key="batchNo">
                    <tr v-for="item in group.items" :key="item.id">
                      <td>{{ item.stock?.batchNo || '-' }}</td>
                      <td><span class="tag tag-info">{{ item.stock?.grade || '-' }}</span></td>
                      <td>{{ item.stock?.specification || '-' }}</td>
                      <td class="weight">{{ Number(item.weight).toFixed(3) }}</td>
                      <td>{{ item.pieceCount ?? '-' }}</td>
                    </tr>
                    <tr v-if="group.items.length > 1" class="summary-row">
                      <td colspan="3" class="summary-label">{{ batchNo }} 小计</td>
                      <td class="weight">{{ group.totalWeight.toFixed(3) }}</td>
                      <td>{{ group.totalPieces || '-' }}</td>
                    </tr>
                  </template>
                </tbody>
                <tfoot v-if="order.items?.length">
                  <tr class="summary-row">
                    <td colspan="3" class="summary-label">合计</td>
                    <td class="weight">{{ orderTotalWeight }}</td>
                    <td>{{ orderTotalPieces || '-' }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-pill btn-ghost" @click="close">关闭</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { DistributionOrder } from '@/types'
import { ORDER_STATUS_LABEL, ORDER_STATUS_TAG_CLASS } from '@/constants/order'
import { isSmallBlockSpec } from '@/utils/stock'

const props = defineProps<{
  modelValue: boolean
  order: DistributionOrder | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const showToast = inject('showToast') as (message: string, type?: string) => void

const close = () => emit('update:modelValue', false)

// 配货明细按批号分组
const orderItemGroups = computed(() => {
  if (!props.order?.items) return {}
  const groups: Record<string, { items: any[]; totalWeight: number; totalPieces: number }> = {}
  for (const item of props.order.items) {
    const key = item.stock?.batchNo || '-'
    if (!groups[key]) groups[key] = { items: [], totalWeight: 0, totalPieces: 0 }
    groups[key].items.push(item)
    groups[key].totalWeight += Number(item.weight) || 0
    if (!isSmallBlockSpec(item.stock?.specification)) groups[key].totalPieces += Number(item.pieceCount) || 0
  }
  return groups
})

const orderTotalWeight = computed(() =>
  props.order?.items?.reduce((sum: number, i: any) => sum + (Number(i.weight) || 0), 0).toFixed(3) || '0.000'
)
const orderTotalPieces = computed(() =>
  props.order?.items?.reduce((sum: number, i: any) => {
    if (isSmallBlockSpec(i.stock?.specification)) return sum
    return sum + (Number(i.pieceCount) || 0)
  }, 0) || 0
)

const copyOrderNo = async (orderNo: string) => {
  try {
    await navigator.clipboard.writeText(orderNo)
    showToast?.('已复制单号: ' + orderNo, 'success')
  } catch {
    showToast?.('复制失败，请手动复制', 'warning')
  }
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--spacing-lg);
}

.modal-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;

  &.modal-lg {
    max-width: 800px;
  }
}

.modal-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-divider);
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    transform: rotate(90deg);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.modal-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);
}

.items-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);

  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--color-divider);
  }

  th {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: var(--color-bg-tertiary);
  }

  .summary-row {
    background: var(--color-bg-tertiary);
    font-weight: 600;
  }

  .summary-label {
    text-align: right;
    color: var(--color-text-secondary);
    padding-right: var(--spacing-md);
  }

  .weight {
    font-family: monospace;
  }
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  &.full-width {
    grid-column: span 2;
  }

  .detail-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-value {
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
  }
}

// 弹窗动画
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-slow);

  .modal-content {
    transition: transform var(--transition-slow), opacity var(--transition-slow);
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal-content {
    transform: scale(0.95);
    opacity: 0;
  }
}

@media (max-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-item.full-width {
    grid-column: span 1;
  }
}
</style>
