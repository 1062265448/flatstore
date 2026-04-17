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
        <!-- 状态筛选 -->
        <div class="filter-pills">
          <button
            v-for="status in statusOptions"
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
            <th>司机/车牌</th>
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
              <span :class="['tag', statusTagClass[row.status]]">
                {{ statusLabel[row.status] }}
              </span>
            </td>
            <td class="driver-info">
              <template v-if="row.driverName">
                <span>{{ row.driverName }}</span>
                <span class="vehicle">{{ row.vehicleNo }}</span>
              </template>
              <span v-else class="text-secondary">-</span>
            </td>
            <td class="time">{{ formatDate(row.createdAt) }}</td>
            <td class="action-col">
              <!-- 草稿状态 -->
              <template v-if="row.status === 'draft'">
                <button class="action-btn" @click="handleEdit(row)">编辑</button>
                <button class="action-btn success" @click="handleConfirm(row.id)">确认</button>
                <button class="action-btn danger" @click="handleCancel(row.id)">取消</button>
              </template>
              <!-- 已确认状态 -->
              <template v-else-if="row.status === 'confirmed'">
                <button class="action-btn warning" @click="handleShip(row)">发货</button>
                <button class="action-btn danger" @click="handleCancel(row.id)">取消</button>
              </template>
              <!-- 发货中状态 -->
              <template v-else-if="row.status === 'shipping'">
                <button class="action-btn success" @click="handleDeliver(row.id)">完成发运</button>
              </template>
              <!-- 已完成/已取消状态 -->
              <template v-else>
                <button class="action-btn" @click="handleView(row)">查看</button>
              </template>
              <button class="action-btn danger" @click="handleDelete(row.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!orderStore.orderList.length">
            <td colspan="10" class="empty-cell">
              <div class="empty-state">
                <span class="empty-icon">📋</span>
                <span class="empty-text">暂无配货单数据</span>
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
    <Teleport to="body">
      <transition name="modal">
        <div v-if="dialogVisible" class="modal-overlay" @click.self="dialogVisible = false">
          <div class="modal-content modal-xl glass-card">
            <div class="modal-header">
              <h3 class="modal-title">{{ dialogTitle }}</h3>
              <button class="modal-close" @click="dialogVisible = false">✕</button>
            </div>

            <div class="modal-body">
              <!-- 基本信息 -->
              <div class="form-grid">
                <div class="form-item">
                  <label>客户 *</label>
                  <select v-model="form.customerId" class="form-select">
                    <option :value="0" disabled>请选择客户</option>
                    <option v-for="c in customerStore.customers" :key="c.id" :value="c.id">
                      {{ c.name }}
                    </option>
                  </select>
                </div>
                <div class="form-item">
                  <label>目标品级</label>
                  <input v-model="form.targetGrade" type="text" placeholder="请输入目标品级" />
                </div>
                <div class="form-item">
                  <label>产品规格</label>
                  <input v-model="form.productSpec" type="text" placeholder="请输入产品规格" />
                </div>
                <div class="form-item full-width">
                  <label>备注</label>
                  <textarea v-model="form.remark" rows="2" placeholder="备注信息"></textarea>
                </div>
              </div>

              <!-- 库存选择区 -->
              <div class="stock-section">
                <div class="stock-header">
                  <h4>
                    <span class="stock-icon">📦</span>
                    选择库存
                  </h4>
                  <div class="stock-search">
                    <input v-model="stockKeyword" type="text" placeholder="搜索批号、品级..." />
                  </div>
                </div>

                <div class="stock-list">
                  <div
                    v-for="stock in filteredStocks"
                    :key="stock.id"
                    :class="['stock-item', { selected: isStockSelected(stock.id) }]"
                    @click="handleAddFromStock(stock)"
                  >
                    <div class="stock-info">
                      <span class="stock-batch">{{ stock.batchNo }}</span>
                      <span class="tag tag-info">{{ stock.grade }}</span>
                      <span class="stock-spec">{{ stock.specification || '-' }}</span>
                    </div>
                    <div class="stock-meta">
                      <span class="stock-weight">{{ Number(stock.weight).toFixed(3) }}吨</span>
                      <span class="stock-pieces">{{ stock.pieceCount }}片</span>
                      <span class="stock-location">{{ stock.location || '-' }}</span>
                    </div>
                    <div class="stock-action">
                      <span v-if="isStockSelected(stock.id)" class="selected-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        已选
                      </span>
                      <span v-else class="add-badge">+ 添加</span>
                    </div>
                  </div>
                  <div v-if="!filteredStocks.length" class="stock-empty">
                    <span>暂无可用库存</span>
                  </div>
                </div>
              </div>

              <!-- 配货明细 -->
              <div class="items-section">
                <div class="items-header">
                  <h4>
                    <span class="items-icon">📋</span>
                    配货明细
                  </h4>
                  <span class="items-count">{{ form.items.length }} 项</span>
                </div>

                <div class="items-list">
                  <div v-for="(item, index) in form.items" :key="index" class="item-row">
                    <div class="item-stock">
                      <span class="item-batch">{{ getStockBatchNo(item.stockId) }}</span>
                      <span class="item-grade">{{ getStockGrade(item.stockId) }}</span>
                    </div>
                    <input v-model.number="item.weight" type="number" step="0.001" min="0" placeholder="重量(吨)" class="item-input" />
                    <input v-model.number="item.pieceCount" type="number" min="0" placeholder="片数" class="item-input" />
                    <button class="item-remove" @click="handleRemoveItem(index)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div v-if="!form.items.length" class="items-empty">
                  <span>从上方选择库存添加配货明细</span>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <div class="footer-info">
                <span class="total-label">总计</span>
                <span class="total-weight">{{ totalWeight }}吨</span>
                <span class="total-pieces">{{ totalPieces }}片</span>
              </div>
              <div class="footer-actions">
                <button class="btn-pill btn-ghost" @click="dialogVisible = false">取消</button>
                <button class="btn-pill btn-primary" @click="handleSubmit">确定</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 查看详情弹窗 -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="viewVisible" class="modal-overlay" @click.self="viewVisible = false">
          <div class="modal-content modal-lg glass-card">
            <div class="modal-header">
              <h3 class="modal-title">配货单详情</h3>
              <button class="modal-close" @click="viewVisible = false">✕</button>
            </div>

            <div class="modal-body" v-if="currentOrder">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">单号</span>
                  <span class="detail-value">{{ currentOrder.orderNo || `#${currentOrder.id}` }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">状态</span>
                  <span :class="['tag', statusTagClass[currentOrder.status]]">
                    {{ statusLabel[currentOrder.status] }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">客户</span>
                  <span class="detail-value">{{ currentOrder.customer?.name || currentOrder.customerName }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">目标品级</span>
                  <span class="detail-value">{{ currentOrder.targetGrade || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">总重量</span>
                  <span class="detail-value">{{ currentOrder.totalWeight ? Number(currentOrder.totalWeight).toFixed(3) + '吨' : '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">总片数</span>
                  <span class="detail-value">{{ currentOrder.totalPieces || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">司机</span>
                  <span class="detail-value">{{ currentOrder.driverName || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">车牌</span>
                  <span class="detail-value">{{ currentOrder.vehicleNo || '-' }}</span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">备注</span>
                  <span class="detail-value">{{ currentOrder.remark || '-' }}</span>
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
                      <th>重量(吨)</th>
                      <th>片数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in currentOrder.items" :key="item.id">
                      <td>{{ item.stock?.batchNo || '-' }}</td>
                      <td><span class="tag tag-info">{{ item.stock?.grade || '-' }}</span></td>
                      <td>{{ item.stock?.specification || '-' }}</td>
                      <td class="weight">{{ Number(item.weight).toFixed(3) }}</td>
                      <td>{{ item.pieceCount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-pill btn-ghost" @click="viewVisible = false">关闭</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 发货弹窗 -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="shipVisible" class="modal-overlay" @click.self="shipVisible = false">
          <div class="modal-content glass-card">
            <div class="modal-header">
              <h3 class="modal-title">发货</h3>
              <button class="modal-close" @click="shipVisible = false">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-grid">
                <div class="form-item">
                  <label>司机姓名</label>
                  <input v-model="shipForm.driverName" type="text" placeholder="请输入司机姓名" />
                </div>
                <div class="form-item">
                  <label>车牌号</label>
                  <input v-model="shipForm.vehicleNo" type="text" placeholder="请输入车牌号" />
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-pill btn-ghost" @click="shipVisible = false">取消</button>
              <button class="btn-pill btn-primary" @click="handleShipSubmit">确定发货</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useInventoryStore } from '@/stores/inventory'
import { ElMessageBox } from 'element-plus'
import type { DistributionOrder, CreateOrderDto, OrderItemDto, ShipOrderDto } from '@/types'

const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const showToast = inject('showToast') as (message: string, type?: string) => void

const queryForm = reactive({
  page: 1,
  limit: 20,
  status: '',
  customerId: undefined as number | undefined,
})

const selectedRows = ref<DistributionOrder[]>([])
const dialogVisible = ref(false)
const viewVisible = ref(false)
const shipVisible = ref(false)
const dialogTitle = ref('新增配货单')
const isEdit = ref(false)
const currentId = ref<number>()
const currentOrder = ref<DistributionOrder | null>(null)
const availableStocks = ref<any[]>([])
const stockKeyword = ref('')

// 计算属性：过滤库存
const filteredStocks = computed(() => {
  if (!stockKeyword.value) return availableStocks.value
  const kw = stockKeyword.value.toLowerCase()
  return availableStocks.value.filter(s =>
    s.batchNo?.toLowerCase().includes(kw) ||
    s.grade?.toLowerCase().includes(kw) ||
    s.specification?.toLowerCase().includes(kw) ||
    s.location?.toLowerCase().includes(kw)
  )
})

// 计算属性：总计
const totalWeight = computed(() => {
  return form.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0).toFixed(3)
})

const totalPieces = computed(() => {
  return form.items.reduce((sum, item) => sum + (Number(item.pieceCount) || 0), 0)
})

// 检查库存是否已选
const isStockSelected = (stockId: number) => {
  return form.items.some(item => item.stockId === stockId)
}

// 获取库存批号
const getStockBatchNo = (stockId: number) => {
  const stock = availableStocks.value.find(s => s.id === stockId)
  return stock?.batchNo || '-'
}

// 获取库存品级
const getStockGrade = (stockId: number) => {
  const stock = availableStocks.value.find(s => s.id === stockId)
  return stock?.grade || '-'
}

const form = reactive<CreateOrderDto & { items: OrderItemDto[] }>({
  customerId: 0,
  customerName: '',
  targetGrade: '',
  productSpec: '',
  remark: '',
  items: [{ stockId: 0, weight: 0, pieceCount: 0 }],
})

const shipForm = reactive<ShipOrderDto>({
  driverName: '',
  vehicleNo: '',
})
const shipOrderId = ref<number>()

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'confirmed', label: '已确认' },
  { value: 'shipping', label: '发货中' },
  { value: 'shipped', label: '已发货' },
  { value: 'cancelled', label: '已取消' },
]

const statusTagClass: Record<string, string> = {
  draft: 'tag-default',
  confirmed: 'tag-warning',
  shipping: 'tag-info',
  shipped: 'tag-success',
  cancelled: 'tag-danger',
}

const statusLabel: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  shipping: '发货中',
  shipped: '已发货',
  cancelled: '已取消',
}

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
  queryForm.page = 1
  handleSearch()
}

const handleSearch = () => {
  orderStore.fetchOrders({
    page: queryForm.page,
    limit: queryForm.limit,
    status: queryForm.status || undefined,
    customerId: queryForm.customerId,
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

const handleCreate = async () => {
  dialogTitle.value = '新增配货单'
  isEdit.value = false
  currentId.value = undefined
  stockKeyword.value = ''
  Object.assign(form, {
    customerId: 0,
    customerName: '',
    targetGrade: '',
    productSpec: '',
    remark: '',
    items: [],
  })
  await inventoryStore.fetchInventory({ page: 1, limit: 1000, status: 'available' })
  availableStocks.value = inventoryStore.inventoryList
  dialogVisible.value = true
}

const handleEdit = async (row: DistributionOrder) => {
  dialogTitle.value = '编辑配货单'
  isEdit.value = true
  currentId.value = row.id
  stockKeyword.value = ''
  Object.assign(form, {
    customerId: row.customerId,
    customerName: row.customerName,
    targetGrade: row.targetGrade,
    productSpec: row.productSpec,
    remark: row.remark,
    items: row.items?.map((i) => ({
      stockId: i.stockId,
      weight: Number(i.weight),
      pieceCount: i.pieceCount,
    })) || [],
  })
  await inventoryStore.fetchInventory({ page: 1, limit: 1000, status: 'available' })
  availableStocks.value = inventoryStore.inventoryList
  dialogVisible.value = true
}

const handleView = async (row: DistributionOrder) => {
  currentOrder.value = await orderStore.fetchOrderById(row.id) as DistributionOrder
  viewVisible.value = true
}

// 从库存卡片添加
const handleAddFromStock = (stock: any) => {
  // 如果已选中，则移除
  const existingIndex = form.items.findIndex(item => item.stockId === stock.id)
  if (existingIndex !== -1) {
    form.items.splice(existingIndex, 1)
    return
  }
  // 添加新项
  form.items.push({
    stockId: stock.id,
    weight: Number(stock.weight),
    pieceCount: stock.pieceCount,
  })
}

const handleAddItem = () => {
  form.items.push({ stockId: 0, weight: 0, pieceCount: 0 })
}

const handleRemoveItem = (index: number) => {
  form.items.splice(index, 1)
}

const handleStockSelect = (index: number) => {
  const stock = availableStocks.value.find((s) => s.id === form.items[index].stockId)
  if (stock) {
    form.items[index].weight = Number(stock.weight)
    form.items[index].pieceCount = stock.pieceCount
  }
}

const handleSubmit = async () => {
  if (!form.customerId) {
    showToast?.('请选择客户', 'warning')
    return
  }
  if (!form.items.length) {
    showToast?.('请选择库存', 'warning')
    return
  }
  try {
    if (isEdit.value && currentId.value) {
      await orderStore.updateOrder(currentId.value, form)
      showToast?.('更新成功', 'success')
    } else {
      await orderStore.createOrder(form)
      showToast?.('创建成功', 'success')
    }
    dialogVisible.value = false
    handleSearch()
  } catch {
    // 错误已在 API 层处理
  }
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

const handleConfirm = async (id: number) => {
  try {
    await ElMessageBox.confirm('确认该配货单?', '提示', { type: 'info' })
    await orderStore.confirmOrder(id)
    showToast?.('确认成功', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

const handleShip = (row: DistributionOrder) => {
  shipOrderId.value = row.id
  shipForm.driverName = ''
  shipForm.vehicleNo = ''
  shipVisible.value = true
}

const handleShipSubmit = async () => {
  if (!shipOrderId.value) return
  await orderStore.shipOrder(shipOrderId.value, shipForm)
  shipVisible.value = false
  showToast?.('发货成功', 'success')
  handleSearch()
}

const handleDeliver = async (id: number) => {
  try {
    await ElMessageBox.confirm('确认完成发运?', '提示', { type: 'info' })
    await orderStore.deliverOrder(id)
    showToast?.('完成发运', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

const handleCancel = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定取消该配货单?', '提示', { type: 'warning' })
    await orderStore.cancelOrder(id)
    showToast?.('已取消', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  handleSearch()
  customerStore.fetchCustomers()
})
</script>

<style scoped lang="scss">
.orders-page {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-2xl);
}

// ==================== 工具栏 ====================
.toolbar {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.search-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  flex: 1;
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
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-base);
  background: var(--color-bg);
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
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
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
    padding: 14px 16px;
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

  .driver-info {
    .vehicle {
      margin-left: 8px;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
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
  padding: 60px !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);

  .empty-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .empty-text {
    color: var(--color-text-secondary);
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

// ==================== 弹窗 ====================
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;

  &.modal-lg {
    max-width: 800px;
  }

  &.modal-xl {
    max-width: 900px;
  }
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

// 表单
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.form-item {
  &.full-width {
    grid-column: span 2;
  }

  label {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
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

  textarea {
    resize: vertical;
    min-height: 60px;
  }
}

.form-select {
  cursor: pointer;
}

// 配货明细
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

.items-icon {
  font-size: 16px;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.items-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.items-empty {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.item-row {
  display: grid;
  grid-template-columns: 1fr 100px 80px 36px;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
  }
}

.item-stock {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.item-batch {
  font-weight: 500;
  font-family: monospace;
  color: var(--color-primary);
}

.item-grade {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.item-input {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text-primary);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.item-remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
}

// 库存选择区
.stock-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);

  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
}

.stock-icon {
  font-size: 16px;
}

.stock-search {
  input {
    padding: 8px 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    font-size: var(--font-size-sm);
    background: var(--color-bg);
    color: var(--color-text-primary);
    width: 200px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }
}

.stock-list {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.stock-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  border: 2px solid transparent;

  &:hover {
    background: var(--color-bg-hover);
    transform: translateX(4px);
  }

  &.selected {
    border-color: var(--color-primary);
    background: rgba(0, 113, 227, 0.05);
  }
}

.stock-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stock-batch {
  font-weight: 600;
  font-family: monospace;
  color: var(--color-text-primary);
}

.stock-spec {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stock-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stock-weight {
  font-family: monospace;
  color: var(--color-primary);
}

.stock-pieces {
  font-family: monospace;
}

.stock-location {
  font-size: var(--font-size-xs);
}

.stock-action {
  .add-badge {
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-size: var(--font-size-sm);
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .selected-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-size: var(--font-size-sm);
    background: var(--color-primary);
    color: white;
  }

  .stock-item:hover & .add-badge {
    background: var(--color-primary);
    color: white;
  }
}

.stock-empty {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-tertiary);
}

// 弹窗底部
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.total-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.total-weight {
  font-size: var(--font-size-lg);
  font-weight: 600;
  font-family: monospace;
  color: var(--color-primary);
}

.total-pieces {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.footer-actions {
  display: flex;
  gap: var(--spacing-sm);
}

// 详情
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
  transition: opacity 0.3s ease;

  .modal-content {
    transition: transform 0.3s ease, opacity 0.3s ease;
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

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-item.full-width {
    grid-column: span 1;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-item.full-width {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .item-row {
    grid-template-columns: 1fr;
  }

  .stock-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .stock-search input {
    width: 100%;
  }

  .stock-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .stock-action {
    width: 100%;
    justify-content: flex-end;
  }

  .modal-footer {
    flex-direction: column;
  }

  .footer-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
