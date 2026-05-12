<template>
  <div class="ai-view">
    <div class="page-header">
      <div class="header-label">平面库配货</div>
      <h1 class="header-title">AI 识别</h1>
    </div>

    <div style="padding:0 20px 8px">
      <FilterPills :pills="timeFilters" v-model="selectedTime" />
    </div>

    <div class="ai-list">
      <div v-if="historyLoading" class="loading-state">
        <div class="spinner spinner-lg"></div>
      </div>
      <template v-else>
        <AiHistoryItem
          v-for="item in historyList"
          :key="item.id"
          :item="item"
          @click="viewHistoryDetail(item)"
        />
        <div v-if="!historyList.length" class="empty-hint">暂无识别记录</div>
      </template>
    </div>

    <!-- AI FAB -->
    <button class="ai-fab" @click="showSheet = true">AI</button>

    <!-- AI Bottom Sheet -->
    <BottomSheet :visible="showSheet" @close="closeSheet">
      <h2 class="sheet-title">AI 识别</h2>
      <p class="sheet-sub">拍照或选择图片，AI 将自动识别</p>

      <!-- 操作按钮 -->
      <div class="camera-actions">
        <button class="camera-btn" @click="takePhoto">
          <svg class="cam-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <span class="btn-text">拍照</span>
        </button>
        <button class="camera-btn" @click="pickFromAlbum">
          <svg class="cam-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span class="btn-text">相册</span>
        </button>
      </div>

      <!-- 预览 -->
      <div v-if="previewUrl" class="preview-area">
        <img :src="previewUrl" class="preview-img" />
        <button class="preview-remove" @click="handleRemove">✕</button>
      </div>

      <!-- 识别中 -->
      <div v-if="recognizing" class="recognizing">
        <div class="spinner"></div>
        <span>识别中...</span>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMessage" class="error-msg">
        <svg class="error-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span class="error-text">{{ errorMessage }}</span>
        <button class="error-retry" @click="handleRecognize">重试</button>
      </div>

      <!-- 识别结果列表 -->
      <div v-if="recognizeResults.length" class="results-list">
        <div class="result-header">
          <span class="result-count">识别到 {{ recognizeResults.length }} 条记录</span>
        </div>
        <div
          v-for="(item, index) in recognizeResults"
          :key="index"
          class="result-card"
        >
          <div class="result-card-top">
            <div class="result-index">#{{ index + 1 }}</div>
            <div class="result-batch">{{ item.batchNo || '-' }}</div>
            <span class="result-grade-tag">{{ item.grade }}</span>
          </div>
          <div class="result-card-body">
            <div class="result-row">
              <span class="row-label">包号</span>
              <span class="row-value">{{ item.packageNo || '-' }}</span>
            </div>
            <div class="result-row">
              <span class="row-label">产品类型</span>
              <span class="row-value">{{ item.productType || '-' }}</span>
            </div>
            <div class="result-row-group">
              <div class="result-row-inline">
                <span class="row-label">净重</span>
                <span class="row-value highlight">{{ item.netWeight ? item.netWeight.toFixed(3) + 't' : '-' }}</span>
              </div>
              <div class="result-row-inline">
                <span class="row-label">块数</span>
                <span class="row-value highlight">{{ item.pieceCount || '-' }}</span>
              </div>
            </div>
            <div v-if="item.inspector" class="result-row">
              <span class="row-label">检验员</span>
              <span class="row-value">{{ item.inspector }}</span>
            </div>
            <div v-if="item.date" class="result-row">
              <span class="row-label">日期</span>
              <span class="row-value">{{ item.date }}</span>
            </div>
          </div>
        </div>

        <!-- 导入设置 -->
        <div class="import-section">
          <div class="import-section-title">导入设置</div>
          <div class="import-fields">
            <div class="import-field">
              <label>规格</label>
              <select v-model="importForm.specification" class="import-select">
                <option v-for="opt in specOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="import-field">
              <label>存放位置</label>
              <select v-model="importForm.location" class="import-select">
                <option v-for="opt in locationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <button class="btn-import" :disabled="importing" @click="handleImport">
          <span v-if="importing" class="btn-import-spinner"></span>
          {{ importing ? '导入中...' : '导入全部到库存 (' + recognizeResults.length + ')' }}
        </button>
      </div>
      <button
        v-else-if="selectedFile && !recognizing && !errorMessage"
        class="btn-recognize"
        @click="handleRecognize"
      >
        开始识别
      </button>
    </BottomSheet>

    <!-- 历史详情 Sheet -->
    <BottomSheet :visible="showDetailSheet" @close="showDetailSheet = false">
      <template v-if="currentHistory">
        <h2 class="sheet-title">识别详情</h2>
        <div class="detail-info">
          <div class="result-line">
            <span class="rl">状态</span>
            <span class="rv" :style="{ color: currentHistory.status === 'success' ? 'var(--green)' : 'var(--red)' }">
              {{ currentHistory.status === 'success' ? '成功' : '失败' }}
            </span>
          </div>
          <div class="result-line">
            <span class="rl">批号</span>
            <span class="rv">{{ currentHistory.batchNo || '-' }}</span>
          </div>
          <div class="result-line">
            <span class="rl">品级</span>
            <span class="rv">{{ currentHistory.grade || '-' }}</span>
          </div>
          <div class="result-line">
            <span class="rl">记录数</span>
            <span class="rv">{{ currentHistory.itemCount }}</span>
          </div>
          <div class="result-line">
            <span class="rl">时间</span>
            <span class="rv">{{ formatDate(currentHistory.createdAt) }}</span>
          </div>
        </div>
        <div v-if="currentHistory.imageUrl" class="detail-image">
          <img :src="currentHistory.imageUrl" />
        </div>
      </template>
    </BottomSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { aiRecognize, getRecognitionHistory, batchCreateInventory } from '@/api/distribution'
