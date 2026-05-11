<template>
  <div class="detail-page">
    <div class="detail-header">
      <button class="back-btn" @click="router.back()">返回</button>
      <h2 class="detail-title">库存详情</h2>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner spinner-lg"></div>
    </div>

    <div v-else-if="item" class="detail-body">
      <div class="detail-card">
        <div class="detail-head">
          <span class="detail-batch">{{ item.batchNo }}</span>
          <span class="detail-tag" :class="gradeTagClass">{{ item.grade }}</span>
        </div>

        <div class="detail-grid">
          <div class="detail-field">
            <span class="field-lbl">包号</span>
            <span class="field-val">{{ item.packageNo || '-' }}</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">重量</span>
            <span class="field-val">{{ Number(item.weight).toFixed(3) }} 吨</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">块数</span>
            <span class="field-val">{{ item.pieceCount }}</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">位置</span>
            <span class="field-val">{{ item.location || '-' }}</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">产品类型</span>
            <span class="field-val">{{ item.productType || '-' }}</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">规格</span>
            <span class="field-val">{{ item.specification || '-' }}</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">镍含量</span>
            <span class="field-val">{{ item.nickelContent || '-' }}</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">状态</span>
            <span class="field-val"><StatusChip :type="statusType" :label="statusLabel" /></span>
          </div>
          <div class="detail-field full">
            <span class="field-lbl">备注</span>
            <span class="field-val">{{ item.remark || '-' }}</span>
          </div>
          <div class="detail-field">
            <span class="field-lbl">创建时间</span>
            <span class="field-val">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="detail-actions">
        <button class="action-btn edit" @click="showEditSheet = true">编辑</button>
        <button class="action-btn delete" @click="handleDelete">删除</button>
      </div>
    </div>

    <!-- 编辑 Bottom Sheet -->
    <BottomSheet :visible="showEditSheet" @close="showEditSheet = false">
      <h2 class="sheet-title">编辑库存</h2>
      <div class="edit-form">
        <div class="form-group">
          <label>批号</label>
          <input v-model="editForm.batchNo" class="form-input" />
        </div>
        <div class="form-group">
          <label>品级</label>
          <select v-model="editForm.grade" class="form-input">
            <option value="9997">9997</option>
            <option value="9996">9996</option>
            <option value="9950">9950</option>
            <option value="9920">9920</option>
          </select>
        </div>
        <div class="form-group">
          <label>重量(吨)</label>
          <input v-model.number="editForm.weight" type="number" step="0.001" class="form-input" />
        </div>
        <div class="form-group">
          <label>块数</label>
          <input v-model.number="editForm.pieceCount" type="number" class="form-input" />
        </div>
        <div class="form-group">
          <label>位置</label>
          <input v-model="editForm.location" class="form-input" />
        </div>
        <div class="form-group">
          <label>备注</label>
          <textarea v-model="editForm.remark" rows="3" class="form-input"></textarea>
        </div>
        <button class="btn-submit" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </BottomSheet>

    <!-- 删除确认 -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="showDeleteConfirm = false">
          <div class="confirm-dialog">
            <h3>确认删除</h3>
            <p>删除后将无法恢复，确定要删除该库存记录吗？</p>
            <div class="confirm-actions">
              <button class="confirm-btn cancel" @click="showDeleteConfirm = false">取消</button>
              <button class="confirm-btn danger" @click="confirmDelete">删除</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getInventoryById } from '@/api/distribution'
import { useInventoryStore } from '@/stores/inventory'
import { useToast } from '@/composables/useToast'
import type { InventoryStock, UpdateInventoryDto } from '@/types'
import StatusChip from '@/components/StatusChip.vue'
import BottomSheet from '@/components/BottomSheet.vue'

const router = useRouter()
const route = useRoute()
const inventoryStore = useInventoryStore()
const { success, danger } = useToast()

const item = ref<InventoryStock | null>(null)
const loading = ref(true)
const showEditSheet = ref(false)
const showDeleteConfirm = ref(false)
const saving = ref(false)

const editForm = reactive<UpdateInventoryDto>({
  batchNo: '',
  grade: '',
  weight: 0,
  pieceCount: 0,
  location: '',
  remark: '',
})

const gradeTagClass = computed(() => {
  const g = item.value?.grade || ''
  if (g.includes('9997') || g.includes('9996')) return 'tag-9996'
  if (g.includes('9950')) return 'tag-9950'
  return 'tag-other'
})

const statusType = computed(() => {
  const map: Record<string, 'green' | 'amber' | 'gray'> = { available: 'green', reserved: 'amber', shipped: 'gray' }
  return map[item.value?.status || ''] || 'gray'
})

const statusLabel = computed(() => {
  const map: Record<string, string> = { available: '可用', reserved: '预留', shipped: '已发货' }
  return map[item.value?.status || ''] || item.value?.status || ''
})

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(async () => {
  try {
    const id = Number(route.params.id)
    item.value = await getInventoryById(id) as any
    if (item.value) {
      Object.assign(editForm, {
        batchNo: item.value.batchNo,
        grade: item.value.grade,
        weight: Number(item.value.weight),
        pieceCount: item.value.pieceCount,
        location: item.value.location || '',
        remark: item.value.remark || '',
      })
    }
  } catch {
    danger('加载失败')
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  if (!item.value) return
  saving.value = true
  try {
    await inventoryStore.updateInventory(item.value.id, editForm)
    success('保存成功')
    showEditSheet.value = false
    item.value = await getInventoryById(item.value.id) as any
  } catch {
    danger('保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = () => {
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!item.value) return
  try {
    await inventoryStore.deleteInventory(item.value.id)
    success('已删除')
    router.back()
  } catch {
    danger('删除失败')
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--bg);
}
.detail-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back-btn {
  font-size: 15px;
  color: var(--accent);
  font-weight: 500;
  margin-right: 16px;
}
.detail-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.3px;
}
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.detail-body {
  padding: 20px;
  padding-top: calc(56px + var(--safe-top));
  padding-bottom: 100px;
}
.detail-card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 20px;
}
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.detail-batch {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}
.detail-tag {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.tag-9996 { background: var(--accent-soft); color: var(--accent); }
.tag-9950 { background: var(--amber-soft); color: var(--amber); }
.tag-other { background: var(--green-soft); color: var(--green); }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-field.full {
  grid-column: 1 / -1;
}
.field-lbl {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  font-weight: 500;
}
.field-val {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.action-btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.15s;
}
.action-btn:active { transform: scale(0.98); }
.action-btn.edit {
  background: var(--accent-soft);
  color: var(--accent);
}
.action-btn.delete {
  background: var(--red-soft);
  color: var(--red);
}

/* Edit sheet */
.sheet-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
  margin-bottom: 20px;
}
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-input {
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 14px;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  outline: none;
}
.form-input:focus { border-color: var(--accent); }
textarea.form-input { height: auto; padding: 10px 14px; resize: none; }
select.form-input { cursor: pointer; }
.btn-submit {
  height: 48px;
  background: var(--text);
  color: white;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 8px;
}
.btn-submit:active { transform: scale(0.98); }
.btn-submit:disabled { opacity: 0.5; }

/* Confirm dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}
.confirm-dialog {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 24px;
  width: 100%;
  max-width: 320px;
}
.confirm-dialog h3 {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 8px;
}
.confirm-dialog p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}
.confirm-actions {
  display: flex;
  gap: 10px;
}
.confirm-btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
}
.confirm-btn.cancel { background: var(--border); color: var(--text); }
.confirm-btn.danger { background: var(--red); color: white; }
</style>
