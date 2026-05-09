<template>
  <div class="test-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>API 测试窗口</span>
          <el-button size="small" @click="clearLogs">清空日志</el-button>
        </div>
      </template>

      <!-- API 分类标签 -->
      <el-tabs v-model="activeTab" class="api-tabs">
        <!-- 统计接口 -->
        <el-tab-pane label="统计" name="statistics">
          <div class="api-group">
            <el-button type="primary" @click="testGetStatistics">GET /distribution/statistics</el-button>
          </div>
        </el-tab-pane>

        <!-- 库存接口 -->
        <el-tab-pane label="库存" name="inventory">
          <div class="api-group">
            <el-space wrap>
              <el-button type="primary" @click="testGetInventory">GET /distribution/inventory</el-button>
              <el-button type="success" @click="showCreateInventory = true">POST /distribution/inventory</el-button>
              <el-button type="warning" @click="showBatchCreateInventory = true">POST /distribution/inventory/batch</el-button>
              <el-button type="danger" @click="showDeleteInventory = true">DELETE /distribution/inventory/:id</el-button>
            </el-space>
          </div>
        </el-tab-pane>

        <!-- 客户接口 -->
        <el-tab-pane label="客户" name="customer">
          <div class="api-group">
            <el-space wrap>
              <el-button type="primary" @click="testGetCustomers">GET /distribution/customers</el-button>
              <el-button type="success" @click="showCreateCustomer = true">POST /distribution/customers</el-button>
              <el-button type="warning" @click="showUpdateCustomer = true">PUT /distribution/customers/:id</el-button>
              <el-button type="danger" @click="showDeleteCustomer = true">DELETE /distribution/customers/:id</el-button>
            </el-space>
          </div>
        </el-tab-pane>

        <!-- 配货单接口 -->
        <el-tab-pane label="配货单" name="order">
          <div class="api-group">
            <el-space wrap>
              <el-button type="primary" @click="testGetOrders">GET /distribution/orders</el-button>
              <el-button type="success" @click="showCreateOrder = true">POST /distribution/orders</el-button>
              <el-button type="warning" @click="showShipOrder = true">POST /distribution/orders/:id/ship</el-button>
              <el-button type="danger" @click="showCancelOrder = true">POST /distribution/orders/:id/cancel</el-button>
            </el-space>
          </div>
        </el-tab-pane>

        <!-- AI 接口 -->
        <el-tab-pane label="AI 识别" name="ai">
          <div class="api-group">
            <el-button type="primary" @click="showAiRecognize = true">POST /distribution/inventory/ai-recognize</el-button>
            <el-button type="primary" @click="testGetRecognitionHistory">GET /distribution/recognition-history</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 请求日志 -->
      <el-divider content-position="left">请求日志</el-divider>
      <div class="log-container">
        <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-method" :class="log.method.toLowerCase()">{{ log.method }}</span>
          <span class="log-url">{{ log.url }}</span>
          <span v-if="log.status" class="log-status" :class="log.status >= 400 ? 'error' : 'success'">
            {{ log.status }}
          </span>
          <span v-if="log.duration" class="log-duration">{{ log.duration }}ms</span>
          <div v-if="log.response" class="log-response">
            <pre>{{ formatJson(log.response) }}</pre>
          </div>
          <div v-if="log.error" class="log-error">
            {{ log.error }}
          </div>
        </div>
        <div v-if="!logs.length" class="log-empty">暂无请求日志</div>
      </div>
    </el-card>

    <!-- 创建库存对话框 -->
    <el-dialog v-model="showCreateInventory" title="创建库存" width="600px" destroy-on-close>
      <el-form :model="createInventoryForm" label-width="100px">
        <el-form-item label="批号" required>
          <el-input v-model="createInventoryForm.batchNo" placeholder="请输入批号" />
        </el-form-item>
        <el-form-item label="品级" required>
          <el-input v-model="createInventoryForm.grade" placeholder="请输入品级" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="createInventoryForm.specification" placeholder="请输入规格" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="重量(吨)" required>
              <el-input-number v-model="createInventoryForm.weight" :min="0" :precision="3" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="片数" required>
              <el-input-number v-model="createInventoryForm.pieceCount" :min="0" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="存放位置">
          <el-input v-model="createInventoryForm.location" placeholder="请输入存放位置" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateInventory = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleCreateInventory">提交</el-button>
      </template>
    </el-dialog>

    <!-- 批量创建库存对话框 -->
    <el-dialog v-model="showBatchCreateInventory" title="批量创建库存" width="700px" destroy-on-close>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        每行一条记录，格式：批号,品级,规格,重量,片数,位置
      </el-alert>
      <el-input
        v-model="batchInventoryText"
        type="textarea"
        :rows="10"
        placeholder="例如&#10;BATCH001,A级,10mm,1.5,100,仓库A&#10;BATCH002,B级,12mm,2.0,150,仓库B"
      />
      <template #footer>
        <el-button @click="showBatchCreateInventory = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleBatchCreateInventory">提交</el-button>
      </template>
    </el-dialog>

    <!-- 删除库存对话框 -->
    <el-dialog v-model="showDeleteInventory" title="删除库存" width="400px">
      <el-form :model="deleteInventoryForm" label-width="100px">
        <el-form-item label="库存 ID">
          <el-input-number v-model="deleteInventoryForm.id" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDeleteInventory = false">取消</el-button>
        <el-button type="danger" :loading="loading" @click="handleDeleteInventory">删除</el-button>
      </template>
    </el-dialog>

    <!-- 创建客户对话框 -->
    <el-dialog v-model="showCreateCustomer" title="创建客户" width="500px" destroy-on-close>
      <el-form :model="createCustomerForm" label-width="100px">
        <el-form-item label="客户名称" required>
          <el-input v-model="createCustomerForm.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="createCustomerForm.contact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="createCustomerForm.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="createCustomerForm.address" placeholder="请输入地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateCustomer = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleCreateCustomer">提交</el-button>
      </template>
    </el-dialog>

    <!-- 更新客户对话框 -->
    <el-dialog v-model="showUpdateCustomer" title="更新客户" width="500px" destroy-on-close>
      <el-form :model="updateCustomerForm" label-width="100px">
        <el-form-item label="客户 ID" required>
          <el-input-number v-model="updateCustomerForm.id" :min="1" />
        </el-form-item>
        <el-form-item label="客户名称">
          <el-input v-model="updateCustomerForm.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="updateCustomerForm.contact" placeholder="请输入联系人" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUpdateCustomer = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleUpdateCustomer">提交</el-button>
      </template>
    </el-dialog>

    <!-- 删除客户对话框 -->
    <el-dialog v-model="showDeleteCustomer" title="删除客户" width="400px">
      <el-form :model="deleteCustomerForm" label-width="100px">
        <el-form-item label="客户 ID">
          <el-input-number v-model="deleteCustomerForm.id" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDeleteCustomer = false">取消</el-button>
        <el-button type="danger" :loading="loading" @click="handleDeleteCustomer">删除</el-button>
      </template>
    </el-dialog>

    <!-- 创建配货单对话框 -->
    <el-dialog v-model="showCreateOrder" title="创建配货单" width="700px" destroy-on-close>
      <el-form :model="createOrderForm" label-width="100px">
        <el-form-item label="客户 ID" required>
          <el-input-number v-model="createOrderForm.customerId" :min="1" />
        </el-form-item>
        <el-form-item label="目标品级">
          <el-input v-model="createOrderForm.targetGrade" placeholder="请输入目标品级" />
        </el-form-item>
        <el-form-item label="产品规格">
          <el-input v-model="createOrderForm.productSpec" placeholder="请输入产品规格" />
        </el-form-item>
      </el-form>
      <el-alert type="info" :closable="false" style="margin: 16px 0">
        配货明细（至少一条）
      </el-alert>
      <el-input
        v-model="orderItemsText"
        type="textarea"
        :rows="4"
        placeholder="格式：stockId,重量,片数&#10;例如：&#10;1,1.5,100&#10;2,2.0,150"
      />
      <template #footer>
        <el-button @click="showCreateOrder = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleCreateOrder">提交</el-button>
      </template>
    </el-dialog>

    <!-- 发货对话框 -->
    <el-dialog v-model="showShipOrder" title="发货" width="400px">
      <el-form :model="shipOrderForm" label-width="100px">
        <el-form-item label="订单 ID" required>
          <el-input-number v-model="shipOrderForm.id" :min="1" />
        </el-form-item>
        <el-form-item label="司机姓名">
          <el-input v-model="shipOrderForm.driverName" placeholder="请输入司机姓名" />
        </el-form-item>
        <el-form-item label="车牌号">
          <el-input v-model="shipOrderForm.vehicleNo" placeholder="请输入车牌号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showShipOrder = false">取消</el-button>
        <el-button type="warning" :loading="loading" @click="handleShipOrder">发货</el-button>
      </template>
    </el-dialog>

    <!-- 取消订单对话框 -->
    <el-dialog v-model="showCancelOrder" title="取消订单" width="400px">
      <el-form :model="cancelOrderForm" label-width="100px">
        <el-form-item label="订单 ID" required>
          <el-input-number v-model="cancelOrderForm.id" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCancelOrder = false">取消</el-button>
        <el-button type="danger" :loading="loading" @click="handleCancelOrder">确认取消</el-button>
      </template>
    </el-dialog>

    <!-- AI 识别对话框 -->
    <el-dialog v-model="showAiRecognize" title="AI 图像识别" width="600px" destroy-on-close>
      <el-upload
        class="upload-area"
        drag
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept="image/*"
      >
        <div v-if="!selectedFile" class="upload-placeholder">
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div>拖拽图片到此处或点击上传</div>
        </div>
        <div v-else class="preview-container">
          <img :src="previewUrl" alt="预览" class="preview-image" />
        </div>
      </el-upload>
      <template #footer>
        <el-button @click="showAiRecognize = false">取消</el-button>
        <el-button type="primary" :loading="loading" :disabled="!selectedFile" @click="handleAiRecognize">识别</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import * as api from '@/api/distribution'

