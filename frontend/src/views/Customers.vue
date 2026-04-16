<template>
  <div class="customers-page">
    <!-- 操作按钮 -->
    <el-card shadow="never" class="action-card">
      <el-button type="primary" @click="handleCreate">新增客户</el-button>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table v-loading="customerStore.loading" :data="customerStore.customers">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="客户名称" min-width="150">
          <template #default="{ row }">
            <el-tag type="success">{{ row.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="120" />
        <el-table-column prop="phone" label="电话" width="150" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
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
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item prop="name" label="客户名称">
          <el-input v-model="form.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item prop="contact" label="联系人">
          <el-input v-model="form.contact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item prop="phone" label="电话">
          <el-input v-model="form.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item prop="address" label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
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
import { ref, reactive, onMounted } from 'vue'
import { useCustomerStore } from '@/stores/customer'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { Customer, CreateCustomerDto } from '@/types'

const customerStore = useCustomerStore()

const selectedRows = ref<Customer[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增客户')
const isEdit = ref(false)
const currentId = ref<number>()
const formRef = ref<FormInstance>()

const form = reactive<CreateCustomerDto>({
  name: '',
  contact: '',
  phone: '',
  address: '',
  remark: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const handleCreate = () => {
  dialogTitle.value = '新增客户'
  isEdit.value = false
  currentId.value = undefined
  Object.assign(form, {
    name: '',
    contact: '',
    phone: '',
    address: '',
    remark: '',
  })
  dialogVisible.value = true
}

const handleEdit = (row: Customer) => {
  dialogTitle.value = '编辑客户'
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, {
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    address: row.address,
    remark: row.remark,
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (isEdit.value && currentId.value) {
      await customerStore.updateCustomer(currentId.value, form)
    } else {
      await customerStore.createCustomer(form)
    }
    dialogVisible.value = false
  })
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该客户?', '提示', { type: 'warning' })
    await customerStore.deleteCustomer(id)
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  customerStore.fetchCustomers()
})
</script>

<style scoped lang="scss">
.customers-page {
  .action-card {
    margin-bottom: 16px;
    .el-card__body {
      padding: 12px 20px;
    }
  }
}
</style>
