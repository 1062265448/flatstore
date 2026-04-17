<template>
  <div class="page-container inventory-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">库存管理</h1>
      <p class="page-subtitle">管理仓库中的所有库存批次</p>
    </div>

    <!-- 搜索和操作区 -->
    <div class="toolbar glass-card">
      <div class="search-section">
        <div class="search-input-wrap">
          <input
            v-model="queryForm.keyword"
            type="text"
            class="search-input"
            placeholder="搜索批号、品级、规格..."
            @keyup.enter="handleSearch"
          />
          <button v-if="queryForm.keyword" class="search-clear" @click="clearSearch">✕</button>
        </div>

        <input
          v-model="queryForm.grade"
          type="text"
          class="filter-input"
          placeholder="品级"
          @keyup.enter="handleSearch"
        />

        <select v-model="queryForm.status" class="filter-select">
          <option value="">全部状态</option>
          <option value="available">可用</option>
          <option value="reserved">已预留</option>
          <option value="shipped">已发货</option>
        </select>

        <button class="btn-pill btn-primary" @click="handleSearch">
          搜索
        </button>
        <button class="btn-pill btn-ghost" @click="handleReset">
          重置
        </button>
      </div>

      <div class="action-section">
        <button class="btn-pill btn-primary" @click="handleCreate">
          <span>+</span> 新增库存
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
      <div v-if="inventoryStore.loading" class="loading-state">
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
                :indeterminate="selectedRows.length > 0 && selectedRows.length < inventoryStore.inventoryList.length"
                @change="toggleSelectAll"
              />
            </th>
            <th>批号</th>
            <th>品级</th>
            <th>规格</th>
            <th>重量(吨)</th>
            <th>片数</th>
            <th>位置</th>
            <th>状态</th>
            <th>创建时间</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in inventoryStore.inventoryList"
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
            <td class="batch-no">{{ row.batchNo }}</td>
            <td><span class="tag tag-info">{{ row.grade }}</span></td>
            <td>{{ row.specification || '-' }}</td>
            <td class="weight">{{ Number(row.weight).toFixed(3) }}</td>
            <td>{{ row.pieceCount }}</td>
            <td>{{ row.location || '-' }}</td>
            <td>
              <span :class="['tag', statusTagClass[row.status]]">
                {{ statusLabel[row.status] }}
              </span>
            </td>
            <td class="time">{{ formatDate(row.createdAt) }}</td>
            <td class="action-col">
              <button class="action-btn" @click="handleEdit(row)">编辑</button>
              <button class="action-btn danger" @click="handleDelete(row.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!inventoryStore.inventoryList.length">
            <td colspan="10" class="empty-cell">
              <div class="empty-state">
                <span class="empty-text">暂无库存数据</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div v-if="inventoryStore.total > 0" class="pagination">
        <span class="pagination-info">
          共 {{ inventoryStore.total }} 条记录
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
          <div class="modal-content glass-card">
            <div class="modal-header">
              <h3 class="modal-title">{{ dialogTitle }}</h3>
              <button class="modal-close" @click="dialogVisible = false">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-grid">
                <div class="form-item">
                  <label>批号 *</label>
                  <input v-model="form.batchNo" type="text" placeholder="请输入批号" />
                </div>
                <div class="form-item">
                  <label>品级 *</label>
                  <select v-model="form.grade" class="form-select">
                    <option value="">请选择品级</option>
                    <option value="9997">9997</option>
                    <option value="9996">9996</option>
                    <option value="9950">9950</option>
                    <option value="9920">9920</option>
                  </select>
                </div>
                <div class="form-item">
                  <label>规格</label>
                  <input v-model="form.specification" type="text" placeholder="请输入规格" />
                </div>
                <div class="form-item">
                  <label>产品类型</label>
                  <select v-model="form.productType" class="form-select">
                    <option value="">请选择产品类型</option>
                    <option value="电解镍">电解镍</option>
                    <option value="电积镍">电积镍</option>
                    <option value="不锈钢专用镍">不锈钢专用镍</option>
                    <option value="电镀专用镍">电镀专用镍</option>
                  </select>
                </div>
                <div class="form-item">
                  <label>重量(吨) *</label>
                  <input v-model.number="form.weight" type="number" step="0.001" min="0" placeholder="0.000" />
                </div>
                <div class="form-item">
                  <label>片数 *</label>
                  <input v-model.number="form.pieceCount" type="number" min="0" placeholder="0" />
                </div>
                <div class="form-item full-width">
                  <label>存放位置</label>
                  <div class="location-select-wrap">
                    <select v-model="form.location" class="form-select">
                      <option value="">请选择存放位置</option>
                      <option value="三厂区">三厂区</option>
                      <option value="二厂区">二厂区</option>
                    </select>
                    <input
                      v-if="!form.location || (!['三厂区', '二厂区'].includes(form.location))"
                      v-model="form.location"
                      type="text"
                      placeholder="或输入其他位置"
                      class="location-input"
                    />
                  </div>
                </div>
                <div class="form-item full-width">
                  <label>备注</label>
                  <textarea v-model="form.remark" rows="3" placeholder="备注信息"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-pill btn-ghost" @click="dialogVisible = false">取消</button>
              <button class="btn-pill btn-primary" @click="handleSubmit">确定</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { InventoryStock, CreateInventoryDto } from '@/types'

