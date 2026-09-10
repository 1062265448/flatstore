<template>
  <div class="page-container ai-page">
    <!-- 页面标题 -->
    <div class="page-header fade-in">
      <h1 class="page-title">票据识别</h1>
      <p class="page-subtitle">上传图片自动识别库存信息</p>
    </div>

    <div class="ai-grid">
      <!-- 上传识别区 -->
      <div class="upload-section glass-card fade-in" :style="{ animationDelay: '0.1s' }">
        <div class="section-header">
          <h3>票据识别</h3>
          <div class="ocr-indicator">
            <span class="ocr-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 3H5A2 2 0 003 5V19A2 2 0 005 21H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M15 3H19A2 2 0 0121 5V19A2 2 0 0119 21H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              OCR 本地识别
            </span>
          </div>
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
            v-if="!uploading"
            class="btn-pill btn-primary"
            :disabled="!selectedFile"
            @click="handleRecognize"
          >
            开始识别
          </button>
          <button
            v-else
            class="btn-pill btn-danger"
            @click="handleCancelRecognize"
          >
            <span class="btn-spinner"></span>
            取消识别
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
              <span class="results-count">{{ recognizeResults.length }} 条记录 · {{ recognizeTotalWeight }} kg<template v-if="recognizeTotalPieces > 0"> / {{ recognizeTotalPieces }} 块</template></span>
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
                    <th>规格</th>
                    <th>产品类型</th>
                    <th>片数</th>
                    <th>净重(kg)</th>
                    <th>日期</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in recognizeResults" :key="index" :class="{ 'weight-warning': isWeightAbnormal(item) }">
                    <td>{{ item.packageNo || '-' }}</td>
                    <td class="batch-no">{{ item.batchNo || '-' }}</td>
                    <td><span class="tag tag-info">{{ item.grade || '-' }}</span></td>
                    <td>{{ item.specification || '-' }}</td>
                    <td>{{ item.productType || '-' }}</td>
                    <td>{{ item.pieceCount || '-' }}</td>
                    <td class="weight">{{ (item.netWeight || 0).toFixed(1) }}</td>
                    <td>{{ item.date || '-' }}</td>
                  </tr>
                </tbody>
                <tfoot v-if="recognizeResults.length">
                  <tr class="summary-row">
                    <td colspan="6" class="summary-label">合计</td>
                    <td class="weight">{{ recognizeTotalWeight }} kg</td>
                    <td v-if="recognizeTotalPieces > 0">{{ recognizeTotalPieces }}块</td>
                    <td v-else>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="result-actions">
              <button class="btn-pill btn-primary" @click="openImportDialog">
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
    <AiImportDialog
      v-model="importVisible"
      :results="recognizeResults"
      :history-id="currentHistoryId"
      :source-image="importSourceImage"
      @imported="onImported"
    />

    <!-- 历史详情弹窗 -->
    <AiHistoryDetailDialog
      v-model="historyDetailVisible"
      :history="currentHistory"
      @import="onImportFromHistory"
    />

    <!-- 图片预览 -->
    <ImagePreviewDialog v-model="imagePreviewVisible" :url="previewImageUrl" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { aiRecognize, getRecognitionHistory, deleteRecognitionHistory, batchDeleteRecognitionHistory } from '@/api/distribution'
import { isRangePackageNo } from '@/utils/stock'
import AiImportDialog from '@/components/ai/AiImportDialog.vue'
import AiHistoryDetailDialog from '@/components/ai/AiHistoryDetailDialog.vue'
import ImagePreviewDialog from '@/components/ai/ImagePreviewDialog.vue'
import type { OcrRecognizeResult, OcrRecognitionHistory } from '@/types'

const showToast = inject('showToast') as (message: string, type?: string) => void

const uploadRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string>('')
const uploading = ref(false)
const abortController = ref<AbortController | null>(null)
const isDragOver = ref(false)
const recognizeResults = ref<OcrRecognizeResult[]>([])
const currentHistoryId = ref<number | null>(null)

const historyList = ref<OcrRecognitionHistory[]>([])
const historyTotal = ref(0)
const historyLoading = ref(false)
const selectedHistory = ref<OcrRecognitionHistory[]>([])
const historyQuery = reactive({
  page: 1,
  limit: 10,
  status: '',
})

const importVisible = ref(false)
const importSourceImage = ref('')

const historyDetailVisible = ref(false)
const currentHistory = ref<OcrRecognitionHistory | null>(null)

const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')

const totalHistoryPages = computed(() => Math.ceil(historyTotal.value / historyQuery.limit))

const recognizeTotalWeight = computed(() =>
  recognizeResults.value.reduce((sum, r) => sum + (r.netWeight || 0), 0).toFixed(1)
)
const recognizeTotalPieces = computed(() => {
  if (recognizeResults.value.some(r => isRangePackageNo(r.packageNo))) return 0
  return recognizeResults.value.reduce((sum, r) => sum + (r.pieceCount || 0), 0)
})

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

const handleCancelRecognize = () => {
  abortController.value?.abort()
}

const handleReset = () => {
  handleRemove()
  recognizeResults.value = []
}

const recognizeWarnings = ref<string[]>([])

const isWeightAbnormal = (item: OcrRecognizeResult): boolean => {
  const w = item.netWeight || 0
  if (isRangePackageNo(item.packageNo)) return w <= 0 || w > 5000
  return w < 1000 || w > 2500
}

const handleRecognize = async () => {
  if (!selectedFile.value) {
    showToast?.('请先上传图片', 'warning')
    return
  }

  uploading.value = true
  const ctrl = new AbortController()
  abortController.value = ctrl
  try {
    const res = await aiRecognize(selectedFile.value, ctrl.signal)
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
  } catch (err: any) {
    if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
      showToast?.('识别已取消', 'warning')
    }
  } finally {
    uploading.value = false
    abortController.value = null
  }
}

// 打开导入弹窗（来自新识别结果）
const openImportDialog = () => {
  importSourceImage.value = historyList.value.find(h => h.id === currentHistoryId.value)?.imageUrl || ''
  importVisible.value = true
}

// 从历史详情导入
const onImportFromHistory = (results: OcrRecognizeResult[], history: OcrRecognitionHistory) => {
  recognizeResults.value = results
  currentHistoryId.value = history.id
  importSourceImage.value = history.imageUrl || ''
  importVisible.value = true
}

// 导入成功
const onImported = (count: number) => {
  showToast?.(`成功导入 ${count} 条库存记录，即将跳转至库存页`, 'success')
  handleReset()
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
    historyList.value = (res as any).data.map((item: OcrRecognitionHistory) => ({
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

const handleViewHistory = (row: OcrRecognitionHistory) => {
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

.ocr-indicator {
  display: flex;
  align-items: center;
}

.ocr-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  font-size: var(--font-size-xs);
  font-weight: 600;
  border: 1px solid rgba(16, 185, 129, 0.25);
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

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: background var(--transition-normal), border-color var(--transition-normal);
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
  transition: background var(--transition-normal), border-color var(--transition-normal);
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
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: var(--glass-shadow);

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

tr.weight-warning td {
  background: rgba(255, 149, 0, 0.1);
  color: #c77c00;
  font-weight: 600;
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
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { opacity: 1; }
  to { opacity: 0; }
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
  transition: background var(--transition-normal), border-color var(--transition-normal);
  animation: fadeIn 0.4s ease forwards;
  opacity: 0;

  &:hover {
    background: var(--color-bg-hover);
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

// fadeIn 动画
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// ==================== 响应式 ====================
@media (max-width: 1024px) {
  .ai-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
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
