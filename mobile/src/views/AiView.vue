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
        <button class="btn-import" :disabled="importing" @click="handleImport">
          导入全部到库存 ({{ recognizeResults.length }})
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
import { ref, onMounted, watch } from 'vue'
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
      productType: r.productType || '',
      weight: (r.netWeight || 0) * 1000,
      pieceCount: r.pieceCount || 0,
      packageNo: String(r.packageNo || ''),
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
.ai-list {
  padding: 0 20px;
}
.loading-state { display: flex; justify-content: center; padding: 60px 0; }
.empty-hint { text-align: center; padding: 60px 0; font-size: 14px; color: var(--text-tertiary); }

.ai-fab {
  position: fixed;
  bottom: calc(var(--tab-height) + 16px);
  right: 20px;
  width: 52px;
  height: 52px;
  background: var(--text);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  z-index: 60;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ai-fab:active { transform: scale(0.9); }

/* Sheet */
.sheet-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
  margin-bottom: 4px;
}
.sheet-sub {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 20px;
}

/* 操作按钮 */
.camera-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.camera-btn {
  flex: 1;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.camera-btn:active { transform: scale(0.96); }
.camera-btn:first-child {
  background: var(--accent-soft);
  color: var(--accent);
}
.camera-btn:last-child {
  background: var(--bg);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.cam-icon { opacity: 0.8; }
.btn-text { font-size: 14px; font-weight: 500; }

/* 预览 */
.preview-area {
  position: relative;
  margin-bottom: 16px;
}
.preview-img {
  width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: var(--radius);
  background: #111;
}
.preview-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 识别中 */
.recognizing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 错误信息 */
.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: var(--red-soft);
  border-radius: 12px;
  margin: 12px 0;
}
.error-icon-svg { color: var(--red); flex-shrink: 0; }
.error-text { flex: 1; font-size: 13px; color: var(--red); }
.error-retry {
  padding: 6px 14px;
  background: var(--red);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

/* 结果 */
.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
.result-header {
  display: flex;
  align-items: center;
  padding-bottom: 4px;
}
.result-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.result-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.result-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.result-index {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: 6px;
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
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.result-card-body {
  padding: 4px 0;
}
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
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
  padding: 10px 16px;
}
.result-row-inline:first-child {
  border-right: 1px solid var(--border);
}

.btn-import, .btn-recognize {
  width: 100%;
  height: 50px;
  background: var(--text);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 20px;
  cursor: pointer;
  letter-spacing: -0.2px;
}
.btn-import:active, .btn-recognize:active { transform: scale(0.98); }
.btn-import:disabled { opacity: 0.5; }

.detail-info { margin-bottom: 16px; }
.detail-image {
  border-radius: var(--radius);
  overflow: hidden;
  margin-top: 16px;
}
.detail-image img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  background: #f5f5f5;
}
</style>
