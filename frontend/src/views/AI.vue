<template>
  <div class="page-container ai-page">
    <!-- 页面标题 -->
    <div class="page-header fade-in">
      <h1 class="page-title">AI 图像识别</h1>
      <p class="page-subtitle">上传图片自动识别库存信息</p>
    </div>

    <div class="ai-grid">
      <!-- 上传识别区 -->
      <div class="upload-section glass-card fade-in" :style="{ animationDelay: '0.1s' }">
        <div class="section-header">
          <h3>图像识别</h3>
        </div>

        <div
          class="upload-area"
          :class="{ 'has-image': previewUrl, 'drag-over': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
          @click="triggerUpload"
        >
          <input
            ref="uploadRef"
            type="file"
            accept="image/*"
            hidden
            @change="handleFileChange"
          />

          <div v-if="!previewUrl" class="upload-placeholder">
            <div class="upload-icon-wrap">
              <svg class="upload-icon-svg" width="64" height="64" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="upload-text">拖拽图片到此处或点击上传</span>
            <span class="upload-hint">支持 JPG、PNG、GIF、WebP 格式，最大 10MB</span>
          </div>

          <div v-else class="preview-container">
            <img :src="previewUrl" alt="预览图片" class="preview-image" />
            <div class="preview-overlay">
              <button class="preview-btn" @click.stop="triggerUpload">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4A2 2 0 004 6V20A2 2 0 0018 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18.5 2.5A2.12 2.12 0 0121 4.5V8L12 17L3 8V4.5A2.12 2.12 0 014.5 2.5H8L12 6.5L16 2.5H18.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="preview-btn danger" @click.stop="handleRemove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M19 6V20A2 2 0 01 17 22H7A2 2 0 015 20V6M8 6V4A2 2 0 0110 2H14A2 2 0 0116 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button
            class="btn-pill btn-primary"
            :class="{ loading: uploading }"
            :disabled="!selectedFile || uploading"
            @click="handleRecognize"
          >
            <span v-if="uploading" class="btn-spinner"></span>
            {{ uploading ? '识别中...' : '开始识别' }}
          </button>
          <button class="btn-pill btn-ghost" @click="handleReset">重置</button>
        </div>

        <!-- 识别结果 -->
        <transition name="slide">
          <div v-if="recognizeResults.length" class="results-section">
            <div class="results-header">
              <h4>
                <span class="result-icon">✓</span>
                识别结果
              </h4>
              <span class="results-count">{{ recognizeResults.length }} 条记录 · {{ recognizeTotalWeight }} kg / {{ recognizeTotalPieces }} 块</span>
            </div>

            <div v-if="recognizeWarnings.length" class="validation-warnings">
              <div v-for="(w, i) in recognizeWarnings" :key="i" class="warning-item">{{ w }}</div>
            </div>

            <div class="results-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>包号</th>
                    <th>批号</th>
                    <th>品级</th>
                    <th>产品类型</th>
                    <th>片数</th>
                    <th>净重(kg)</th>
                    <th>日期</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in recognizeResults" :key="index">
                    <td>{{ item.packageNo || '-' }}</td>
                    <td class="batch-no">{{ item.batchNo || '-' }}</td>
                    <td><span class="tag tag-info">{{ item.grade || '-' }}</span></td>
                    <td>{{ item.productType || '-' }}</td>
                    <td>{{ item.pieceCount || '-' }}</td>
                    <td class="weight">{{ (item.netWeight || 0).toFixed(1) }}</td>
                    <td>{{ item.date || '-' }}</td>
                  </tr>
                </tbody>
                <tfoot v-if="recognizeResults.length">
                  <tr class="summary-row">
                    <td colspan="5" class="summary-label">合计</td>
                    <td class="weight">{{ recognizeTotalWeight }} kg</td>
                    <td>{{ recognizeTotalPieces }}块</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="result-actions">
              <button class="btn-pill btn-primary" @click="handleBatchCreate">
                <span class="btn-icon">+</span> 批量导入库存
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- 识别历史 -->
      <div class="history-section glass-card fade-in" :style="{ animationDelay: '0.2s' }">
        <div class="section-header">
          <h3>识别历史</h3>
          <button
            v-if="selectedHistory.length"
            class="btn-pill btn-pill-sm btn-danger"
            @click="handleBatchDeleteHistory"
          >
            批量删除 ({{ selectedHistory.length }})
          </button>
        </div>

        <!-- 筛选 -->
        <div class="filter-bar">
          <select v-model="historyQuery.status" class="filter-select" @change="fetchHistory">
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
        </div>

        <div v-if="historyLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else class="history-list">
          <div
            v-for="(row, index) in historyList"
            :key="row.id"
            class="history-item"
            :style="{ animationDelay: `${0.3 + index * 0.05}s` }"
          >
            <div class="history-thumb-wrap" @click="previewImage(row.imageUrl)">
              <img v-if="row.imageUrl" :src="row.imageUrl" class="history-thumb" />
              <span v-else class="history-thumb-placeholder">📷</span>
            </div>
            <div class="history-info">
              <div class="history-meta">
                <span :class="['tag', row.status === 'success' ? 'tag-success' : 'tag-danger']">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </span>
                <span class="history-count">{{ row.itemCount }} 条</span>
              </div>
              <div class="history-detail">
                <span v-if="row.batchNo">批号: {{ row.batchNo }}</span>
                <span v-if="row.grade">品级: {{ row.grade }}</span>
              </div>
              <div class="history-time">{{ formatDate(row.createdAt) }}</div>
            </div>
            <div class="history-actions">
              <button class="action-btn" @click="handleViewHistory(row)">查看</button>
              <button class="action-btn danger" @click="handleDeleteHistory(row.id)">删除</button>
            </div>
          </div>

          <div v-if="!historyList.length" class="empty-state">
            <span class="empty-icon">📋</span>
            <span class="empty-text">暂无识别历史</span>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="historyTotal > 0" class="pagination">
          <span class="pagination-info">共 {{ historyTotal }} 条记录</span>
          <div class="pagination-controls">
            <button
              class="btn-pill btn-pill-sm btn-ghost"
              :disabled="historyQuery.page <= 1"
              @click="goToHistoryPage(historyQuery.page - 1)"
            >上一页</button>
            <span class="page-indicator">{{ historyQuery.page }}</span>
            <button
              class="btn-pill btn-pill-sm btn-ghost"
              :disabled="historyQuery.page >= totalHistoryPages"
              @click="goToHistoryPage(historyQuery.page + 1)"
            >下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="importVisible" class="modal-overlay" @click.self="importVisible = false">
          <div class="modal-content modal-lg glass-card">
            <div class="modal-header">
              <h3 class="modal-title">批量导入库存</h3>
              <button class="modal-close" @click="importVisible = false">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-grid">
                <div class="form-item">
                  <label>统一批号</label>
                  <input v-model="importForm.batchNo" type="text" placeholder="为空则使用识别结果中的批号" />
                </div>
                <div class="form-item">
                  <label>统一品级</label>
                  <input v-model="importForm.grade" type="text" placeholder="为空则使用识别结果中的品级" />
                </div>
                <div class="form-item">
                  <label>规格</label>
                  <div class="chip-select">
                    <button
                      v-for="opt in specOptions"
                      :key="opt.value"
                      :class="['chip', { active: importForm.specification === opt.value }]"
                      @click="importForm.specification = importForm.specification === opt.value ? '' : opt.value"
                    >
                      <span class="chip-icon">{{ opt.icon }}</span>
                      <span class="chip-label">{{ opt.label }}</span>
                    </button>
                  </div>
                </div>
                <div class="form-item">
                  <label>存放位置</label>
                  <div class="chip-select">
                    <button
                      v-for="opt in locationOptions"
                      :key="opt.value"
                      :class="['chip chip-location', { active: importForm.location === opt.value }]"
                      @click="importForm.location = importForm.location === opt.value ? '' : opt.value"
                    >
                      <span class="chip-dot" :style="{ background: opt.color }"></span>
                      <span class="chip-label">{{ opt.label }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="preview-table">
                <h4>导入预览</h4>
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>批号</th>
                      <th>品级</th>
                      <th>规格</th>
                      <th>产品类型</th>
                      <th>片数</th>
                      <th>净重(kg)</th>
                      <th>存放位置</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in recognizeResults" :key="index">
                      <td>{{ importForm.batchNo || item.batchNo || '-' }}</td>
                      <td>{{ importForm.grade || item.grade || '-' }}</td>
                      <td>{{ importForm.specification || '-' }}</td>
                      <td>{{ item.productType || '-' }}</td>
                      <td>{{ item.pieceCount || '-' }}</td>
                      <td>{{ (item.netWeight || 0).toFixed(1) }}</td>
                      <td>{{ importForm.location || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-pill btn-ghost" @click="importVisible = false">取消</button>
              <button class="btn-pill btn-primary" :disabled="importing" @click="handleImportSubmit">
                {{ importing ? '导入中...' : '确认导入' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 历史详情弹窗 -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="historyDetailVisible" class="modal-overlay" @click.self="historyDetailVisible = false">
          <div class="modal-content modal-lg glass-card">
            <div class="modal-header">
              <h3 class="modal-title">识别详情</h3>
              <button class="modal-close" @click="historyDetailVisible = false">✕</button>
            </div>

            <div class="modal-body" v-if="currentHistory">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">ID</span>
                  <span class="detail-value">{{ currentHistory.id }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">状态</span>
                  <span :class="['tag', currentHistory.status === 'success' ? 'tag-success' : 'tag-danger']">
                    {{ currentHistory.status === 'success' ? '成功' : '失败' }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">识别数量</span>
                  <span class="detail-value">{{ currentHistory.itemCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">批号</span>
                  <span class="detail-value">{{ currentHistory.batchNo || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">品级</span>
                  <span class="detail-value">{{ currentHistory.grade || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">识别时间</span>
                  <span class="detail-value">{{ formatDate(currentHistory.createdAt) }}</span>
                </div>
                <div v-if="currentHistory.errorMessage" class="detail-item full-width">
                  <span class="detail-label">错误信息</span>
                  <span class="detail-value text-danger">{{ currentHistory.errorMessage }}</span>
                </div>
              </div>

              <div v-if="parsedResults.length" class="result-section">
                <h4>识别结果</h4>
                <div class="results-table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>包号</th>
                        <th>批号</th>
                        <th>品级</th>
                        <th>产品类型</th>
                        <th>片数</th>
                        <th>净重(kg)</th>
                        <th>日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, i) in parsedResults" :key="i">
                        <td>{{ item.packageNo || '-' }}</td>
                        <td class="batch-no">{{ item.batchNo || '-' }}</td>
                        <td><span class="tag tag-info">{{ item.grade || '-' }}</span></td>
                        <td>{{ item.productType || '-' }}</td>
                        <td>{{ item.pieceCount || '-' }}</td>
                        <td class="weight">{{ (item.netWeight || 0).toFixed(1) }}</td>
                        <td>{{ item.date || '-' }}</td>
                      </tr>
                    </tbody>
                    <tfoot v-if="parsedResults.length">
                      <tr class="summary-row">
                        <td colspan="5" class="summary-label">合计</td>
                        <td class="weight">{{ parsedTotalWeight }} kg</td>
                        <td>{{ parsedTotalPieces }}块</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div v-if="currentHistory.imageUrl" class="image-section">
                <h4>原始图片</h4>
                <img :src="currentHistory.imageUrl" class="detail-image" />
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-pill btn-ghost" @click="historyDetailVisible = false">关闭</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 图片预览 -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="imagePreviewVisible" class="image-preview-overlay" @click="imagePreviewVisible = false">
          <img :src="previewImageUrl" class="image-preview" />
          <button class="preview-close">✕</button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { aiRecognize, batchCreateInventory, getRecognitionHistory, deleteRecognitionHistory, batchDeleteRecognitionHistory } from '@/api/distribution'
import type { AiRecognizeResult, AiRecognitionHistory, CreateInventoryDto } from '@/types'

const showToast = inject('showToast') as (message: string, type?: string) => void

const uploadRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string>('')
const uploading = ref(false)
const isDragOver = ref(false)
const recognizeResults = ref<AiRecognizeResult[]>([])
const currentHistoryId = ref<number | null>(null)

const historyList = ref<AiRecognitionHistory[]>([])
const historyTotal = ref(0)
const historyLoading = ref(false)
const selectedHistory = ref<AiRecognitionHistory[]>([])
const historyQuery = reactive({
  page: 1,
  limit: 10,
  status: '',
})

const importVisible = ref(false)
const importing = ref(false)
const importForm = reactive({
  batchNo: '',
  grade: '',
  specification: '',
  location: '',
})

const specOptions = [
  { value: '整板', label: '整板', icon: '▣' },
  { value: '镍条', label: '镍条', icon: '▬' },
  { value: '100×100', label: '100×100', icon: '⊞' },
  { value: '50×50', label: '50×50', icon: '⊟' },
  { value: '25×25', label: '25×25', icon: '▪' },
]

const locationOptions = [
  { value: '二厂区', label: '二厂区', color: '#3b82f6' },
  { value: '三厂区', label: '三厂区', color: '#10b981' },
]

const historyDetailVisible = ref(false)
const currentHistory = ref<AiRecognitionHistory | null>(null)

const parsedResults = computed(() => {
  if (!currentHistory.value?.result) return []
  try {
    const raw = typeof currentHistory.value.result === 'string'
      ? JSON.parse(currentHistory.value.result)
      : currentHistory.value.result
    // 统一产品类型名称
    return (Array.isArray(raw) ? raw : []).map((item: any) => ({
      ...item,
      productType: item.productType === '电积镍板' ? '电积镍' : (item.productType || ''),
    }))
  } catch {
    return []
  }
})

const recognizeTotalWeight = computed(() =>
  recognizeResults.value.reduce((sum, r) => sum + (r.netWeight || 0), 0).toFixed(1)
)
const recognizeTotalPieces = computed(() =>
  recognizeResults.value.reduce((sum, r) => sum + (r.pieceCount || 0), 0)
)
const parsedTotalWeight = computed(() =>
  parsedResults.value.reduce((sum, r: any) => sum + (r.netWeight || 0), 0).toFixed(1)
)
const parsedTotalPieces = computed(() =>
  parsedResults.value.reduce((sum, r: any) => sum + (r.pieceCount || 0), 0)
)

const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const totalHistoryPages = computed(() => Math.ceil(historyTotal.value / historyQuery.limit))


const triggerUpload = () => {
  uploadRef.value?.click()
}

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

const processFile = (file: File) => {
  if (file.size > 10 * 1024 * 1024) {
    showToast?.('文件大小不能超过 10MB', 'warning')
    return
  }
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  recognizeResults.value = []
}

const handleRemove = () => {
  selectedFile.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  if (uploadRef.value) {
    uploadRef.value.value = ''
  }
}

const handleReset = () => {
  handleRemove()
  recognizeResults.value = []
}

const recognizeWarnings = ref<string[]>([])

const handleRecognize = async () => {
  if (!selectedFile.value) {
    showToast?.('请先上传图片', 'warning')
    return
  }

  uploading.value = true
  try {
    const res = await aiRecognize(selectedFile.value)
    recognizeResults.value = (res as any).results || res as any
    currentHistoryId.value = (res as any).historyId || null
    recognizeWarnings.value = (res as any).warnings || []
    if (!recognizeResults.value.length) {
      showToast?.('未识别到任何数据', 'warning')
    } else {
      showToast?.(`成功识别 ${recognizeResults.value.length} 条记录`, 'success')
    }
    if (recognizeWarnings.value.length) {
      showToast?.(`数据校验：${recognizeWarnings.value.join('；')}`, 'warning')
    }
    fetchHistory()
  } catch {
    // 错误已在 API 层处理
  } finally {
    uploading.value = false
  }
}

const handleBatchCreate = () => {
  importForm.batchNo = ''
  importForm.grade = ''
  importForm.specification = ''
  importForm.location = ''
  importVisible.value = true
}

const handleImportSubmit = async () => {
  if (!recognizeResults.value.length) return

  importing.value = true
  try {
    const items: CreateInventoryDto[] = recognizeResults.value.map((r) => ({
      batchNo: importForm.batchNo || String(r.batchNo || ''),
      grade: importForm.grade || r.grade || '',
      specification: importForm.specification || '',
      productType: r.productType || '',
      weight: (r.netWeight || 0) as number,
      pieceCount: r.pieceCount || 0,
      location: importForm.location,
      sourceType: 'ai_recognize',
    }))

    await batchCreateInventory({ items, recognitionHistoryId: currentHistoryId.value || undefined })
    showToast?.(`成功导入 ${items.length} 条库存记录，即将跳转至库存页`, 'success')
    importVisible.value = false
    handleReset()
  } catch {
    // 错误已在 API 层处理
  } finally {
    importing.value = false
  }
}

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    const res = await getRecognitionHistory({
      page: historyQuery.page,
      limit: historyQuery.limit,
      status: historyQuery.status || undefined,
    })
    // 拼接完整的图片 URL（uploads 不在 api 路径下，直接用根路径）
    const imageBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002').replace(/\/api$/, '')
    historyList.value = (res as any).data.map((item: AiRecognitionHistory) => ({
      ...item,
      imageUrl: item.imageUrl ? `${imageBase}${item.imageUrl}` : '',
    }))
    historyTotal.value = (res as any).total
  } finally {
    historyLoading.value = false
  }
}

const goToHistoryPage = (page: number) => {
  historyQuery.page = page
  fetchHistory()
}



const handleViewHistory = (row: AiRecognitionHistory) => {
  currentHistory.value = row
  historyDetailVisible.value = true
}

const handleDeleteHistory = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条识别记录吗？', '提示', { type: 'warning' })
    await deleteRecognitionHistory(id)
    showToast?.('删除成功', 'success')
    fetchHistory()
  } catch {
    // 用户取消或 API 错误
  }
}

const handleBatchDeleteHistory = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedHistory.value.length} 条记录吗？`, '提示', { type: 'warning' })
    const ids = selectedHistory.value.map((r) => r.id)
    await batchDeleteRecognitionHistory(ids)
    showToast?.('批量删除成功', 'success')
    selectedHistory.value = []
    fetchHistory()
  } catch {
    // 用户取消或 API 错误
  }
}

const previewImage = (url: string) => {
  previewImageUrl.value = url
  imagePreviewVisible.value = true
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchHistory()
})
</script>

<style scoped lang="scss">
.ai-page {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-2xl);
}

// ==================== 布局 ====================
.ai-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

// ==================== 上传区 ====================
.upload-section,
.history-section {
  padding: var(--spacing-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);

  h3 {
    font-size: var(--font-size-xl);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
}

.section-icon {
  font-size: 20px;
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  background: var(--color-bg-tertiary);
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-bg-hover);
  }

  &.has-image {
    padding: 0;
    border-style: solid;
    background: transparent;
    min-height: auto;
  }

  &.drag-over {
    border-color: var(--color-primary);
    background: rgba(0, 113, 227, 0.05);
    transform: scale(1.01);
  }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.upload-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
  transition: all var(--transition-normal);
  box-shadow: var(--glass-shadow);

  .upload-area:hover & {
    transform: scale(1.05);
    background: var(--color-bg-hover);
  }
}

.upload-icon-svg {
  color: var(--color-primary);
}

.upload-text {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  font-weight: 500;
}

.upload-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.preview-container {
  position: relative;
  display: flex;
  justify-content: center;
  padding: var(--spacing-md);
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.preview-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: var(--spacing-sm);
  opacity: 0;
  transition: opacity var(--transition-normal);

  .preview-container:hover & {
    opacity: 1;
  }
}

.preview-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg);
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  box-shadow: var(--glass-shadow);

  &:hover {
    transform: scale(1.1);
    background: var(--color-bg-hover);
  }

  &.danger:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

// 按钮加载动画
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  margin-right: var(--spacing-xs);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ==================== 识别结果 ====================
.results-section {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);

  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
}

.result-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-success);
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.results-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.results-table-wrap {
  max-height: 300px;
  overflow-y: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);

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

.validation-warnings {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 149, 0, 0.08);
  border: 1px solid rgba(255, 149, 0, 0.2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: #c77c00;

  .warning-item::before {
    content: '⚠ ';
  }
}

.result-actions {
  margin-top: var(--spacing-lg);
  text-align: center;
}

// Slide 过渡动画
.slide-enter-active {
  animation: slideUp 0.4s ease forwards;
}

.slide-leave-active {
  animation: slideDown 0.3s ease forwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}

// ==================== 历史区 ====================
.filter-bar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.filter-select {
  flex: 1;
  appearance: none;
  -webkit-appearance: none;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
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

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
  animation: fadeIn 0.4s ease forwards;
  opacity: 0;

  &:hover {
    background: var(--color-bg-hover);
    transform: translateX(4px);
  }
}

.history-thumb-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
}

.history-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-normal);

  &:hover {
    transform: scale(1.1);
  }
}

.history-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  color: var(--color-text-tertiary);
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 2px;
}

.history-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.history-detail {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  display: flex;
  gap: var(--spacing-sm);

  span {
    &::after {
      content: '|';
      margin-left: var(--spacing-sm);
      color: var(--color-border);
    }

    &:last-child::after {
      display: none;
    }
  }
}

.history-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.history-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

// ==================== 表格 ====================
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);

  th, td {
    padding: 10px 12px;
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
    position: sticky;
    top: 0;
  }

  .batch-no {
    font-weight: 500;
    font-family: monospace;
  }

  .weight {
    font-family: monospace;
    color: var(--color-text-primary);
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
  padding: 40px !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-2xl);

  .empty-text {
    color: var(--color-text-secondary);
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

// ==================== 分页 ====================
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-divider);
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
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
    max-width: 700px;
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
  margin-bottom: var(--spacing-lg);
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

  input {
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
}

/* Chip selector（规格/存放位置） */
.chip-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-family: inherit;
  transition: all var(--transition-fast);
  user-select: none;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(0, 113, 227, 0.04);
  }

  &.active {
    border-color: var(--color-primary);
    background: rgba(0, 113, 227, 0.08);
    color: var(--color-primary);
    font-weight: 600;
    box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.12);
  }

  .chip-icon {
    font-size: 16px;
    line-height: 1;
  }

  .chip-label {
    line-height: 1;
  }
}

.chip-location {
  &.active .chip-dot {
    box-shadow: 0 0 0 3px currentColor;
  }
}

.chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: box-shadow var(--transition-fast);
}

.preview-table {
  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
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

    &.text-danger {
      color: var(--color-danger);
    }
  }
}

.result-section,
.image-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);

  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
}

.json-preview {
  background: var(--color-bg-tertiary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  overflow-x: auto;
  max-height: 200px;
  font-family: monospace;
}

.detail-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: var(--radius-md);
}

// 图片预览
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.image-preview {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.preview-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
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

// fadeIn 动画
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// ==================== 响应式 ====================
@media (max-width: 1024px) {
  .ai-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
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

  .history-item {
    flex-wrap: wrap;
  }

  .history-info {
    width: calc(100% - 64px);
  }

  .history-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: var(--spacing-xs);
  }
}
</style>