interface LogItem {
  time: string
  method: string
  url: string
  status?: number
  duration?: number
  response?: any
  error?: string
  type: 'request' | 'response' | 'error'
}

const activeTab = ref('statistics')
const loading = ref(false)
const logs = ref<LogItem[]>([])
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')

// 对话框状态
const showCreateInventory = ref(false)
const showBatchCreateInventory = ref(false)
const showDeleteInventory = ref(false)
const showCreateCustomer = ref(false)
const showUpdateCustomer = ref(false)
const showDeleteCustomer = ref(false)
const showCreateOrder = ref(false)
const showShipOrder = ref(false)
const showCancelOrder = ref(false)
const showAiRecognize = ref(false)

// 表单数据
const createInventoryForm = reactive({
  batchNo: '',
  grade: '',
  specification: '',
  weight: 0,
  pieceCount: 0,
  location: '',
})

const batchInventoryText = ref('')
const deleteInventoryForm = reactive({ id: 1 })

const createCustomerForm = reactive({
  name: '',
  contact: '',
  phone: '',
  address: '',
})

const updateCustomerForm = reactive({
  id: 1,
  name: '',
  contact: '',
})

const deleteCustomerForm = reactive({ id: 1 })

const createOrderForm = reactive({
  customerId: 1,
  targetGrade: '',
  productSpec: '',
})

