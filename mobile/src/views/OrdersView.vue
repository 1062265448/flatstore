<template>
  <div class="orders-view">
    <div class="page-header">
      <div class="header-label">平面库配货</div>
      <h1 class="header-title">配货</h1>
    </div>

    <FilterPills :pills="statusFilters" v-model="selectedStatus" />

    <div class="order-list">
      <div v-if="orderStore.loading" class="loading-state">
        <div class="spinner spinner-lg"></div>
      </div>
      <template v-else>
        <OrderCard
          v-for="order in orderStore.orderList"
          :key="order.id"
          :order="order"
          @click="router.push(`/orders/${order.id}`)"
        />
        <div v-if="!orderStore.orderList.length" class="empty-hint">暂无配货单</div>
      </template>
    </div>

    <!-- 新建 FAB -->
    <button class="create-fab" @click="showCreateSheet = true">+</button>

    <!-- 创建配货单 Bottom Sheet -->
    <BottomSheet :visible="showCreateSheet" @close="showCreateSheet = false">
      <h2 class="sheet-title">新建配货单</h2>
      <div class="create-form">
        <div class="form-group">
          <label>客户 *</label>
          <select v-model="createForm.customerId" class="form-input">
            <option :value="0" disabled>请选择客户</option>
            <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>目标品级</label>
          <select v-model="createForm.targetGrade" class="form-input">
            <option value="">请选择</option>
            <option value="9997">9997</option>
            <option value="9996">9996</option>
            <option value="9950">9950</option>
            <option value="9920">9920</option>
          </select>
        </div>
        <div class="form-group">
          <label>备注</label>
          <textarea v-model="createForm.remark" rows="2" class="form-input" placeholder="备注信息"></textarea>
        </div>

        <!-- 库存选择 -->
        <div class="form-group">
          <label>选择库存</label>
          <div class="stock-pick-list">
            <div
              v-for="s in availableStocks"
              :key="s.id"
              class="stock-pick-item"
              :class="{ picked: isPicked(s.id) }"
              @click="togglePick(s)"
            >
              <div class="pick-info">
                <span class="pick-batch">{{ s.batchNo }}</span>
                <span class="pick-grade">{{ s.grade }}</span>
              </div>
              <div class="pick-meta">{{ Number(s.weight).toFixed(2) }}t · {{ s.pieceCount }}块</div>
              <span class="pick-badge">{{ isPicked(s.id) ? '已选' : '选择' }}</span>
            </div>
            <div v-if="!availableStocks.length" class="pick-empty">暂无可用库存</div>
          </div>
        </div>

        <!-- 选中汇总 -->
        <div v-if="pickedStocks.length" class="pick-summary">
          <div class="summary-row">
            <span class="summary-label">已选库存</span>
            <span class="summary-value">{{ pickedStocks.length }} 项</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">总重量</span>
            <span class="summary-value summary-highlight">{{ pickedTotalWeight }} 吨</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">总片数</span>
            <span class="summary-value summary-highlight">{{ pickedTotalPieces }} 块</span>
          </div>
        </div>

        <button class="btn-submit" :disabled="submitting" @click="handleCreate">
          {{ submitting ? '创建中...' : '创建配货单' }}
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import { useInventoryStore } from '@/stores/inventory'
import { useCustomerStore } from '@/stores/customer'
import { useToast } from '@/composables/useToast'
import type { InventoryStock } from '@/types'
import FilterPills from '@/components/FilterPills.vue'
import OrderCard from '@/components/OrderCard.vue'
import BottomSheet from '@/components/BottomSheet.vue'

const router = useRouter()
const orderStore = useOrderStore()
const inventoryStore = useInventoryStore()
const customerStore = useCustomerStore()
const { success, danger } = useToast()

const selectedStatus = ref('')
const showCreateSheet = ref(false)
const submitting = ref(false)

