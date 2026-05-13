<template>
  <div class="detail-page">
    <div class="detail-header">
      <button class="back-btn" @click="router.back()">返回</button>
      <h2 class="detail-title">配货单详情</h2>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner spinner-lg"></div>
    </div>

    <div v-else-if="order" class="detail-body">
      <!-- 基本信息 -->
      <div class="detail-card">
        <div class="detail-head">
          <span class="order-no">{{ order.orderNo || '#' + order.id }}</span>
          <span class="order-badge" :class="badgeClass">{{ statusText }}</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-lbl">客户</span>
            <span class="info-val">{{ order.customer?.name || order.customerName || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">目标品级</span>
            <span class="info-val">{{ order.targetGrade || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">总重量</span>
            <span class="info-val">{{ order.totalWeight ? Number(order.totalWeight).toFixed(3) + 't' : '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">总片数</span>
            <span class="info-val">{{ order.totalPieces || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">司机</span>
            <span class="info-val">{{ order.driverName || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-lbl">车牌</span>
            <span class="info-val">{{ order.vehicleNo || '-' }}</span>
          </div>
          <div class="info-item full">
            <span class="info-lbl">备注</span>
            <span class="info-val">{{ order.remark || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 物流时间线 -->
      <div class="section-label" style="padding:0 0 12px 20px">物流轨迹</div>
      <div class="timeline-card">
        <div class="timeline">
          <div class="tl" :class="{ done: stepDone(0), pending: !stepDone(0) }">
            <div class="tl-dot">1</div>
            <div><div class="tl-title">订单创建</div><div class="tl-time">{{ formatDate(order.createdAt) }}</div></div>
          </div>
          <div class="tl" :class="{ done: stepDone(1), pending: !stepDone(1) }">
            <div class="tl-dot">2</div>
            <div><div class="tl-title">确认发货</div><div class="tl-time">{{ order.shippedAt ? formatDate(order.shippedAt) : '等待发货' }}</div></div>
          </div>
        </div>
      </div>

      <!-- 配货明细 -->
      <div v-if="order.items?.length" class="section-label" style="padding:20px 0 12px 20px">配货明细</div>
      <div class="items-card" style="margin: 0 20px;">
        <div v-for="(item, i) in order.items" :key="i" class="item-row">
          <div class="item-info">
            <span class="item-batch">{{ item.stock?.batchNo || '#' + item.stockId }}</span>
            <span class="item-grade">{{ item.stock?.grade || '-' }}</span>
          </div>
          <div class="item-meta">{{ Number(item.weight).toFixed(3) }}t · {{ item.pieceCount }}块</div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="action-bar">
        <template v-if="order.status === 'draft'">
          <button class="action-btn cancel" @click="handleCancel">取消订单</button>
          <button class="action-btn confirm" @click="showShipSheet = true">发货</button>
        </template>
      </div>
    </div>

    <!-- 发货 Sheet -->
    <BottomSheet :visible="showShipSheet" @close="showShipSheet = false">
      <h2 class="sheet-title">发货信息</h2>
      <div class="ship-form">
        <div class="form-group">
          <label>司机姓名 *</label>
          <input v-model="shipForm.driverName" class="form-input" placeholder="请输入司机姓名" />
        </div>
        <div class="form-group">
          <label>车牌号 *</label>
          <input v-model="shipForm.vehicleNo" class="form-input" placeholder="请输入车牌号" />
        </div>
        <button class="btn-submit" :disabled="shipping" @click="handleShip">
          {{ shipping ? '发货中...' : '确认发货' }}
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import { useToast } from '@/composables/useToast'
import type { DistributionOrder } from '@/types'
import BottomSheet from '@/components/BottomSheet.vue'

const router = useRouter()
const route = useRoute()
const orderStore = useOrderStore()
const { success, danger } = useToast()

const order = ref<DistributionOrder | null>(null)
const loading = ref(true)
const showShipSheet = ref(false)
const shipping = ref(false)
const shipForm = reactive({ driverName: '', vehicleNo: '' })

const statusText = computed(() => {
  const map: Record<string, string> = { draft: '草稿', shipped: '已发货', cancelled: '已取消' }
  return map[order.value?.status || ''] || ''
})

const badgeClass = computed(() => {
  const map: Record<string, string> = { draft: 'badge-gray', shipped: 'badge-green', cancelled: 'badge-red' }
  return map[order.value?.status || ''] || 'badge-gray'
})

// 时间线步骤: 0=创建 1=发货
const stepDone = (step: number) => {
  const s = order.value?.status
  if (!s) return false
  if (step === 0) return true // 已创建
  if (step === 1) return s === 'shipped'
  return false
}

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

const refresh = async () => {
  const id = Number(route.params.id)
  try {
    order.value = await orderStore.fetchOrderById(id) as any
  } catch {
    danger('加载失败')
  } finally {
    loading.value = false
  }
}

const handleShip = async () => {
  if (!order.value) return
  if (!shipForm.driverName.trim()) { danger('请填写司机姓名'); return }
  if (!shipForm.vehicleNo.trim()) { danger('请填写车牌号'); return }
  shipping.value = true
  try {
    await orderStore.shipOrder(order.value.id, shipForm)
    success('发货成功')
    showShipSheet.value = false
    refresh()
  } catch {
    danger('发货失败')
  } finally {
    shipping.value = false
  }
}

const handleCancel = async () => {
  if (!order.value) return
  if (!confirm('确认取消该配货单？取消后库存将被释放，此操作不可撤销。')) return
  try {
    await orderStore.cancelOrder(order.value.id)
    success('订单已取消')
    refresh()
  } catch {
    danger('取消失败')
  }
}

onMounted(refresh)
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--bg);
}
.detail-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-5);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back-btn { font-size: 15px; color: var(--accent); font-weight: 600; margin-right: var(--space-4); }
.detail-title { font-size: 17px; font-weight: 700; letter-spacing: -0.4px; font-family: var(--font-display); }

.detail-body { padding-top: calc(56px + var(--safe-top)); padding-bottom: 120px; }
.detail-card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: var(--space-5);
  margin: var(--space-5);
  box-shadow: var(--shadow-sm);
}
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.order-no { font-size: 16px; font-weight: 600; color: var(--text); font-family: var(--font-mono); }
.order-badge { padding: var(--space-1) var(--space-2); border-radius: var(--radius-xs); font-size: 11px; font-weight: 600; }
.badge-green { background: var(--green-soft); color: var(--green); }
.badge-amber { background: var(--amber-soft); color: var(--amber); }
.badge-gray { background: var(--surface-alt); color: var(--text-secondary); }
.badge-red { background: var(--red-soft); color: var(--red); }

.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
.info-item { display: flex; flex-direction: column; gap: var(--space-1); }
.info-item.full { grid-column: 1 / -1; }
.info-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary); font-weight: 500; }
.info-val { font-size: 14px; font-weight: 500; color: var(--text); }

.section-label { font-size: 13px; font-weight: 600; color: var(--text-tertiary); }

/* Timeline */
.timeline-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5);
  margin: 0 var(--space-5);
  box-shadow: var(--shadow-sm);
}
.timeline { padding: 0; }
.tl {
  display: flex;
  gap: var(--space-4);
  padding-bottom: var(--space-7, 28px);
  position: relative;
}
.tl:last-child { padding-bottom: 0; }
.tl::after {
  content: '';
  position: absolute;
  left: 15px;
  top: 30px;
  bottom: 0;
  width: 1px;
  background: var(--border);
}
.tl:last-child::after { display: none; }
.tl-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.tl.done .tl-dot { background: var(--accent); color: var(--text-inverse); }
.tl.pending .tl-dot { background: var(--surface-alt); color: var(--text-tertiary); }
.tl-title { font-size: 14px; font-weight: 500; color: var(--text); }
.tl.pending .tl-title { color: var(--text-tertiary); }
.tl-time { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }

/* Items */
.items-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}
.item-row:last-child { border-bottom: none; }
.item-info { display: flex; gap: var(--space-2); align-items: center; }
.item-batch { font-size: 14px; font-weight: 500; font-family: var(--font-mono); }
.item-grade { font-size: 11px; font-weight: 600; background: var(--accent-soft); color: var(--accent); padding: 2px var(--space-2); border-radius: var(--radius-xs); }
.item-meta { font-size: 12px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

/* Action bar */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-3) var(--space-5) calc(var(--space-3) + var(--safe-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid var(--border);
  display: flex;
  gap: var(--space-2);
  z-index: 40;
}
.action-btn {
  flex: 1;
  height: 48px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-body);
  transition: all var(--duration-micro) var(--ease-out);
}
.action-btn:active { transform: scale(0.97); }
.action-btn.cancel { background: var(--red-soft); color: var(--red); }
.action-btn.confirm { background: var(--text); color: var(--text-inverse); box-shadow: var(--shadow-md); }

/* Ship sheet */
.sheet-title { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; margin-bottom: var(--space-5); font-family: var(--font-display); }
.ship-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-group label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.form-input {
  height: 48px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-4);
  font-size: 15px;
  color: var(--text);
  background: var(--surface);
  outline: none;
  font-family: var(--font-body);
  transition: border-color var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out);
}
.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.btn-submit {
  height: 48px;
  background: var(--accent);
  color: var(--text-inverse);
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  margin-top: var(--space-2);
  box-shadow: var(--shadow-sm);
}
.btn-submit:active { transform: scale(0.97); }
.btn-submit:disabled { opacity: 0.5; }
</style>
