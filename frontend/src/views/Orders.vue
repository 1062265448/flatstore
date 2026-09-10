<template>
  <div class="page-container orders-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">配货单管理</h1>
      <p class="page-subtitle">创建和管理配货单，跟踪发货状态</p>
    </div>

    <!-- 搜索和操作区 -->
    <div class="toolbar glass-card">
      <div class="search-section">
        <!-- 关键词搜索 -->
        <div class="keyword-search-wrap">
          <input
            v-model="queryForm.keyword"
            type="text"
            class="search-input"
            placeholder="搜索单号、客户名..."
            @input="onKeywordInput"
            @keyup.enter="handleSearch"
          />
          <button v-if="queryForm.keyword" class="search-clear" @click="clearKeyword">✕</button>
        </div>

        <!-- 状态筛选 -->
        <div class="filter-pills">
          <button
            v-for="status in ORDER_STATUS_OPTIONS"
            :key="status.value"
            :class="['filter-pill', { active: queryForm.status === status.value }]"
            @click="filterByStatus(status.value)"
          >
            {{ status.label }}
          </button>
        </div>

        <!-- 客户筛选 -->
        <select v-model="queryForm.customerId" class="filter-select">
          <option :value="undefined">全部客户</option>
          <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>

      <div class="action-section">
        <button class="btn-pill btn-ghost" @click="handleReset">
          重置
        </button>
        <button class="btn-pill btn-primary" @click="handleCreate">
          <span>+</span> 新增配货单
        </button>
        <button
          v-if="selectedRows.length"
          class="btn-pill btn-danger"
          @click="handleBatchDelete"
        >
          批量删除 ({{ selectedRows.length }})
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card glass-card">
      <div v-if="orderStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th class="checkbox-col">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="selectedRows.length > 0 && selectedRows.length < orderStore.orderList.length"
                @change="toggleSelectAll"
              />
            </th>
            <th>单号</th>
            <th>客户</th>
            <th>目标品级</th>
            <th>总重量</th>
            <th>总片数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in orderStore.orderList"
            :key="row.id"
            class="table-row"
            :style="{ animationDelay: `${index * 0.03}s` }"
          >
            <td class="checkbox-col">
              <input
                type="checkbox"
                :checked="isSelected(row.id)"
                @change="toggleSelect(row)"
              />
            </td>
            <td class="order-no">{{ row.orderNo || `#${row.id}` }}</td>
            <td>{{ row.customer?.name || row.customerName || '-' }}</td>
            <td>{{ row.targetGrade || '-' }}</td>
            <td class="weight">{{ row.totalWeight ? Number(row.totalWeight).toFixed(3) : '-' }}</td>
            <td>{{ row.totalPieces || '-' }}</td>
            <td>
              <span :class="['tag', ORDER_STATUS_TAG_CLASS[row.status]]">
                {{ ORDER_STATUS_LABEL[row.status] }}
              </span>
            </td>
            <td class="time">{{ formatDate(row.createdAt) }}</td>
            <td class="action-col">
              <!-- 草稿状态 -->
              <template v-if="row.status === 'draft'">
                <button class="action-btn" @click="handleEdit(row)">编辑</button>
                <button class="action-btn warning" @click="handleShip(row.id)">发货</button>
                <button class="action-btn danger" @click="handleCancel(row.id)">取消</button>
              </template>
              <!-- 已完成/已取消状态 -->
              <template v-else>
                <button class="action-btn" @click="handleView(row)">查看</button>
              </template>
              <button v-if="row.status === 'shipped' || row.status === 'cancelled'" class="action-btn danger" @click="handleDelete(row.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!orderStore.orderList.length">
            <td colspan="9" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.4">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="empty-text">暂无配货单数据</span>
                <span class="empty-hint">点击上方「+ 新增配货单」创建第一笔订单</span>
                <div class="empty-actions">
                  <button class="btn-pill btn-primary" @click="handleCreate">+ 新增配货单</button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div v-if="orderStore.total > 0" class="pagination">
        <span class="pagination-info">
          共 {{ orderStore.total }} 条记录
        </span>
        <div class="pagination-controls">
          <button
            class="btn-pill btn-pill-sm btn-ghost"
            :disabled="queryForm.page <= 1"
            @click="goToPage(queryForm.page - 1)"
          >
            上一页
          </button>
          <span class="page-indicator">{{ queryForm.page }} / {{ totalPages }}</span>
          <button
            class="btn-pill btn-pill-sm btn-ghost"
            :disabled="queryForm.page >= totalPages"
            @click="goToPage(queryForm.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <OrderFormDialog
      v-model="dialogVisible"
      :edit-order="editingOrder"
      @saved="handleSearch"
    />

    <!-- 查看详情弹窗 -->
    <OrderDetailDialog
      v-model="viewVisible"
      :order="currentOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { ElMessageBox } from 'element-plus'
import OrderFormDialog from '@/components/orders/OrderFormDialog.vue'
import OrderDetailDialog from '@/components/orders/OrderDetailDialog.vue'
import { ORDER_STATUS_OPTIONS, ORDER_STATUS_TAG_CLASS, ORDER_STATUS_LABEL } from '@/constants/order'
import type { DistributionOrder } from '@/types'

const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const showToast = inject('showToast') as (message: string, type?: string) => void

const queryForm = reactive({
  page: 1,
  limit: 24,
  status: '',
  customerId: undefined as number | undefined,
  keyword: '',
})

let keywordTimer: ReturnType<typeof setTimeout> | null = null

const selectedRows = ref<DistributionOrder[]>([])
const dialogVisible = ref(false)
const viewVisible = ref(false)
const editingOrder = ref<DistributionOrder | null>(null)
const currentOrder = ref<DistributionOrder | null>(null)