import { useToast } from '@/composables/useToast'
import type { AiRecognizeResult, AiRecognitionHistory } from '@/types'
import FilterPills from '@/components/FilterPills.vue'
import AiHistoryItem from '@/components/AiHistoryItem.vue'
import BottomSheet from '@/components/BottomSheet.vue'

const { success, danger } = useToast()

const selectedTime = ref('')
const timeFilters = [
  { label: '全部', value: '' },
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
]

const historyList = ref<AiRecognitionHistory[]>([])
const historyTotal = ref(0)
const historyLoading = ref(false)

const showSheet = ref(false)
const showDetailSheet = ref(false)
const currentHistory = ref<AiRecognitionHistory | null>(null)

const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const recognizing = ref(false)
const importing = ref(false)
const errorMessage = ref('')
const recognizeResults = ref<AiRecognizeResult[]>([])
const results = ref<{ label: string; value: string }[]>([])

const importForm = reactive({
  specification: '',
  location: '',
})

const specOptions = [
  { label: '请选择规格（可选）', value: '' },
  { label: '整板', value: '整板' },
  { label: '镍条', value: '镍条' },
  { label: '100*100', value: '100*100' },
  { label: '50*50', value: '50*50' },
  { label: '25*25', value: '25*25' },
]

const locationOptions = [
  { label: '请选择存放位置（可选）', value: '' },
  { label: '二厂区', value: '二厂区' },
  { label: '三厂区', value: '三厂区' },
]

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    const res = await getRecognitionHistory({ limit: 50, status: undefined, timeRange: selectedTime.value || undefined }) as any
    historyList.value = res.data || []
    historyTotal.value = res.total || 0
  } catch (e: any) {
    danger('加载历史失败')
  } finally {
    historyLoading.value = false
  }
}

// 监听时间筛选变化
watch(selectedTime, () => fetchHistory())

const viewHistoryDetail = (item: AiRecognitionHistory) => {
  currentHistory.value = item
  showDetailSheet.value = true
}

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

const closeSheet = () => {
  showSheet.value = false
  handleRemove()
  errorMessage.value = ''
}

const handleRemove = () => {
  selectedFile.value = null
  previewUrl.value = ''
  results.value = []
  recognizeResults.value = []
  errorMessage.value = ''
}

// Capacitor 原生相机
const takePhoto = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })

      if (!photo.dataUrl) return

      const mimeMatch = photo.dataUrl.match(/^data:(.+?);base64,/)
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
      const ext = mime.split('/')[1] || 'jpeg'

      const res = await fetch(photo.dataUrl)
      const blob = await res.blob()
      selectedFile.value = new File([blob], `photo.${ext}`, { type: mime })
      previewUrl.value = photo.dataUrl
      errorMessage.value = ''
      results.value = []
      recognizeResults.value = []
    } else {
      pickFromAlbum()
    }
  } catch (e: any) {
    errorMessage.value = e.message || '拍照失败'
  }
}

// 相册选择
const pickFromAlbum = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      })

      if (!photo.dataUrl) return

      const mimeMatch = photo.dataUrl.match(/^data:(.+?);base64,/)
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
      const ext = mime.split('/')[1] || 'jpeg'

      const res = await fetch(photo.dataUrl)
      const blob = await res.blob()
      selectedFile.value = new File([blob], `photo.${ext}`, { type: mime })
      previewUrl.value = photo.dataUrl
      errorMessage.value = ''
      results.value = []
      recognizeResults.value = []
    } else {
      triggerUpload()
    }
  } catch (e: any) {
    errorMessage.value = e.message || '选择图片失败'
  }
}

// 浏览器文件上传
const triggerUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
    errorMessage.value = ''
    results.value = []
    recognizeResults.value = []
  }
  input.click()
}

