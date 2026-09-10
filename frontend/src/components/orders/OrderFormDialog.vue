<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content modal-xl glass-card">
          <div class="modal-header">
            <h3 class="modal-title">{{ isEdit ? '编辑配货单' : '新增配货单' }}</h3>
            <button class="modal-close" @click="close">✕</button>
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
                <select v-model="form.targetGrade" class="form-select">
                  <option value="">请选择品级</option>
                  <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option>
                </select>
              </div>
              <div class="form-item">
                <label>产品类型</label>
                <select v-model="form.productType" class="form-select">
                  <option value="">请选择类型</option>
                  <option v-for="t in PRODUCT_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="form-item">
                <label>产品规格</label>
                <select v-model="form.specification" class="form-select">
                  <option value="">请选择规格</option>
                  <option v-for="s in SPECIFICATION_OPTIONS" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="form-item full-width">
                <label>备注</label>
                <textarea v-model="form.remark" rows="2" placeholder="备注信息"></textarea>
              </div>
            </div>

            <!-- 库存选择区（新建时显示） -->
            <div v-if="!isEdit" class="stock-section">
              <div class="stock-header">
                <h4>选择库存</h4>
                <div class="stock-search">
                  <input v-model="stockKeyword" type="text" placeholder="搜索批号、品级..." @input="handleStockSearch(stockKeyword)" />
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
                    <span class="stock-tags">
                      <span class="tag tag-grade">{{ stock.grade }}</span>
                      <span class="tag tag-type">{{ stock.productType || '-' }}</span>
                      <span class="tag tag-spec">{{ stock.specification || '-' }}</span>
                    </span>
                  </div>
                  <div class="stock-meta">
                    <span class="stock-weight">{{ Number(stock.weight).toFixed(3) }}kg</span>
                    <span class="stock-pieces">{{ stock.pieceCount ?? '-' }}片</span>
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
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" opacity="0.4">
                    <path d="M20 7L12 3L4 7V17L12 21L20 17V7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  </svg>
                  <span>暂无可用库存</span>
                  <button class="btn-pill btn-primary btn-sm" @click="goToInventory">去添加库存</button>
                </div>
              </div>
            </div>

            <!-- 配货明细 -->
            <div class="items-section">
              <div class="items-header">
                <h4>
                  <span class="items-icon"></span>
                  {{ isEdit ? '配货明细（仅可编辑重量和片数）' : '配货明细' }}
                </h4>
                <span class="items-count">{{ form.items.length }} 项</span>
              </div>

              <div class="items-list">
                <div v-for="(item, index) in form.items" :key="index" class="item-row">
                  <div class="item-stock">
                    <span class="item-batch">{{ getStockField(item.stockId, 'batchNo') }}</span>
                    <span class="item-tags">
                      <span class="tag tag-grade">{{ getStockField(item.stockId, 'grade') }}</span>
                      <span class="tag tag-type">{{ getStockProductType(item.stockId) }}</span>
                      <span class="tag tag-spec">{{ getStockField(item.stockId, 'specification') }}</span>
                    </span>
                  </div>
                  <input v-model.number="item.weight" type="number" step="0.001" min="0" placeholder="重量(kg)" class="item-input" />
                  <input v-model.number="item.pieceCount" type="number" min="0" placeholder="片数" class="item-input" />
                  <button v-if="!isEdit" class="item-remove" @click="handleRemoveItem(index)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="!form.items.length" class="items-empty">
                <span>{{ isEdit ? '无配货明细' : '从上方选择库存添加配货明细' }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="footer-info">
              <div v-if="categorySummary.length" class="category-breakdown">
                <div v-for="cat in categorySummary" :key="cat.productType + cat.grade + cat.specification" class="category-row">
                  <span class="cat-type">{{ cat.productType }}</span>
                  <span class="cat-grade">{{ cat.grade }}</span>
                  <span class="cat-spec">{{ cat.specification }}</span>
                  <span class="cat-weight">{{ cat.weight.toFixed(3) }}kg</span>
                  <span class="cat-pieces">{{ cat.pieces }}片</span>
                </div>
              </div>
              <div class="category-total">
                <span class="total-label">合计</span>
                <span class="total-weight">{{ totalWeight }}kg</span>
                <span class="total-pieces">{{ totalPieces }}片</span>
              </div>
            </div>
            <div class="footer-actions">
              <button class="btn-pill btn-ghost" @click="close">取消</button>
              <button class="btn-pill btn-primary" @click="handleSubmit">确定</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useInventoryStore } from '@/stores/inventory'
