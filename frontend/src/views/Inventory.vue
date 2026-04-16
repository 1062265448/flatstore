<template>
  <div class="inventory-page">
    <!-- 搜索筛选 -->
    <el-card shadow="never" class="search-card">
      <el-form inline :model="queryForm">
        <el-form-item label="关键词">
          <el-input v-model="queryForm.keyword" placeholder="批号/品级/规格" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="品级">
          <el-input v-model="queryForm.grade" placeholder="品级" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable>
            <el-option label="可用" value="available" />
            <el-option label="已预留" value="reserved" />
            <el-option label="已发货" value="shipped" />
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
      <el-button type="primary" @click="handleCreate">新增库存</el-button>
      <el-button type="danger" :disabled="!selectedRows.length" @click="handleBatchDelete">批量删除</el-button>
      <span v-if="selectedRows.length" class="selection-info">已选择 {{ selectedRows.length }} 项</span>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table
        v-loading="inventoryStore.loading"
        :data="inventoryStore.inventoryList"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="batchNo" label="批号" min-width="120" />
        <el-table-column prop="grade" label="品级" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.grade }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="specification" label="规格" min-width="120" />
        <el-table-column prop="weight" label="重量(吨)" width="100">
          <template #default="{ row }">
            {{ Number(row.weight).toFixed(3) }}
          </template>
        </el-table-column>
        <el-table-column prop="pieceCount" label="片数" width="80" />
        <el-table-column prop="location" label="位置" min-width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType[row.status]">{{ statusLabel[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.limit"
          :total="inventoryStore.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item prop="batchNo" label="批号">
          <el-input v-model="form.batchNo" placeholder="请输入批号" />
        </el-form-item>
        <el-form-item prop="grade" label="品级">
          <el-input v-model="form.grade" placeholder="请输入品级" />
        </el-form-item>
        <el-form-item prop="specification" label="规格">
          <el-input v-model="form.specification" placeholder="请输入规格" />
        </el-form-item>
        <el-form-item prop="productType" label="产品类型">
          <el-input v-model="form.productType" placeholder="请输入产品类型" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item prop="weight" label="重量(吨)">
              <el-input-number v-model="form.weight" :min="0" :precision="3" placeholder="重量" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item prop="pieceCount" label="片数">
              <el-input-number v-model="form.pieceCount" :min="0" placeholder="片数" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item prop="location" label="存放位置">
          <el-input v-model="form.location" placeholder="请输入存放位置" />
        </el-form-item>
        <el-form-item prop="nickelContent" label="镍含量">
          <el-input v-model="form.nickelContent" placeholder="请输入镍含量" />
        </el-form-item>
        <el-form-item prop="remark" label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { InventoryStock, CreateInventoryDto } from '@/types'

const inventoryStore = useInventoryStore()

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
const formRef = ref<FormInstance>()

const form = reactive<CreateInventoryDto>({
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

const rules: FormRules = {
  batchNo: [{ required: true, message: '请输入批号', trigger: 'blur' }],
  grade: [{ required: true, message: '请输入品级', trigger: 'blur' }],
  weight: [{ required: true, message: '请输入重量', trigger: 'blur' }],
  pieceCount: [{ required: true, message: '请输入片数', trigger: 'blur' }],
}

const statusType: Record<string, '' | 'success' | 'warning' | 'info'> = {
  available: 'success',
  reserved: 'warning',
  shipped: 'info',
}

const statusLabel: Record<string, string> = {
  available: '可用',
  reserved: '已预留',
  shipped: '已发货',
}

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
  handleSearch()
}

const handleSelectionChange = (rows: InventoryStock[]) => {
  selectedRows.value = rows
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
    batchNo: row.batchNo,
    grade: row.grade,
    specification: row.specification,
    productType: row.productType,
    weight: Number(row.weight),
    pieceCount: row.pieceCount,
    location: row.location,
    nickelContent: row.nickelContent,
    remark: row.remark,
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (isEdit.value && currentId.value) {
        await inventoryStore.updateInventory(currentId.value, form)
      } else {
        await inventoryStore.createInventory(form)
      }
      dialogVisible.value = false
    } catch (e) {
      // 错误已在 API 层处理
    }
  })
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该库存记录?', '提示', { type: 'warning' })
    await inventoryStore.deleteInventory(id)
  } catch {
    // 用户取消
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 条记录?`, '提示', {
      type: 'warning',
    })
    const ids = selectedRows.value.map((r) => r.id)
    await inventoryStore.batchDelete(ids)
    selectedRows.value = []
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
}
</style>