// 识别
const handleRecognize = async () => {
  if (!selectedFile.value) return
  recognizing.value = true
  errorMessage.value = ''

  try {
    // 后端返回 { results: [...], historyId: N }
    const res = await aiRecognize(selectedFile.value)
    const aiResults = (res as any)?.results || []
    recognizeResults.value = Array.isArray(aiResults) ? aiResults : []

    if (!recognizeResults.value.length) {
      errorMessage.value = '未识别到结果，请重试'
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '网络错误，请检查后端连接'
    errorMessage.value = msg
  } finally {
    recognizing.value = false
  }
}

// 导入
const handleImport = async () => {
  if (!recognizeResults.value.length) return
  importing.value = true
  try {
    const items = recognizeResults.value.map(r => ({
      batchNo: r.batchNo || '',
      grade: r.grade || '',
      specification: importForm.specification || '',
      productType: r.productType || '',
      weight: (r.netWeight || 0) * 1000,
      pieceCount: r.pieceCount || 0,
      packageNo: String(r.packageNo || ''),
      location: importForm.location || '',
    }))
    await batchCreateInventory({ items })
    success('导入成功')
    showSheet.value = false
    handleRemove()
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '导入失败'
    danger(msg)
  } finally {
    importing.value = false
  }
}

onMounted(fetchHistory)
</script>

<style scoped>
.ai-view {
  padding-bottom: calc(var(--tab-height) + var(--space-5));
  padding-top: var(--page-header-top);
}
.page-header {
  padding: var(--space-3) var(--space-5) var(--space-4);
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

.ai-fab {
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
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-display);
  box-shadow: var(--shadow-fab);
  z-index: 60;
  transition: all var(--duration-slow) var(--ease-out-expo);
}
.ai-fab:active { transform: scale(0.9) rotate(8deg); }

/* Sheet */
.sheet-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.4px;
  margin-bottom: var(--space-1);
  font-family: var(--font-display);
}
.sheet-sub {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-5);
}

/* 操作按钮 */
.camera-actions {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.camera-btn {
  flex: 1;
  height: 52px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
  border: 1px solid transparent;
}
.camera-btn:active { transform: scale(0.96); }
.camera-btn:first-child {
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}
.camera-btn:last-child {
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border);
}
.cam-icon { opacity: 0.9; }
.btn-text { font-size: 14px; font-weight: 500; }

/* 预览 */
.preview-area {
  position: relative;
  margin-bottom: var(--space-4);
}
.preview-img {
  width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: var(--radius);
  background: var(--surface-alt);
}
.preview-remove {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

/* 识别中 */
.recognizing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-5) 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 错误信息 */
.error-msg {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--red-soft);
  border-radius: var(--radius-sm);
  margin: var(--space-3) 0;
}
.error-icon-svg { color: var(--red); flex-shrink: 0; }
.error-text { flex: 1; font-size: 13px; color: var(--red); font-weight: 500; }
.error-retry {
  padding: var(--space-2) var(--space-4);
  background: var(--red);
  color: white;
  border-radius: var(--radius-xs);
  font-size: 12px;
  font-weight: 500;
  border: none;
}

/* 结果 */
.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.result-header {
  display: flex;
  align-items: center;
  padding-bottom: var(--space-1);
}
.result-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.result-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.result-card-top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.result-index {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}
.result-batch {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-grade-tag {
  font-size: 11px;
  font-weight: 600;
  background: var(--green-soft);
  color: var(--green);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}
.result-card-body {
  padding: var(--space-1) 0;
}
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}
.result-row:last-child { border-bottom: none; }
.row-label {
  font-size: 13px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.row-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.row-value.highlight {
  font-weight: 600;
  color: var(--accent);
}
.result-row-group {
  display: flex;
  border-bottom: 1px solid var(--border);
}
.result-row-inline {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
}
.result-row-inline:first-child {
  border-right: 1px solid var(--border);
}

.btn-import, .btn-recognize {
  width: 100%;
  height: 50px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  margin-top: var(--space-5);
  cursor: pointer;
  letter-spacing: -0.2px;
  box-shadow: var(--shadow-sm);
}
.btn-import:active, .btn-recognize:active { transform: scale(0.97); }
.btn-import:disabled { opacity: 0.5; }

.detail-info { margin-bottom: var(--space-4); }
.detail-image {
  border-radius: var(--radius);
  overflow: hidden;
  margin-top: var(--space-4);
}
.detail-image img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  background: var(--surface-alt);
}
.result-line {
  display: flex;
  justify-content: space-between;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border);
}
.result-line:last-child { border-bottom: none; }
.rl { font-size: 13px; color: var(--text-tertiary); }
.rv { font-size: 14px; font-weight: 500; }

/* Import section */
.import-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin-top: var(--space-3);
}
.import-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-3);
}
.import-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.import-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.import-field label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
}
.import-select {
  height: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-3);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface-alt);
  outline: none;
  font-family: var(--font-body);
  cursor: pointer;
  transition: border-color var(--duration-micro) var(--ease-out), box-shadow var(--duration-micro) var(--ease-out);
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-2) center;
  background-size: 14px;
}
.import-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

/* Import button spinner */
.btn-import {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-import-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: var(--space-2);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
