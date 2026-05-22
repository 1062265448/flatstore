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
        <div class="search-input-wrap" ref="searchWrapRef">
          <input
            v-model="searchInput"
            type="text"
            class="search-input"
            placeholder="搜索批号、规格、位置..."
            @input="onSearchInput"
            @focus="onSearchFocus"
            @blur="onSearchBlur"
            @keyup.enter="doSearch"
          />
          <button v-if="searchInput" class="search-clear" @click="clearSearch">✕</button>

          <!-- 搜索建议下拉 -->
          <div v-if="showSuggestions" class="search-suggestions">
            <!-- 最近搜索 -->
            <div v-if="recentSearches.length && !searchInput" class="suggestions-section">
              <div class="suggestions-header">
                <span class="suggestions-title">最近搜索</span>
                <button class="clear-history" @click.mousedown="handleClearHistory">清除历史</button>
              </div>
              <div class="suggestions-list">
                <div
                  v-for="item in recentSearches"
                  :key="item"
                  class="suggestion-item"
                  @click.mousedown="selectSuggestion(item)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{{ item }}</span>
                </div>
              </div>
            </div>
            <!-- 匹配结果 -->
            <div v-if="suggestionResults.length && searchInput" class="suggestions-section">
              <div class="suggestions-header">
                <span class="suggestions-title">匹配结果</span>
              </div>
              <div class="suggestions-list">
                <div
                  v-for="item in suggestionResults"
                  :key="item.id"
                  class="suggestion-item"
                  @click.mousedown="selectSuggestion(item.batchNo)"
                >
                  <span class="suggestion-batch">{{ item.batchNo }}</span>
                  <span class="suggestion-meta">{{ item.grade }} {{ item.specification || '' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <select v-model="queryForm.grade" class="filter-select" @change="handleFilterChange">
          <option value="">全部品级</option>
          <option value="9997">Ni9997</option>
          <option value="9996">Ni9996</option>
          <option value="9950">Ni9950</option>
          <option value="9920">Ni9920</option>
        </select>

        <select v-model="queryForm.productType" class="filter-select" @change="handleFilterChange">
          <option value="">全部类型</option>
          <option value="电解镍">电解镍</option>
          <option value="电积镍">电积镍</option>
          <option value="不锈钢专用镍">不锈钢专用镍</option>
          <option value="电镀专用镍">电镀专用镍</option>
        </select>

        <select v-model="queryForm.specification" class="filter-select" @change="handleFilterChange">
          <option value="">全部规格</option>
          <option value="整板">整板</option>
          <option value="镍条">镍条</option>
          <option value="100×100">100×100</option>
          <option value="50×50">50×50</option>
          <option value="25×25">25×25</option>
        </select>

        <div class="date-picker-wrap">
          <span v-if="!queryForm.dateFrom" class="date-placeholder" @click="focusDateInput">全部日期</span>
          <input
            ref="dateInputRef"
            v-model="queryForm.dateFrom"
            type="date"
            class="filter-input filter-date date-input-native"
            title="创建日期"
            @change="handleFilterChange"
          />
        </div>

        <select v-model="queryForm.status" class="filter-select" @change="handleFilterChange">
          <option value="">全部状态</option>
          <option value="available">可用</option>
          <option value="reserved">已预留</option>
          <option value="shipped">已发货</option>
          <option value="issued">已发出</option>
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
            <th>包号</th>
            <th>品级</th>
            <th>规格</th>
            <th>重量(kg)</th>
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
            <td>{{ row.packageNo || '-' }}</td>
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
              <button class="action-btn" @click="handleViewDetail(row)">详情</button>
              <button class="action-btn" @click="handleEdit(row)">编辑</button>
              <button class="action-btn danger" @click="handleDelete(row.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!inventoryStore.inventoryList.length">
            <td colspan="10" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.4">
                  <path d="M20 7L12 3L4 7V17L12 21L20 17V7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  <path d="M4 7L12 11L20 7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  <path d="M12 11V21" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="empty-text">暂无库存数据</span>
                <span class="empty-hint">点击上方「+ 新增库存」或使用 AI 识别添加</span>
                <div class="empty-actions">
                  <button class="btn-pill btn-primary" @click="handleCreate">+ 新增库存</button>
                  <button class="btn-pill btn-ghost" @click="router.push('/ai')">AI识别</button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="inventoryStore.inventoryList.length">
          <tr class="summary-row">
            <td colspan="5" class="summary-label">合计</td>
            <td class="weight">{{ totalWeight }} kg</td>
            <td>{{ totalPieces }}</td>
            <td colspan="5"></td>
          </tr>
        </tfoot>
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

    <!-- 库存详情弹窗 -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="detailVisible" class="modal-overlay" @click.self="detailVisible = false">
          <div class="modal-content modal-lg glass-card">
            <div class="modal-header">
              <h3 class="modal-title">库存详情</h3>
              <button class="modal-close" @click="detailVisible = false">✕</button>
            </div>

            <div class="modal-body" v-if="detailStock">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">批号</span>
                  <span class="detail-value batch-no">{{ detailStock.batchNo }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">包号</span>
                  <span class="detail-value">{{ detailStock.packageNo || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">品级</span>
                  <span class="tag tag-info">{{ detailStock.grade }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">状态</span>
                  <span :class="['tag', statusTagClass[detailStock.status]]">{{ statusLabel[detailStock.status] }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">产品类型</span>
                  <span class="detail-value">{{ detailStock.productType || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">规格</span>
                  <span class="detail-value">{{ detailStock.specification || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">重量(kg)</span>
                  <span class="detail-value weight">{{ Number(detailStock.weight).toFixed(3) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">片数</span>
                  <span class="detail-value">{{ detailStock.pieceCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">存放位置</span>
                  <span class="detail-value">{{ detailStock.location || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">镍含量</span>
                  <span class="detail-value">{{ detailStock.nickelContent ? Number(detailStock.nickelContent).toFixed(2) + '%' : '-' }}</span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">备注</span>
                  <span class="detail-value">{{ detailStock.remark || '-' }}</span>
                </div>
              </div>

              <!-- 关联订单 -->
              <div v-if="detailStock.linkedOrders && detailStock.linkedOrders.length" class="linked-section">
                <h4>关联配货单 ({{ detailStock.linkedOrders.length }})</h4>
                <div class="linked-list">
                  <div v-for="order in detailStock.linkedOrders" :key="order.id" class="linked-card" @click="goToOrder(order.id)">
                    <div class="linked-info">
                      <span class="linked-order-no">{{ order.orderNo || `#${order.id}` }}</span>
                      <span :class="['tag', orderStatusTagClass[order.status]]">{{ orderStatusLabel[order.status] || order.status }}</span>
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
              <button class="btn-pill btn-ghost" @click="detailVisible = false">关闭</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

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
                  <select v-model="form.specification" class="form-select">
                    <option value="">请选择规格</option>
                    <option value="整板">整板</option>
                    <option value="镍条">镍条</option>
                    <option value="100*100">100*100</option>
                    <option value="50*50">50*50</option>
                    <option value="25*25">25*25</option>
                  </select>
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
                  <label>重量(kg) *</label>
                  <input v-model.number="form.weight" type="number" step="0.001" min="0" placeholder="0.000" />
                </div>
                <div class="form-item">
                  <label>片数 *</label>
                  <input v-model.number="form.pieceCount" type="number" min="0" placeholder="0" />
                </div>
                <div class="form-item full-width">
                  <label>存放位置</label>
                  <div class="location-select-wrap">
                    <select v-model="locationPreset" class="form-select" @change="onLocationPresetChange">
                      <option value="">自定义位置</option>
                      <option value="三厂区">三厂区</option>
                      <option value="二厂区">二厂区</option>
                    </select>
                    <input
                      v-model="form.location"
                      type="text"
                      placeholder="输入或选择位置"
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
import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { getInventoryById, searchInventory } from '@/api/distribution'
import { ElMessageBox } from 'element-plus'
import { getRecentSearches, addSearch, clearSearches } from '@/utils/searchHistory'
import type { InventoryStock, CreateInventoryDto } from '@/types'

const router = useRouter()
const inventoryStore = useInventoryStore()
const showToast = inject('showToast') as (message: string, type?: string) => void

const dateInputRef = ref<HTMLInputElement | null>(null)
const focusDateInput = () => dateInputRef.value?.showPicker?.()

const searchWrapRef = ref<HTMLElement | null>(null)
const searchInput = ref('')
const showSuggestions = ref(false)
const recentSearches = ref<string[]>([])
const suggestionResults = ref<InventoryStock[]>([])
let suggestionTimer: ReturnType<typeof setTimeout> | null = null
let blurTimer: ReturnType<typeof setTimeout> | null = null

const queryForm = reactive({
  page: 1,
  limit: 20,
  keyword: '',
  grade: '',
  productType: '',
  specification: '',
  status: 'available',
  dateFrom: '',
})

const detailVisible = ref(false)
const detailStock = ref<InventoryStock | null>(null)

// 订单状态映射
const orderStatusTagClass: Record<string, string> = {
  draft: 'tag-default',
  shipping: 'tag-info',
  shipped: 'tag-success',
  cancelled: 'tag-danger',
}
const orderStatusLabel: Record<string, string> = {
  draft: '草稿',
  shipping: '发货中',
  shipped: '已发货',
  cancelled: '已取消',
}

const handleViewDetail = async (row: InventoryStock) => {
  try {
    const res = await getInventoryById(row.id) as InventoryStock
    detailStock.value = res
    detailVisible.value = true
  } catch {
    showToast?.('获取详情失败', 'danger')
  }
}

const goToOrder = (orderId: number) => {
  detailVisible.value = false
  router.push({ path: '/orders', query: { highlight: String(orderId) } })
}

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

const locationPreset = ref('')
const onLocationPresetChange = () => {
  if (locationPreset.value) {
    form.location = locationPreset.value
  }
}

const statusTagClass: Record<string, string> = {
  available: 'tag-success',
  reserved: 'tag-warning',
  shipped: 'tag-default',
  issued: 'tag-info',
}

const statusLabel: Record<string, string> = {
  available: '可用',
  reserved: '已预留',
  shipped: '已发货',
  issued: '已发出',
}

const totalPages = computed(() => Math.ceil(inventoryStore.total / queryForm.limit))

const totalWeight = computed(() =>
  inventoryStore.inventoryList.reduce((sum, r) => sum + Number(r.weight), 0).toFixed(3)
)
const totalPieces = computed(() =>
  inventoryStore.inventoryList.reduce((sum, r) => sum + (r.pieceCount || 0), 0)
)

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
    productType: queryForm.productType || undefined,
    specification: queryForm.specification || undefined,
    status: queryForm.status || undefined,
    dateFrom: queryForm.dateFrom || undefined,
  })
}

const handleReset = () => {
  queryForm.keyword = ''
  queryForm.grade = ''
  queryForm.productType = ''
  queryForm.specification = ''
  queryForm.status = 'available'
  queryForm.dateFrom = ''
  queryForm.page = 1
  searchInput.value = ''
  handleSearch()
}

// 筛选项热更新：切换后自动搜索
const handleFilterChange = () => {
  queryForm.page = 1
  handleSearch()
}

const clearSearch = () => {
  searchInput.value = ''
  queryForm.keyword = ''
  suggestionResults.value = []
  handleSearch()
}

const onSearchInput = () => {
  showSuggestions.value = true
  if (suggestionTimer) clearTimeout(suggestionTimer)
  suggestionTimer = setTimeout(async () => {
    queryForm.keyword = searchInput.value
    doSearch()
    if (searchInput.value.trim()) {
      try {
        const results = await searchInventory(searchInput.value, 8) as InventoryStock[]
        suggestionResults.value = results
      } catch {
        suggestionResults.value = []
      }
    } else {
      suggestionResults.value = []
    }
  }, 300)
}

const doSearch = () => {
  queryForm.keyword = searchInput.value
  if (searchInput.value.trim()) {
    addSearch(searchInput.value.trim())
  }
  queryForm.page = 1
  handleSearch()
  showSuggestions.value = false
  suggestionResults.value = []
}

const onSearchFocus = () => {
  showSuggestions.value = true
  recentSearches.value = getRecentSearches()
}

const onSearchBlur = () => {
  blurTimer = setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const selectSuggestion = (value: string) => {
  if (blurTimer) clearTimeout(blurTimer)
  searchInput.value = value
  queryForm.keyword = value
  addSearch(value)
  queryForm.page = 1
  handleSearch()
  showSuggestions.value = false
  suggestionResults.value = []
}

const handleClearHistory = () => {
  clearSearches()
  recentSearches.value = getRecentSearches()
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
  locationPreset.value = ''
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
  locationPreset.value = ['三厂区', '二厂区'].includes(row.location || '') ? row.location! : ''
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

  // 键盘快捷键: / 聚焦搜索, ESC 关闭建议
  const handleGlobalKeydown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    // 不在输入框中才触发
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      searchWrapRef.value?.querySelector('input')?.focus()
    }
  }
  document.addEventListener('keydown', handleGlobalKeydown)
  onUnmounted(() => document.removeEventListener('keydown', handleGlobalKeydown))
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

.search-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 320px;
  overflow-y: auto;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.suggestions-section {
  padding: 8px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--color-divider);
  }
}

.suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 14px 6px;
}

.suggestions-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.clear-history {
  font-size: 11px;
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
  }

  span {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }
}

.suggestion-batch {
  font-weight: 500;
  font-family: var(--font-mono);
  color: var(--color-primary) !important;
}

.suggestion-meta {
  font-size: var(--font-size-xs) !important;
  color: var(--color-text-tertiary) !important;
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
  appearance: none;
  -webkit-appearance: none;
  padding-right: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px;
  cursor: pointer;
}

.date-picker-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 130px;
}
.date-picker-wrap .date-placeholder {
  position: absolute;
  left: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  pointer-events: auto;
  transition: all var(--transition-fast);
  user-select: none;
  z-index: 2;
}
.date-picker-wrap .date-placeholder:hover {
  border-color: var(--color-primary);
}
.date-picker-wrap .filter-date {
  min-width: 130px;
  font-size: var(--font-size-sm);
  padding-left: 10px;
  padding-right: 10px;
  width: 100%;
  z-index: 1;
  position: relative;
}

.action-section {
  display: flex;
  gap: var(--spacing-sm);
}

// ==================== 表格 ====================
.table-card {
  overflow: hidden;

  .data-table {
    min-width: 960px;
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

  .batch-no {
    font-weight: 500;
    font-family: var(--font-mono);
  }

  .weight {
    font-family: var(--font-mono);
  }

  .time {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .action-col {
    width: 180px;
  }

  .summary-row {
    background: var(--color-bg-tertiary);
    font-weight: 600;

    .summary-label {
      text-align: right;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .weight {
      font-family: var(--font-mono);
      color: var(--color-primary);
    }
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

// 详情弹窗
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