const orderItemsText = ref('')

const shipOrderForm = reactive({
  id: 1,
  driverName: '',
  vehicleNo: '',
})

const cancelOrderForm = reactive({ id: 1 })

// 日志工具
const addLog = (log: Omit<LogItem, 'time' | 'type'>) => {
  logs.value.unshift({
    ...log,
    time: new Date().toLocaleTimeString(),
    type: log.error ? 'error' : 'response',
  })
}

const clearLogs = () => {
  logs.value = []
}

const formatJson = (data: any) => {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// 统计接口测试
const testGetStatistics = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.getStatistics()
    addLog({
      method: 'GET',
      url: '/distribution/statistics',
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
  } catch (e: any) {
    addLog({
      method: 'GET',
      url: '/distribution/statistics',
      duration: Date.now() - startTime,
      error: e.message,
    })
  } finally {
    loading.value = false
  }
}

// 库存接口测试
const testGetInventory = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.getInventoryList({ page: 1, limit: 10 })
    addLog({
      method: 'GET',
      url: '/distribution/inventory?page=1&limit=10',
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
  } catch (e: any) {
    addLog({
      method: 'GET',
      url: '/distribution/inventory',
      duration: Date.now() - startTime,
      error: e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleCreateInventory = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.createInventory(createInventoryForm)
    addLog({
      method: 'POST',
      url: '/distribution/inventory',
      status: 201,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('创建成功')
    showCreateInventory.value = false
  } catch (e: any) {
    addLog({
      method: 'POST',
      url: '/distribution/inventory',
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleBatchCreateInventory = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const lines = batchInventoryText.value.trim().split('\n')
    const items = lines.map(line => {
      const [batchNo, grade, specification, weight, pieceCount, location] = line.split(',')
      return {
        batchNo: batchNo?.trim(),
        grade: grade?.trim(),
        specification: specification?.trim() || '',
        weight: parseFloat(weight) || 0,
        pieceCount: parseInt(pieceCount) || 0,
        location: location?.trim() || '',
      }
    })
    const res = await api.batchCreateInventory({ items })
    addLog({
      method: 'POST',
      url: '/distribution/inventory/batch',
      status: 201,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('批量创建成功')
    showBatchCreateInventory.value = false
  } catch (e: any) {
    addLog({
      method: 'POST',
      url: '/distribution/inventory/batch',
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleDeleteInventory = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    await api.deleteInventory(deleteInventoryForm.id)
    addLog({
      method: 'DELETE',
      url: `/distribution/inventory/${deleteInventoryForm.id}`,
      status: 200,
      duration: Date.now() - startTime,
      response: { success: true },
    })
    ElMessage.success('删除成功')
    showDeleteInventory.value = false
  } catch (e: any) {
    addLog({
      method: 'DELETE',
      url: `/distribution/inventory/${deleteInventoryForm.id}`,
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

// 客户接口测试
const testGetCustomers = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.getCustomers()
    addLog({
      method: 'GET',
      url: '/distribution/customers',
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
  } catch (e: any) {
    addLog({
      method: 'GET',
      url: '/distribution/customers',
      duration: Date.now() - startTime,
      error: e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleCreateCustomer = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.createCustomer(createCustomerForm)
    addLog({
      method: 'POST',
      url: '/distribution/customers',
      status: 201,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('创建成功')
    showCreateCustomer.value = false
  } catch (e: any) {
    addLog({
      method: 'POST',
      url: '/distribution/customers',
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleUpdateCustomer = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const { id, ...data } = updateCustomerForm
    const res = await api.updateCustomer(id, data)
    addLog({
      method: 'PUT',
      url: `/distribution/customers/${id}`,
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('更新成功')
    showUpdateCustomer.value = false
  } catch (e: any) {
    addLog({
      method: 'PUT',
      url: `/distribution/customers/${updateCustomerForm.id}`,
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleDeleteCustomer = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    await api.deleteCustomer(deleteCustomerForm.id)
    addLog({
      method: 'DELETE',
      url: `/distribution/customers/${deleteCustomerForm.id}`,
      status: 200,
      duration: Date.now() - startTime,
      response: { success: true },
    })
    ElMessage.success('删除成功')
    showDeleteCustomer.value = false
  } catch (e: any) {
    addLog({
      method: 'DELETE',
      url: `/distribution/customers/${deleteCustomerForm.id}`,
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

// 配货单接口测试
const testGetOrders = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.getOrderList({ page: 1, limit: 10 })
    addLog({
      method: 'GET',
      url: '/distribution/orders?page=1&limit=10',
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
  } catch (e: any) {
    addLog({
      method: 'GET',
      url: '/distribution/orders',
      duration: Date.now() - startTime,
      error: e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleCreateOrder = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const lines = orderItemsText.value.trim().split('\n')
    const items = lines.map(line => {
      const [stockId, weight, pieceCount] = line.split(',')
      return {
        stockId: parseInt(stockId) || 0,
        weight: parseFloat(weight) || 0,
        pieceCount: parseInt(pieceCount) || 0,
      }
    })
    const res = await api.createOrder({
      customerId: createOrderForm.customerId,
      targetGrade: createOrderForm.targetGrade,
      productSpec: createOrderForm.productSpec,
      items,
    })
    addLog({
      method: 'POST',
      url: '/distribution/orders',
      status: 201,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('创建成功')
    showCreateOrder.value = false
  } catch (e: any) {
    addLog({
      method: 'POST',
      url: '/distribution/orders',
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleShipOrder = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.shipOrder(shipOrderForm.id, {
      driverName: shipOrderForm.driverName,
      vehicleNo: shipOrderForm.vehicleNo,
    })
    addLog({
      method: 'POST',
      url: `/distribution/orders/${shipOrderForm.id}/ship`,
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('发货成功')
    showShipOrder.value = false
  } catch (e: any) {
    addLog({
      method: 'POST',
      url: `/distribution/orders/${shipOrderForm.id}/ship`,
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleCancelOrder = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.cancelOrder(cancelOrderForm.id)
    addLog({
      method: 'POST',
      url: `/distribution/orders/${cancelOrderForm.id}/cancel`,
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('取消成功')
    showCancelOrder.value = false
  } catch (e: any) {
    addLog({
      method: 'POST',
      url: `/distribution/orders/${cancelOrderForm.id}/cancel`,
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}

// AI 识别接口测试
const testGetRecognitionHistory = async () => {
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.getRecognitionHistory({ page: 1, limit: 10 })
    addLog({
      method: 'GET',
      url: '/distribution/recognition-history?page=1&limit=10',
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
  } catch (e: any) {
    addLog({
      method: 'GET',
      url: '/distribution/recognition-history',
      duration: Date.now() - startTime,
      error: e.message,
    })
  } finally {
    loading.value = false
  }
}

const handleFileChange = (file: any) => {
  selectedFile.value = file.raw
  previewUrl.value = URL.createObjectURL(file.raw)
}

const handleAiRecognize = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先上传图片')
    return
  }
  loading.value = true
  const startTime = Date.now()
  try {
    const res = await api.aiRecognize(selectedFile.value)
    addLog({
      method: 'POST',
      url: '/distribution/inventory/ai-recognize',
      status: 200,
      duration: Date.now() - startTime,
      response: res,
    })
    ElMessage.success('识别成功')
    showAiRecognize.value = false
  } catch (e: any) {
    addLog({
      method: 'POST',
      url: '/distribution/inventory/ai-recognize',
      duration: Date.now() - startTime,
      error: e.response?.data?.message || e.message,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.test-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .api-tabs {
    margin-bottom: 20px;
  }
  .api-group {
    padding: 16px 0;
  }
  .log-container {
    background: #1e1e1e;
    border-radius: 8px;
    padding: 16px;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
  }
  .log-item {
    padding: 8px;
    border-bottom: 1px solid #333;
    &:last-child {
      border-bottom: none;
    }
    .log-time {
      color: #888;
      margin-right: 12px;
    }
    .log-method {
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 12px;
      &.get { background: #61affe; color: #fff; }
      &.post { background: #49cc90; color: #fff; }
      &.put { background: #fca130; color: #fff; }
      &.patch { background: #50e3c2; color: #333; }
      &.delete { background: #f93e3e; color: #fff; }
    }
    .log-url {
      color: #e6e6e6;
    }
    .log-status {
      margin-left: 12px;
      padding: 2px 8px;
      border-radius: 4px;
      &.success { background: #49cc90; color: #fff; }
      &.error { background: #f93e3e; color: #fff; }
    }
    .log-duration {
      color: #888;
      margin-left: 12px;
    }
    .log-response {
      margin-top: 8px;
      pre {
        background: #2d2d2d;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        color: #9cdcfe;
        max-height: 200px;
      }
    }
    .log-error {
      margin-top: 8px;
      color: #f93e3e;
      padding: 8px;
      background: rgba(249, 62, 62, 0.1);
      border-radius: 4px;
    }
  }
  .log-empty {
    color: #666;
    text-align: center;
    padding: 40px;
  }
  .upload-area {
    :deep(.el-upload-dragger) {
      padding: 40px;
      background: #fafafa;
    }
    .upload-placeholder {
      text-align: center;
      color: #666;
      .upload-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: #999;
      }
    }
    .preview-container {
      text-align: center;
      .preview-image {
        max-width: 100%;
        max-height: 200px;
      }
    }
  }
}

html.dark {
  .test-page {
    .log-container {
      background: #0d0d0d;
    }
    .log-item {
      border-bottom-color: #222;
      .log-response pre {
        background: #1a1a1a;
      }
    }
    .upload-area :deep(.el-upload-dragger) {
      background: #1f1f1f;
    }
  }
}
</style>