const inventoryStore = useInventoryStore()
const showToast = inject('showToast') as (message: string, type?: string) => void

const queryForm = reactive({
  page: 1,
  limit: 20,
  keyword: '',
  grade: '',
  status: '',
})

const selectedRows = ref<InventoryStock[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增库存')
const isEdit = ref(false)
const currentId = ref<number>()

const form = reactive<CreateInventoryDto>({
  batchNo: '',
  grade: '',
  specification: '',
  productType: '',
  weight: 0,
  pieceCount: 0,
  location: '',
  remark: '',
})

const statusTagClass: Record<string, string> = {
  available: 'tag-success',
  reserved: 'tag-warning',
  shipped: 'tag-default',
}

const statusLabel: Record<string, string> = {
  available: '可用',
  reserved: '已预留',
  shipped: '已发货',
}

const totalPages = computed(() => Math.ceil(inventoryStore.total / queryForm.limit))

const isSelected = (id: number) => selectedRows.value.some(r => r.id === id)
const isAllSelected = computed(() =>
  inventoryStore.inventoryList.length > 0 &&
  selectedRows.value.length === inventoryStore.inventoryList.length
)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const handleSearch = () => {
  inventoryStore.fetchInventory({
    page: queryForm.page,
    limit: queryForm.limit,
    keyword: queryForm.keyword || undefined,
    grade: queryForm.grade || undefined,
    status: queryForm.status || undefined,
  })
}

const handleReset = () => {
  queryForm.keyword = ''
  queryForm.grade = ''
  queryForm.status = ''
  queryForm.page = 1
  handleSearch()
}

const clearSearch = () => {
  queryForm.keyword = ''
  handleSearch()
}

const goToPage = (page: number) => {
  queryForm.page = page
  handleSearch()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const toggleSelect = (row: InventoryStock) => {
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
    selectedRows.value = [...inventoryStore.inventoryList]
  }
}

const handleCreate = () => {
  dialogTitle.value = '新增库存'
  isEdit.value = false
  currentId.value = undefined
  Object.assign(form, {
    batchNo: '',
    grade: '',
    specification: '',
    productType: '',
    weight: 0,
    pieceCount: 0,
    location: '',
    nickelContent: '',
    remark: '',
  })
  dialogVisible.value = true
}

const handleEdit = (row: InventoryStock) => {
  dialogTitle.value = '编辑库存'
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, {
    batchNo: row.batchNo || '',
    grade: row.grade || '',
    specification: row.specification || '',
    productType: row.productType || '',
    weight: Number(row.weight) || 0,
    pieceCount: row.pieceCount || 0,
    location: row.location || '',
    remark: row.remark || '',
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.batchNo || !form.grade || !form.weight || !form.pieceCount) {
    showToast?.('请填写必填项', 'warning')
    return
  }
  try {
    if (isEdit.value && currentId.value) {
      await inventoryStore.updateInventory(currentId.value, form)
      showToast?.('更新成功', 'success')
    } else {
      await inventoryStore.createInventory(form)
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
    await ElMessageBox.confirm('确定删除该库存记录?', '提示', { type: 'warning' })
    await inventoryStore.deleteInventory(id)
    showToast?.('删除成功', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 条记录?`, '提示', {
      type: 'warning',
    })
    const ids = selectedRows.value.map(r => r.id)
    await inventoryStore.batchDelete(ids)
    selectedRows.value = []
    showToast?.('批量删除成功', 'success')
    handleSearch()
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  handleSearch()
})
</script>

<style scoped lang="scss">
.inventory-page {
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
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  flex: 1;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 260px;
  padding: 10px 36px 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
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

.search-clear {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-text-tertiary);
  cursor: pointer;

  &:hover {
    color: var(--color-text-primary);
  }
}

.filter-input,
.filter-select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-base);
  background: var(--color-bg);
  color: var(--color-text-primary);
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.filter-select {
  cursor: pointer;
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

  .batch-no {
    font-weight: 500;
    font-family: monospace;
  }

  .weight {
    font-family: monospace;
  }

  .time {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .action-col {
    width: 140px;
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

  &.danger {
    color: var(--color-danger);

    &:hover {
      background: rgba(255, 59, 48, 0.1);
    }
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
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
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
    min-height: 80px;
  }
}

.location-select-wrap {
  display: flex;
  gap: var(--spacing-sm);

  .form-select {
    flex: 1;
  }

  .location-input {
    flex: 1;
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
    flex-wrap: wrap;
  }

  .search-input {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-item.full-width {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .data-table {
    th, td {
      padding: 10px 12px;
    }
  }

  .action-col {
    width: auto;
  }
}
</style>
