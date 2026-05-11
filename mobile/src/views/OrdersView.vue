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

        <button class="btn-submit" :disabled="submitting" @click="handleCreate">
          {{ submitting ? '创建中...' : '创建配货单' }}
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
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
  padding-bottom: calc(var(--tab-height) + 20px);
  padding-top: var(--page-header-top);
}
.page-header {
  padding: 12px 20px 16px;
}
.header-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.header-title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--text);
}
.order-list {
  margin-top: 8px;
}
.loading-state { display: flex; justify-content: center; padding: 60px 0; }
.empty-hint { text-align: center; padding: 60px 20px; font-size: 14px; color: var(--text-tertiary); }

.create-fab {
  position: fixed;
  bottom: calc(var(--tab-height) + 16px);
  right: 20px;
  width: 52px;
  height: 52px;
  background: var(--accent);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 300;
  box-shadow: 0 8px 30px rgba(0, 102, 255, 0.3);
  z-index: 60;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.create-fab:active { transform: scale(0.9); }

/* Sheet form */
.sheet-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
  margin-bottom: 20px;
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-input {
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 14px;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  outline: none;
}
.form-input:focus { border-color: var(--accent); }
textarea.form-input { height: auto; padding: 10px 14px; resize: none; }
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
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
}
.stock-pick-item:last-child { border-bottom: none; }
.stock-pick-item:active { background: var(--bg); }
.stock-pick-item.picked { background: var(--accent-soft); }
.pick-info { flex: 1; display: flex; gap: 8px; align-items: center; }
.pick-batch { font-size: 14px; font-weight: 500; }
.pick-grade { font-size: 11px; font-weight: 600; background: var(--accent-soft); color: var(--accent); padding: 2px 6px; border-radius: 4px; }
.pick-meta { font-size: 12px; color: var(--text-tertiary); }
.pick-badge { font-size: 12px; font-weight: 500; color: var(--accent); }
.pick-empty { padding: 20px; text-align: center; font-size: 14px; color: var(--text-tertiary); }

.btn-submit {
  height: 48px;
  background: var(--text);
  color: white;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 8px;
}
.btn-submit:active { transform: scale(0.98); }
.btn-submit:disabled { opacity: 0.5; }
</style>
