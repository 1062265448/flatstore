<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content modal-lg glass-card">
          <div class="modal-header">
            <h3 class="modal-title">库存详情</h3>
            <button class="modal-close" @click="close">✕</button>
          </div>

          <div class="modal-body" v-if="stock">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">批号</span>
                <span class="detail-value batch-no">{{ stock.batchNo }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">包号</span>
                <span class="detail-value">{{ stock.packageNo || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">品级</span>
                <span class="tag tag-info">{{ stock.grade }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态</span>
                <span :class="['tag', INVENTORY_STATUS_TAG_CLASS[stock.status]]">{{ INVENTORY_STATUS_LABEL[stock.status] }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">产品类型</span>
                <span class="detail-value">{{ stock.productType || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">规格</span>
                <span class="detail-value">{{ stock.specification || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">重量(kg)</span>
                <span class="detail-value weight">{{ Number(stock.weight).toFixed(3) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">片数</span>
                <span class="detail-value">{{ stock.pieceCount ?? '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">存放位置</span>
                <span class="detail-value">{{ stock.location || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">镍含量</span>
                <span class="detail-value">{{ stock.nickelContent ? Number(stock.nickelContent).toFixed(2) + '%' : '-' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">备注</span>
                <span class="detail-value">{{ stock.remark || '-' }}</span>
              </div>
            </div>

            <!-- 关联订单 -->
            <div v-if="stock.linkedOrders && stock.linkedOrders.length" class="linked-section">
              <h4>关联配货单 ({{ stock.linkedOrders.length }})</h4>
              <div class="linked-list">
                <div v-for="order in stock.linkedOrders" :key="order.id" class="linked-card" @click="goToOrder(order.id)">
                  <div class="linked-info">
                    <span class="linked-order-no">{{ order.orderNo || `#${order.id}` }}</span>
                    <span :class="['tag', LINKED_ORDER_STATUS_TAG_CLASS[order.status]]">{{ LINKED_ORDER_STATUS_LABEL[order.status] || order.status }}</span>
                  </div>
                  <div class="linked-meta">
                    <span v-if="order.customerName">{{ order.customerName }}</span>
                    <span v-if="order.totalWeight">{{ Number(order.totalWeight).toFixed(3) }}kg</span>
                  </div>
                </div>
              </div>
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
import { useRouter } from 'vue-router'
import type { InventoryStock } from '@/types'
import {
  INVENTORY_STATUS_TAG_CLASS,
  INVENTORY_STATUS_LABEL,
  LINKED_ORDER_STATUS_TAG_CLASS,
  LINKED_ORDER_STATUS_LABEL,
} from '@/constants/inventory'

defineProps<{
  modelValue: boolean
  stock: InventoryStock | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()

const close = () => emit('update:modelValue', false)

const goToOrder = (orderId: number) => {
  close()
  router.push({ path: '/orders', query: { highlight: String(orderId) } })
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
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
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
  padding: var(--spacing-lg);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
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

    &.batch-no {
      font-family: var(--font-mono);
      font-weight: 500;
    }

    &.weight {
      font-family: var(--font-mono);
    }
  }
}

// 关联订单
.linked-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);

  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin-bottom: var(--spacing-md);
  }
}

.linked-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.linked-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
  }
}

.linked-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.linked-order-no {
  font-weight: 500;
  font-family: var(--font-mono);
  color: var(--color-primary);
}

.linked-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
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