import { searchInventory } from '@/api/distribution'
import { PRODUCT_TYPE_OPTIONS, SPECIFICATION_OPTIONS } from '@/constants/order'
import { isSmallBlockSpec, normalizeProductType, sortGrades } from '@/utils/stock'
import type { DistributionOrder, CreateOrderDto, OrderItemDto, InventoryStock } from '@/types'

const props = defineProps<{
  modelValue: boolean
  /** 传入则为编辑模式，null 为新建 */
  editOrder: DistributionOrder | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const router = useRouter()
const showToast = inject('showToast') as (message: string, type?: string) => void

const isEdit = computed(() => props.editOrder !== null)
const availableStocks = ref<InventoryStock[]>([])
const stockKeyword = ref('')

const form = reactive<CreateOrderDto & { items: OrderItemDto[]; productType?: string; specification?: string }>({
  customerId: 0,
  customerName: '',
  targetGrade: '',
  productType: '',
  specification: '',
  remark: '',
  items: [],
})

const close = () => emit('update:modelValue', false)
const goToInventory = () => router.push('/inventory')

// 品级选项（从库存数据提取）
const gradeOptions = computed(() => {
  const grades = new Set<string>()
  availableStocks.value.forEach(s => {
    if (s.grade) grades.add(s.grade)
  })
  return sortGrades([...grades])
})

// 过滤库存（类型+规格筛选 + 关键词搜索）
const filteredStocks = computed(() => {
  let list = availableStocks.value

  if (form.productType) {
    list = list.filter(s => s.productType === form.productType)
  }
  if (form.specification) {
    list = list.filter(s => s.specification === form.specification)
  }
  if (stockKeyword.value) {
    const kw = stockKeyword.value.toLowerCase()
    list = list.filter(s =>
      s.batchNo?.toLowerCase().includes(kw) ||
      s.grade?.toLowerCase().includes(kw) ||
      s.specification?.toLowerCase().includes(kw) ||
      s.location?.toLowerCase().includes(kw)
    )
  }
  return list
})

// 远程搜索库存（防抖 300ms）
let searchTimer: ReturnType<typeof setTimeout> | null = null
const handleStockSearch = (keyword: string) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!keyword.trim()) {
    // 清空搜索时重新加载初始数据
    inventoryStore.fetchInventory({ page: 1, limit: 200, status: 'available' }).then(() => {
      availableStocks.value = inventoryStore.inventoryList
    })
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const results = await searchInventory(keyword, 50) as InventoryStock[]
      availableStocks.value = results
    } catch {
      // 回退到本地筛选
    }
  }, 300)
}

// 总计
const totalWeight = computed(() => {
  return form.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0).toFixed(3)
})

const totalPieces = computed(() => {
  return form.items.reduce((sum, item) => {
    const stock = availableStocks.value.find(s => s.id === item.stockId)
    if (isSmallBlockSpec(stock?.specification)) return sum
    return sum + (Number(item.pieceCount) || 0)
  }, 0)
})

// 按产品类型+品级+规格分类汇总
const categorySummary = computed(() => {
  const map = new Map<string, { productType: string; grade: string; specification: string; weight: number; pieces: number }>()
  for (const item of form.items) {
    const stock = availableStocks.value.find(s => s.id === item.stockId)
    const pt = stock?.productType ? normalizeProductType(stock.productType) : '-'
    const grade = stock?.grade || '-'
    const spec = stock?.specification || '-'
    const key = `${pt}|${grade}|${spec}`
    if (!map.has(key)) map.set(key, { productType: pt, grade, specification: spec, weight: 0, pieces: 0 })
    const entry = map.get(key)!
    entry.weight += Number(item.weight) || 0
    if (!isSmallBlockSpec(stock?.specification)) entry.pieces += Number(item.pieceCount) || 0
  }
  return [...map.values()]
})

