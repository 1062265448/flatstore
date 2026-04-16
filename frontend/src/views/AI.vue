<template>
  <div class="ai-page">
    <el-row :gutter="20">
      <!-- 上传识别区 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>AI 图像识别</span>
            </div>
          </template>

          <el-upload
            ref="uploadRef"
            class="upload-area"
            drag
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            accept="image/*"
          >
            <div v-if="!previewUrl" class="upload-placeholder">
              <el-icon class="upload-icon"><UploadFilled /></el-icon>
              <div class="upload-text">拖拽图片到此处或点击上传</div>
              <div class="upload-hint">支持 JPG、PNG、GIF、WebP 格式，最大 10MB</div>
            </div>
            <div v-else class="preview-container">
              <img :src="previewUrl" alt="预览图片" class="preview-image" />
              <el-button class="remove-btn" type="danger" circle @click.stop="handleRemove">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </el-upload>

          <div class="action-buttons">
            <el-button type="primary" :loading="uploading" :disabled="!selectedFile" @click="handleRecognize">
              开始识别
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>

          <!-- 识别结果 -->
          <div v-if="recognizeResults.length" class="results-section">
            <el-divider content-position="left">识别结果</el-divider>
            <el-table :data="recognizeResults" border stripe size="small" max-height="400">
              <el-table-column prop="batchNo" label="批号" min-width="120" />
              <el-table-column prop="grade" label="品级" width="100">
                <template #default="{ row }">
                  <el-tag>{{ row.grade }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="productType" label="产品类型" min-width="120" />
              <el-table-column prop="pieceCount" label="片数" width="80" />
              <el-table-column label="净重(吨)" width="100">
                <template #default="{ row }">
                  {{ (row.netWeight || 0).toFixed(3) }}
                </template>
              </el-table-column>
              <el-table-column prop="date" label="日期" width="120" />
            </el-table>

            <div class="result-actions">
              <el-button type="success" @click="handleBatchCreate">批量导入库存</el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 识别历史 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>识别历史</span>
              <el-button type="danger" size="small" :disabled="!selectedHistory.length" @click="handleBatchDeleteHistory">
                批量删除
              </el-button>
            </div>
          </template>

          <!-- 筛选 -->
          <el-form inline class="history-filter">
            <el-form-item label="状态">
              <el-select v-model="historyQuery.status" placeholder="全部" clearable>
                <el-option label="成功" value="success" />
                <el-option label="失败" value="failed" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="fetchHistory">查询</el-button>
            </el-form-item>
          </el-form>

          <el-table
            v-loading="historyLoading"
            :data="historyList"
            @selection-change="handleHistorySelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="imageUrl" label="图片" width="80">
              <template #default="{ row }">
                <el-image
                  v-if="row.imageUrl"
                  :src="row.imageUrl"
                  :preview-src-list="[row.imageUrl]"
                  fit="cover"
                  style="width: 40px; height: 40px"
                />
              </template>
            </el-table-column>
            <el-table-column prop="itemCount" label="识别数" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                  {{ row.itemCount }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="batchNo" label="批号" min-width="120" />
            <el-table-column prop="grade" label="品级" width="80">
              <template #default="{ row }">
                {{ row.grade || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleViewHistory(row)">查看</el-button>
                <el-button link type="danger" @click="handleDeleteHistory(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="historyQuery.page"
              v-model:page-size="historyQuery.limit"
              :total="historyTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchHistory"
              @current-change="fetchHistory"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="importVisible" title="批量导入库存" width="600px" destroy-on-close>
      <el-form :model="importForm" label-width="100px">
        <el-form-item label="统一批号">
          <el-input v-model="importForm.batchNo" placeholder="为空则使用识别结果中的批号" />
        </el-form-item>
        <el-form-item label="统一品级">
          <el-input v-model="importForm.grade" placeholder="为空则使用识别结果中的品级" />
        </el-form-item>
        <el-form-item label="存放位置">
          <el-input v-model="importForm.location" placeholder="请输入存放位置" />
        </el-form-item>
      </el-form>
      <el-table :data="recognizeResults" border size="small" max-height="300">
        <el-table-column prop="batchNo" label="批号" />
        <el-table-column prop="grade" label="品级" />
        <el-table-column prop="productType" label="产品类型" />
        <el-table-column prop="pieceCount" label="片数" />
        <el-table-column label="净重(吨)">
          <template #default="{ row }">
            {{ (row.netWeight || 0).toFixed(3) }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="handleImportSubmit">确认导入</el-button>
      </template>
    </el-dialog>

    <!-- 历史详情对话框 -->
    <el-dialog v-model="historyDetailVisible" title="识别详情" width="700px">
      <el-descriptions v-if="currentHistory" :column="2" border>
        <el-descriptions-item label="ID">{{ currentHistory.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentHistory.status === 'success' ? 'success' : 'danger'">
            {{ currentHistory.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="识别数量">{{ currentHistory.itemCount }}</el-descriptions-item>
        <el-descriptions-item label="批号">{{ currentHistory.batchNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="品级">{{ currentHistory.grade || '-' }}</el-descriptions-item>
        <el-descriptions-item label="识别时间">
          {{ formatDate(currentHistory.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="currentHistory.errorMessage">
          <span style="color: #f56c6c">{{ currentHistory.errorMessage }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="currentHistory?.result" class="history-result">
        <el-divider content-position="left">识别结果</el-divider>
        <pre>{{ formatJson(currentHistory.result) }}</pre>
      </div>

      <div class="history-image">
        <el-divider content-position="left">原始图片</el-divider>
        <el-image v-if="currentHistory?.imageUrl" :src="currentHistory.imageUrl" fit="contain" style="max-height: 300px" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { UploadFilled, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiRecognize, batchCreateInventory, getRecognitionHistory, deleteRecognitionHistory, batchDeleteRecognitionHistory } from '@/api/distribution'
import type { AiRecognizeResult, AiRecognitionHistory, CreateInventoryDto } from '@/types'

const uploadRef = ref()
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string>('')
const uploading = ref(false)
const recognizeResults = ref<AiRecognizeResult[]>([])

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
  location: '',
})

const historyDetailVisible = ref(false)
const currentHistory = ref<AiRecognitionHistory | null>(null)

const handleFileChange = (file: any) => {
  const rawFile = file.raw
  if (!rawFile) return

  // 限制文件大小 10MB
  if (rawFile.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    return
  }

  selectedFile.value = rawFile
  previewUrl.value = URL.createObjectURL(rawFile)
  recognizeResults.value = []
}

const handleRemove = () => {
  selectedFile.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  uploadRef.value?.clearFiles()
}

const handleReset = () => {
  handleRemove()
  recognizeResults.value = []
}

const handleRecognize = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先上传图片')
    return
  }

  uploading.value = true
  try {
    // ⚠️ 不手动设置 Content-Type，让浏览器自动添加 boundary
    const res = await aiRecognize(selectedFile.value)
    recognizeResults.value = res as AiRecognizeResult[]
    if (!recognizeResults.value.length) {
      ElMessage.warning('未识别到任何数据')
    } else {
      ElMessage.success(`成功识别 ${recognizeResults.value.length} 条记录`)
    }
    // 刷新历史
    fetchHistory()
  } catch (e) {
    // 错误已在 API 层处理
  } finally {
    uploading.value = false
  }
}

const handleBatchCreate = () => {
  importForm.batchNo = ''
  importForm.grade = ''
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
      productType: r.productType || '',
      weight: r.netWeight || 0,
      pieceCount: r.pieceCount || 0,
      location: importForm.location,
      sourceType: 'ai_recognize',
    }))

    await batchCreateInventory(items)
    ElMessage.success(`成功导入 ${items.length} 条库存记录`)
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
    historyList.value = res.data
    historyTotal.value = res.total
  } finally {
    historyLoading.value = false
  }
}

const handleHistorySelectionChange = (rows: AiRecognitionHistory[]) => {
  selectedHistory.value = rows
}

const handleViewHistory = (row: AiRecognitionHistory) => {
  currentHistory.value = row
  historyDetailVisible.value = true
}

const handleDeleteHistory = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该识别记录?', '提示', { type: 'warning' })
    await deleteRecognitionHistory(id)
    ElMessage.success('删除成功')
    fetchHistory()
  } catch {
    // 用户取消
  }
}

const handleBatchDeleteHistory = async () => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedHistory.value.length} 条记录?`, '提示', {
      type: 'warning',
    })
    const ids = selectedHistory.value.map((r) => r.id)
    await batchDeleteRecognitionHistory(ids)
    ElMessage.success('批量删除成功')
    selectedHistory.value = []
    fetchHistory()
  } catch {
    // 用户取消
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const formatJson = (json: string) => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

onMounted(() => {
  fetchHistory()
})
</script>

<style scoped lang="scss">
.ai-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .upload-area {
    :deep(.el-upload-dragger) {
      padding: 40px 20px;
      background: #fafafa;
      border: 2px dashed #d9d9d9;
      border-radius: 8px;
      transition: border-color 0.3s;
      &:hover {
        border-color: #409eff;
      }
    }
    .upload-placeholder {
      text-align: center;
      .upload-icon {
        font-size: 48px;
        color: #999;
        margin-bottom: 16px;
      }
      .upload-text {
        font-size: 16px;
        color: #666;
        margin-bottom: 8px;
      }
      .upload-hint {
        font-size: 12px;
        color: #999;
      }
    }
    .preview-container {
      position: relative;
      display: flex;
      justify-content: center;
      .preview-image {
        max-width: 100%;
        max-height: 300px;
        object-fit: contain;
      }
      .remove-btn {
        position: absolute;
        top: 10px;
        right: 10px;
      }
    }
  }
  .action-buttons {
    margin-top: 20px;
    text-align: center;
  }
  .results-section {
    margin-top: 20px;
    .result-actions {
      margin-top: 16px;
      text-align: center;
    }
  }
  .history-filter {
    margin-bottom: 16px;
  }
  .pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
  .history-result {
    margin-top: 16px;
    pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      max-height: 200px;
    }
  }
  .history-image {
    margin-top: 16px;
  }
}

html.dark {
  .ai-page {
    .upload-area :deep(.el-upload-dragger) {
      background: #1f1f1f;
      border-color: #333;
    }
    .history-result pre {
      background: #1f1f1f;
    }
  }
}
</style>
