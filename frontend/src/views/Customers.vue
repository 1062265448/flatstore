<template>
  <div class="page-container customers-page">
    <!-- 页面标题 -->
    <div class="page-header fade-in">
      <h1 class="page-title">客户管理</h1>
      <p class="page-subtitle">管理所有客户信息</p>
    </div>

    <!-- 操作区 -->
    <div class="toolbar glass-card fade-in" :style="{ animationDelay: '0.1s' }">
      <div class="action-section">
        <button class="btn-pill btn-primary" @click="handleCreate">
          <span class="btn-icon">+</span> 新增客户
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card glass-card fade-in" :style="{ animationDelay: '0.2s' }">
      <div v-if="customerStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>客户名称</th>
            <th>联系人</th>
            <th>电话</th>
            <th>地址</th>
            <th>备注</th>
            <th>创建时间</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in customerStore.customers"
            :key="row.id"
            class="table-row"
            :style="{ animationDelay: `${0.3 + index * 0.03}s` }"
          >
            <td class="id-col">{{ row.id }}</td>
            <td><span class="tag tag-success">{{ row.name }}</span></td>
            <td>{{ row.contact || '-' }}</td>
            <td class="phone">{{ row.phone || '-' }}</td>
            <td class="address" :title="row.address">{{ row.address || '-' }}</td>
            <td class="remark" :title="row.remark">{{ row.remark || '-' }}</td>
            <td class="time">{{ formatDate(row.createdAt) }}</td>
            <td class="action-col">
              <button class="action-btn" @click="handleEdit(row)">
                <span class="btn-icon">✎</span> 编辑
              </button>
              <button class="action-btn danger" @click="handleDelete(row.id)">
                <span class="btn-icon">🗑</span> 删除
              </button>
            </td>
          </tr>
          <tr v-if="!customerStore.customers.length">
            <td colspan="8" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.4">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="empty-text">暂无客户数据</span>
                <span class="empty-hint">点击上方按钮添加客户</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
                <div class="form-item full-width">
                  <label>客户名称 *</label>
                  <input v-model="form.name" type="text" placeholder="请输入客户名称" />
                </div>
                <div class="form-item">
                  <label>联系人</label>
                  <input v-model="form.contact" type="text" placeholder="请输入联系人" />
                </div>
                <div class="form-item">
                  <label>电话</label>
                  <input v-model="form.phone" type="text" placeholder="请输入电话" />
                </div>
                <div class="form-item full-width">
                  <label>地址</label>
                  <input v-model="form.address" type="text" placeholder="请输入地址" />
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
import { ref, reactive, inject, onMounted } from 'vue'
import { useCustomerStore } from '@/stores/customer'
import { ElMessageBox } from 'element-plus'
import type { Customer, CreateCustomerDto } from '@/types'

const customerStore = useCustomerStore()
const showToast = inject('showToast') as (message: string, type?: string) => void

const dialogVisible = ref(false)
const dialogTitle = ref('新增客户')
const isEdit = ref(false)
const currentId = ref<number>()

const form = reactive<CreateCustomerDto>({
  name: '',
  contact: '',
  phone: '',
  address: '',
  remark: '',
})

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
  if (!form.name) {
    showToast?.('请输入客户名称', 'warning')
    return
  }
  try {
    if (isEdit.value && currentId.value) {
      await customerStore.updateCustomer(currentId.value, form)
      showToast?.('更新成功', 'success')
    } else {
      await customerStore.createCustomer(form)
      showToast?.('创建成功', 'success')
    }
    dialogVisible.value = false
    customerStore.fetchCustomers()
  } catch {
    // 错误已在 API 层处理
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该客户?', '提示', { type: 'warning' })
    await customerStore.deleteCustomer(id)
    showToast?.('删除成功', 'success')
    customerStore.fetchCustomers()
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
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-2xl);
}

// ==================== 页面标题 ====================
.page-header {
  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
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

// ==================== 工具栏 ====================
.toolbar {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

.action-section {
  display: flex;
  gap: var(--spacing-sm);
}

.btn-icon {
  font-size: 14px;
}

// ==================== 表格 ====================
.table-card {
  overflow: hidden;
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
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
    padding: 14px 16px;
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
    animation: fadeIn 0.4s ease forwards;
    opacity: 0;
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-bg-hover);
      transform: scale(1.005);
    }
  }

  .id-col {
    font-family: monospace;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .phone {
    font-family: monospace;
  }

  .address,
  .remark {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .time {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .action-col {
    width: 180px;
    white-space: nowrap;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;

  .btn-icon {
    font-size: 12px;
  }

  &:hover {
    background: rgba(0, 113, 227, 0.1);
    transform: translateY(-1px);
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
    font-size: var(--font-size-md);
  }

  .empty-hint {
    color: var(--color-text-tertiary);
    font-size: var(--font-size-sm);
  }
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
  textarea {
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
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-item.full-width {
    grid-column: span 1;
  }

  .data-table {
    .address,
    .remark {
      max-width: 120px;
    }
  }
}
</style>