const totalPages = computed(() => Math.ceil(orderStore.total / queryForm.limit))
const isSelected = (id: number) => selectedRows.value.some(r => r.id === id)
const isAllSelected = computed(() =>
  orderStore.orderList.length > 0 &&
  selectedRows.value.length === orderStore.orderList.length
)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const filterByStatus = (status: string) => {
  queryForm.status = status
  queryForm.page = 1
  handleSearch()
}

const handleReset = () => {
  queryForm.status = ''
  queryForm.customerId = undefined
  queryForm.keyword = ''
  queryForm.page = 1
  handleSearch()
}

const onKeywordInput = () => {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    queryForm.page = 1
    handleSearch()
  }, 300)
}

const clearKeyword = () => {
  queryForm.keyword = ''
  handleSearch()
}

const handleSearch = () => {
  orderStore.fetchOrders({
    page: queryForm.page,
    limit: queryForm.limit,
    status: queryForm.status || undefined,
    customerId: queryForm.customerId,
    keyword: queryForm.keyword || undefined,
  })
}

const goToPage = (page: number) => {
  queryForm.page = page
  handleSearch()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const toggleSelect = (row: DistributionOrder) => {
  const index = selectedRows.value.findIndex(r => r.id === row.id)
  if (index === -1) {
    selectedRows.value.push(row)
  } else {
    selectedRows.value.splice(index, 1)
  }
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedRows.value = []
  } else {
    selectedRows.value = [...orderStore.orderList]
  }
}

const handleCreate = () => {
  editingOrder.value = null
  dialogVisible.value = true
}

const handleEdit = (row: DistributionOrder) => {
  editingOrder.value = row
  dialogVisible.value = true
}

const handleView = async (row: DistributionOrder) => {
  currentOrder.value = await orderStore.fetchOrderById(row.id) as DistributionOrder
  viewVisible.value = true
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该配货单?', '提示', { type: 'warning' })
    await orderStore.deleteOrder(id)
    showToast?.('删除成功', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 条配货单?`, '提示', {
      type: 'warning',
    })
    const ids = selectedRows.value.map((r) => r.id)
    await orderStore.batchDelete(ids)
    selectedRows.value = []
    showToast?.('批量删除成功', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

const handleShip = async (id: number) => {
  try {
    await ElMessageBox.confirm('确认发货？发货后库存将标记为已发货。', '发货确认', { type: 'warning' })
    await orderStore.shipOrder(id)
    showToast?.('发货成功', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

const handleCancel = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      '确定取消该配货单？此操作不可撤销，关联库存将被释放回可用状态。',
      '取消配货单',
      { type: 'warning', confirmButtonText: '确认取消', cancelButtonText: '再想想' }
    )
    await orderStore.cancelOrder(id)
    showToast?.('已取消，库存已释放', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  handleSearch()
  customerStore.fetchCustomers()

  // 键盘快捷键: / 聚焦搜索
  const handleGlobalKeydown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      document.querySelector<HTMLInputElement>('.keyword-search-wrap input')?.focus()
    }
  }
  document.addEventListener('keydown', handleGlobalKeydown)
  onUnmounted(() => document.removeEventListener('keydown', handleGlobalKeydown))
})
</script>

<style scoped lang="scss">
.orders-page {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-2xl);
}

// ==================== 工具栏 ====================
.toolbar {
  position: sticky;
  top: 60px;
  z-index: var(--z-sticky, 50);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.search-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  flex: 1;
}

.keyword-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.keyword-search-wrap .search-input {
  width: 200px;
  padding: 8px 32px 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text-primary);
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
}

.keyword-search-wrap .search-clear {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-text-tertiary);
  cursor: pointer;

  &:hover {
    color: var(--color-text-primary);
  }
}

.filter-pills {
  display: flex;
  gap: var(--spacing-xs);
}

.filter-pill {
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  transition: all var(--transition-normal);

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  &.active {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
}

.filter-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 10px 32px 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px;
  color: var(--color-text-primary);
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.action-section {
  display: flex;
  gap: var(--spacing-sm);
}

// ==================== 表格 ====================
.table-card {
  overflow: hidden;

  .data-table {
    min-width: 900px;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--color-text-secondary);
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

  .table-row {
    animation: fadeIn 0.3s ease forwards;
    opacity: 0;
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-bg-hover);
    }
  }

  .checkbox-col {
    width: 40px;
    text-align: center;

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--color-primary);
    }
  }

  .order-no {
    font-weight: 500;
    font-family: monospace;
    color: var(--color-primary);
  }

  .weight {
    font-family: monospace;
  }

  .time {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .action-col {
    width: 200px;
    white-space: nowrap;
  }
}

.action-btn {
  background: none;
  border: none;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(0, 113, 227, 0.1);
  }

  &.success {
    color: var(--color-success);
    &:hover { background: rgba(52, 199, 89, 0.1); }
  }

  &.warning {
    color: var(--color-warning);
    &:hover { background: rgba(255, 149, 0, 0.1); }
  }

  &.danger {
    color: var(--color-danger);
    &:hover { background: rgba(255, 59, 48, 0.1); }
  }
}

.empty-cell {
  padding: 48px !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);

  .empty-text {
    color: var(--color-text-secondary);
  }

  .empty-hint {
    color: var(--color-text-tertiary);
    font-size: var(--font-size-sm);
  }

  .empty-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
  }
}

// ==================== 分页 ====================
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.page-indicator {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: 0 var(--spacing-sm);
}

// ==================== 响应式 ====================
@media (max-width: 1024px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-pills {
    flex-wrap: wrap;
  }
}
</style>
