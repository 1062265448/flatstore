<template>
  <div class="orders-page">
    <!-- 搜索筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form inline :model="queryForm">
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable>
            <el-option label="草稿" value="draft" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="发货中" value="shipping" />
            <el-option label="已发货" value="shipped" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="queryForm.customerId" placeholder="全部客户" clearable filterable>
            <el-option v-for="c in customerStore.customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
    <el-card shadow="never" class="action-card">
      <el-button type="primary" @click="handleCreate">新增配货单</el-button>
      <el-button type="danger" :disabled="!selectedRows.length" @click="handleBatchDelete">批量删除</el-button>
      <span v-if="selectedRows.length" class="selection-info">已选择 {{ selectedRows.length }} 项</span>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table
        v-loading="orderStore.loading"
        :data="orderStore.orderList"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="orderNo" label="单号" min-width="180" />
        <el-table-column prop="customerName" label="客户" width="150">
          <template #default="{ row }">
            {{ row.customer?.name || row.customerName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="targetGrade" label="目标品级" width="100">
          <template #default="{ row }">
            {{ row.targetGrade || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="totalWeight" label="总重量" width="100">
          <template #default="{ row }">
            {{ row.totalWeight ? Number(row.totalWeight).toFixed(3) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="totalPieces" label="总片数" width="80">
          <template #default="{ row }">
            {{ row.totalPieces || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType[row.status]">{{ statusLabel[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="driverName" label="司机" width="100">
          <template #default="{ row }">
            {{ row.driverName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="vehicleNo" label="车牌" width="100">
          <template #default="{ row }">
            {{ row.vehicleNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'draft'">
              <el-button link type="primary" @click.stop="handleEdit(row)">编辑</el-button>
              <el-button link type="success" @click.stop="handleConfirm(row.id)">确认</el-button>
              <el-button link type="danger" @click.stop="handleCancel(row.id)">取消</el-button>
            </template>
            <template v-else-if="row.status === 'confirmed'">
              <el-button link type="warning" @click.stop="handleShip(row)">发货</el-button>
              <el-button link type="danger" @click.stop="handleCancel(row.id)">取消</el-button>
            </template>
            <template v-else-if="row.status === 'shipping'">
              <el-button link type="success" @click.stop="handleDeliver(row.id)">完成发运</el-button>
            </template>
            <template v-else-if="row.status === 'shipped' || row.status === 'cancelled'">
              <el-button link type="primary" @click.stop="handleView(row)">查看</el-button>
            </template>
            <el-button link type="danger" @click.stop="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.limit"
          :total="orderStore.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item prop="customerId" label="客户">
          <el-select v-model="form.customerId" placeholder="请选择客户" filterable style="width: 100%">
            <el-option v-for="c in customerStore.customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item prop="targetGrade" label="目标品级">
          <el-input v-model="form.targetGrade" placeholder="请输入目标品级" />
        </el-form-item>
        <el-form-item prop="productSpec" label="产品规格">
          <el-input v-model="form.productSpec" placeholder="请输入产品规格" />
        </el-form-item>
        <el-form-item prop="remark" label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>

        <!-- 配货明细 -->
        <el-divider content-position="left">配货明细</el-divider>
        <div class="order-items">
          <el-table :data="form.items" border size="small">
            <el-table-column label="库存批次" min-width="200">
              <template #header>
                <span class="required">*</span> 库存批次
              </template>
              <template #default="{ row, $index }">
                <el-select
                  v-model="row.stockId"
                  placeholder="选择库存"
                  filterable
                  style="width: 100%"
                  @change="handleStockSelect($index)"
                >
                  <el-option
                    v-for="s in availableStocks"
                    :key="s.id"
                    :label="`${s.batchNo} - ${s.grade} - ${s.weight}吨`"
                    :value="s.id"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="重量(吨)" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.weight" :min="0" :precision="3" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="pieceCount" label="片数" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.pieceCount" :min="0" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button link type="danger" @click="handleRemoveItem($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" text @click="handleAddItem" style="margin-top: 10px">
            <el-icon><Plus /></el-icon> 添加明细
          </el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewVisible" title="配货单详情" width="900px">
      <el-descriptions :column="2" border v-if="currentOrder">
        <el-descriptions-item label="单号">{{ currentOrder.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType[currentOrder.status]">{{ statusLabel[currentOrder.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="客户">{{ currentOrder.customer?.name || currentOrder.customerName }}</el-descriptions-item>
        <el-descriptions-item label="目标品级">{{ currentOrder.targetGrade || '-' }}</el-descriptions-item>
        <el-descriptions-item label="总重量">{{ currentOrder.totalWeight ? Number(currentOrder.totalWeight).toFixed(3) + '吨' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="总片数">{{ currentOrder.totalPieces || '-' }}</el-descriptions-item>
        <el-descriptions-item label="司机">{{ currentOrder.driverName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="车牌">{{ currentOrder.vehicleNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货时间" :span="2">
          {{ currentOrder.shippedAt ? formatDate(currentOrder.shippedAt) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentOrder.remark || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">配货明细</el-divider>
      <el-table v-if="currentOrder?.items" :data="currentOrder.items" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="批号" min-width="150">
          <template #default="{ row }">
            {{ row.stock?.batchNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="品级" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.stock?.grade || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="重量(吨)" width="120">
          <template #default="{ row }">
            {{ Number(row.weight).toFixed(3) }}
          </template>
        </el-table-column>
        <el-table-column prop="pieceCount" label="片数" width="100" />
      </el-table>
    </el-dialog>

    <!-- 发货对话框 -->
    <el-dialog v-model="shipVisible" title="发货" width="500px">
      <el-form :model="shipForm" label-width="80px">
        <el-form-item label="司机">
          <el-input v-model="shipForm.driverName" placeholder="请输入司机姓名" />
        </el-form-item>
        <el-form-item label="车牌">
          <el-input v-model="shipForm.vehicleNo" placeholder="请输入车牌号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" @click="handleShipSubmit">确定发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useInventoryStore } from '@/stores/inventory'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { DistributionOrder, CreateOrderDto, OrderItemDto, ShipOrderDto } from '@/types'
import { Plus } from '@element-plus/icons-vue'

const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()

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
const formRef = ref<FormInstance>()
const availableStocks = ref<any[]>([])

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

const rules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
}

const statusType: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'info',
  confirmed: 'warning',
  shipping: '',
  shipped: 'success',
  cancelled: 'danger',
}

const statusLabel: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  shipping: '发货中',
  shipped: '已发货',
  cancelled: '已取消',
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const handleSearch = () => {
  orderStore.fetchOrders({
    page: queryForm.page,
    limit: queryForm.limit,
    status: queryForm.status || undefined,
    customerId: queryForm.customerId,
  })
}

const handleReset = () => {
  queryForm.status = ''
  queryForm.customerId = undefined
  handleSearch()
}

const handleSelectionChange = (rows: DistributionOrder[]) => {
  selectedRows.value = rows
}

const handleRowClick = (row: DistributionOrder) => {
  // 可以在这里添加行点击事件
}

const handleCreate = async () => {
  dialogTitle.value = '新增配货单'
  isEdit.value = false
  currentId.value = undefined
  Object.assign(form, {
    customerId: 0,
    customerName: '',
    targetGrade: '',
    productSpec: '',
    remark: '',
    items: [{ stockId: 0, weight: 0, pieceCount: 0 }],
  })
  // 加载可用库存
  await inventoryStore.fetchInventory({ page: 1, limit: 1000, status: 'available' })
  availableStocks.value = inventoryStore.inventoryList
  dialogVisible.value = true
}

const handleEdit = async (row: DistributionOrder) => {
  dialogTitle.value = '编辑配货单'
  isEdit.value = true
  currentId.value = row.id
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
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (!form.items.length || !form.items[0].stockId) {
      ElMessageBox.alert('请添加配货明细', '提示')
      return
    }
    try {
      if (isEdit.value && currentId.value) {
        await orderStore.updateOrder(currentId.value, form)
      } else {
        await orderStore.createOrder(form)
      }
      dialogVisible.value = false
    } catch {
      // 错误已在 API 层处理
    }
  })
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该配货单?', '提示', { type: 'warning' })
    await orderStore.deleteOrder(id)
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
  } catch {
    // 用户取消
  }
}

const handleConfirm = async (id: number) => {
  try {
    await ElMessageBox.confirm('确认该配货单?', '提示', { type: 'info' })
    await orderStore.confirmOrder(id)
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
}

const handleDeliver = async (id: number) => {
  try {
    await ElMessageBox.confirm('确认完成发运?', '提示', { type: 'info' })
    await orderStore.deliverOrder(id)
  } catch {
    // 用户取消
  }
}

const handleCancel = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定取消该配货单?', '提示', { type: 'warning' })
    await orderStore.cancelOrder(id)
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
  .search-card {
    margin-bottom: 16px;
  }
  .action-card {
    margin-bottom: 16px;
    .el-card__body {
      padding: 12px 20px;
    }
    .selection-info {
      margin-left: 16px;
      color: #999;
    }
  }
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  .order-items {
    .required {
      color: #f56c6c;
      margin-right: 4px;
    }
  }
}
</style>