const findStock = (stockId: number) => availableStocks.value.find(s => s.id === stockId)

const isStockSelected = (stockId: number) => form.items.some(item => item.stockId === stockId)

const getStockField = (stockId: number, field: 'batchNo' | 'grade' | 'specification') => {
  return findStock(stockId)?.[field] || '-'
}

const getStockProductType = (stockId: number) => normalizeProductType(findStock(stockId)?.productType)

// 从库存卡片添加 / 再点移除
const handleAddFromStock = (stock: InventoryStock) => {
  const existingIndex = form.items.findIndex(item => item.stockId === stock.id)
  if (existingIndex !== -1) {
    form.items.splice(existingIndex, 1)
    return
  }
  form.items.push({
    stockId: stock.id,
    weight: Number(stock.weight),
    pieceCount: stock.pieceCount ?? undefined,
  })
}

const handleRemoveItem = (index: number) => {
  form.items.splice(index, 1)
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
    if (isEdit.value && props.editOrder) {
      await orderStore.updateOrder(props.editOrder.id, form)
      showToast?.('更新成功', 'success')
    } else {
      await orderStore.createOrder(form)
      showToast?.('创建成功', 'success')
    }
    close()
    emit('saved')
  } catch {
    // 错误已在 API 层处理
  }
}

// 弹窗打开时初始化表单与库存数据
watch(() => props.modelValue, async (visible) => {
  if (!visible) return
  stockKeyword.value = ''

  if (props.editOrder) {
    const row = props.editOrder
    Object.assign(form, {
      customerId: row.customerId,
      customerName: row.customerName,
      targetGrade: row.targetGrade,
      productType: row.productType || '',
      specification: row.specification || '',
      remark: row.remark,
      items: row.items?.map((i) => ({
        stockId: i.stockId,
        weight: Number(i.weight),
        pieceCount: i.pieceCount || undefined,
      })) || [],
    })
    // 编辑时使用订单已有的库存信息，无需重新加载
    availableStocks.value = row.items?.map((i) => i.stock).filter((s): s is InventoryStock => Boolean(s)) || []
  } else {
    Object.assign(form, {
      customerId: 0,
      customerName: '',
      targetGrade: '',
      productType: '',
      specification: '',
      remark: '',
      items: [],
    })
    // 初始加载可用库存（前 200 条）
    await inventoryStore.fetchInventory({ page: 1, limit: 200, status: 'available' })
    availableStocks.value = inventoryStore.inventoryList
  }
})
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

  &.modal-xl {
    max-width: 900px;
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
      box-shadow: 0 0 0 3px var(--color-primary-100);
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

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.tag-grade {
  background: rgba(0, 113, 227, 0.1);
  color: #0071e3;
}

.tag-type {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.tag-spec {
  background: rgba(255, 149, 0, 0.1);
  color: #ff9500;
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
  gap: var(--spacing-md);
  align-items: center;
  padding: var(--spacing-md);
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

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
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
  transition: background var(--transition-normal), border-color var(--transition-normal);
  border: 2px solid transparent;

  &:hover {
    background: var(--color-bg-hover);
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

.stock-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.stock-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 8px;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-tertiary);

  .btn-sm {
    padding: 6px 16px;
    font-size: var(--font-size-sm);
  }
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.category-breakdown {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs);
}

.category-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);

  .cat-type, .cat-grade, .cat-spec {
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-bg-tertiary);
  }

  .cat-weight {
    font-family: monospace;
    font-weight: 500;
    color: var(--color-primary);
  }

  .cat-pieces {
    color: var(--color-text-tertiary);
  }
}

.category-total {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: 4px;
  border-top: 1px solid var(--color-border);
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
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-item.full-width {
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