const statusFilters = [
  { label: '全部', value: '' },
  { label: '发货中', value: 'shipping' },
  { label: '已完成', value: 'shipped' },
  { label: '草稿', value: 'draft' },
]

const createForm = reactive({
  customerId: 0,
  targetGrade: '',
  remark: '',
})
const pickedStocks = ref<InventoryStock[]>([])

const availableStocks = ref<InventoryStock[]>([])

const isPicked = (id: number) => pickedStocks.value.some(s => s.id === id)
const togglePick = (s: InventoryStock) => {
  const idx = pickedStocks.value.findIndex(x => x.id === s.id)
  if (idx >= 0) pickedStocks.value.splice(idx, 1)
  else pickedStocks.value.push(s)
}

const pickedTotalWeight = computed(() =>
  pickedStocks.value.reduce((sum, s) => sum + Number(s.weight), 0).toFixed(3)
)
const pickedTotalPieces = computed(() =>
  pickedStocks.value.reduce((sum, s) => sum + (s.pieceCount || 0), 0)
)

const fetchData = async () => {
  await orderStore.fetchOrders({
    status: selectedStatus.value || undefined,
    limit: 50,
  })
}

watch(selectedStatus, fetchData)

const handleCreate = async () => {
  if (!createForm.customerId) { danger('请选择客户'); return }
  if (!pickedStocks.value.length) { danger('请选择库存'); return }
  submitting.value = true
  try {
    await orderStore.createOrder({
      customerId: createForm.customerId,
      targetGrade: createForm.targetGrade || undefined,
      remark: createForm.remark || undefined,
      items: pickedStocks.value.map(s => ({
        stockId: s.id,
        weight: Number(s.weight),
        pieceCount: s.pieceCount,
      })),
    })
    success('配货单已创建')
    showCreateSheet.value = false
    pickedStocks.value = []
    createForm.customerId = 0
    createForm.targetGrade = ''
    createForm.remark = ''
    fetchData()
  } catch {
    danger('创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchData(),
    customerStore.fetchCustomers(),
    inventoryStore.fetchInventory({ status: 'available', limit: 50 }),
  ])
  availableStocks.value = inventoryStore.inventoryList
})

// 当 sheet 打开时刷新可用库存
watch(showCreateSheet, async (v) => {
  if (v) {
    await inventoryStore.fetchInventory({ status: 'available', limit: 50 })
    availableStocks.value = inventoryStore.inventoryList
  }
})
</script>

<style scoped>
.orders-view {
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

.create-fab {
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
  font-size: 24px;
  font-weight: 300;
  box-shadow: var(--shadow-fab);
  z-index: 60;
  transition: all var(--duration-slow) var(--ease-out-expo);
}
.create-fab:active { transform: scale(0.9) rotate(90deg); }

/* Sheet form */
.sheet-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.4px;
  margin-bottom: var(--space-5);
  font-family: var(--font-display);
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
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
textarea.form-input { height: auto; padding: var(--space-3) var(--space-4); resize: none; }
select.form-input { cursor: pointer; }

.stock-pick-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.stock-pick-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background var(--duration-micro) var(--ease-out);
}
.stock-pick-item:last-child { border-bottom: none; }
.stock-pick-item:active { background: var(--surface-alt); }
.stock-pick-item.picked { background: var(--accent-soft); }
.pick-info { flex: 1; display: flex; gap: var(--space-2); align-items: center; }
.pick-batch { font-size: 14px; font-weight: 500; font-family: var(--font-mono); }
.pick-grade { font-size: 11px; font-weight: 600; background: var(--accent-soft); color: var(--accent); padding: 2px var(--space-2); border-radius: var(--radius-xs); }
.pick-meta { font-size: 12px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
.pick-badge { font-size: 12px; font-weight: 500; color: var(--accent); }

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

/* 选中汇总 */
.pick-summary {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary-label {
  font-size: 13px;
  color: var(--text-tertiary);
}
.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.summary-highlight {
  font-weight: 600;
  color: var(--accent);
}
</style>
