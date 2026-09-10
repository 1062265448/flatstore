<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content modal-lg glass-card">
          <div class="modal-header">
            <h3 class="modal-title">批量导入库存</h3>
            <button class="modal-close" @click="close">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-item">
                <label>统一批号</label>
                <input v-model="importForm.batchNo" type="text" placeholder="为空则使用识别结果中的批号" />
              </div>
              <div class="form-item">
                <label>统一品级</label>
                <select v-model="importForm.grade" class="grade-select">
                  <option value="">使用识别结果中的品级</option>
                  <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option>
                </select>
              </div>
              <div class="form-item">
                <label>规格</label>
                <div class="chip-select">
                  <button
                    v-for="opt in specOptions"
                    :key="opt.value"
                    :class="['chip', { active: importForm.specification === opt.value }]"
                    @click="importForm.specification = importForm.specification === opt.value ? '' : opt.value"
                  >
                    <span class="chip-icon">{{ opt.icon }}</span>
                    <span class="chip-label">{{ opt.label }}</span>
                  </button>
                </div>
              </div>
              <div class="form-item">
                <label>存放位置</label>
                <div class="chip-select">
                  <button
                    v-for="opt in locationOptions"
                    :key="opt.value"
                    :class="['chip chip-location', { active: importForm.location === opt.value }]"
                    @click="importForm.location = importForm.location === opt.value ? '' : opt.value"
                  >
                    <span class="chip-dot" :style="{ background: opt.color }"></span>
                    <span class="chip-label">{{ opt.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="preview-table">
              <h4>导入预览</h4>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>批号</th>
                    <th>品级</th>
                    <th>规格</th>
                    <th>产品类型</th>
                    <th>片数</th>
                    <th>净重(kg)</th>
                    <th>存放位置</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in results" :key="index">
                    <td>{{ importForm.batchNo || item.batchNo || '-' }}</td>
                    <td>{{ importForm.grade || item.grade || '-' }}</td>
                    <td>{{ importForm.specification || '-' }}</td>
                    <td>{{ item.productType || '-' }}</td>
                    <td>{{ item.pieceCount || '-' }}</td>
                    <td>{{ (item.netWeight || 0).toFixed(1) }}</td>
                    <td>{{ importForm.location || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-pill btn-ghost" @click="close">取消</button>
            <button class="btn-pill btn-primary" :disabled="importing" @click="handleImportSubmit">
              {{ importing ? '导入中...' : '确认导入' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { batchCreateInventory } from '@/api/distribution'
import { isRangePackageNo } from '@/utils/stock'
import type { OcrRecognizeResult, CreateInventoryDto } from '@/types'

const props = defineProps<{
  modelValue: boolean
  /** 待导入的识别结果 */
  results: OcrRecognizeResult[]
  /** 关联的识别历史 ID（可空） */
  historyId: number | null
  /** 原始图片 URL（可空） */
  sourceImage: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  imported: [count: number]
}>()

const importing = ref(false)
const importForm = reactive({
  batchNo: '',
  grade: '',
  specification: '',
  location: '',
})

const specOptions = [
  { value: '整板', label: '整板', icon: '▣' },
  { value: '镍条', label: '镍条', icon: '▬' },
  { value: '100×100', label: '100×100', icon: '⊞' },
  { value: '50×50', label: '50×50', icon: '⊟' },
  { value: '25×25', label: '25×25', icon: '▪' },
]

const locationOptions = [
  { value: '二厂区', label: '二厂区', color: '#3b82f6' },
  { value: '三厂区', label: '三厂区', color: '#10b981' },
]

const gradeOptions = ['9997', '9996', '9950', '9920']

const close = () => emit('update:modelValue', false)

const handleImportSubmit = async () => {
  if (!props.results.length) return

  importing.value = true
  try {
    const isSmallBlock = props.results.some(r => isRangePackageNo(r.packageNo))

    const items: CreateInventoryDto[] = props.results.map((r) => ({
      packageNo: String(r.packageNo || ''),
      batchNo: importForm.batchNo || String(r.batchNo || ''),
      grade: importForm.grade || r.grade || '',
      specification: importForm.specification || r.specification || '',
      productType: r.productType || '',
      weight: (r.netWeight || 0) as number,
      pieceCount: isSmallBlock ? undefined : (r.pieceCount || 0),
      location: importForm.location,
      sourceType: 'ocr_recognize',
      sourceImage: props.sourceImage,
    }))

    await batchCreateInventory({ items, recognitionHistoryId: props.historyId || undefined })
    close()
    emit('imported', items.length)
  } catch {
    // 错误已在 API 层处理
  } finally {
    importing.value = false
  }
}

// 弹窗打开时重置表单，并根据识别结果自动填充规格
watch(() => props.modelValue, (visible) => {
  if (!visible) return
  importForm.batchNo = ''
  importForm.grade = ''
  importForm.location = ''
  const specs = [...new Set(props.results.map(r => r.specification).filter(Boolean))]
  importForm.specification = specs.length === 1 ? specs[0]! : ''
})
</script>

<style scoped lang="scss">
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

  &.modal-lg {
    max-width: 700px;
  }
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
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

  input, select {
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
      box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
    }

    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }
}

/* Chip selector（规格/存放位置） */
.chip-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-family: inherit;
  transition: all var(--transition-fast);
  user-select: none;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(0, 113, 227, 0.04);
  }

  &.active {
    border-color: var(--color-primary);
    background: rgba(0, 113, 227, 0.08);
    color: var(--color-primary);
    font-weight: 600;
    box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.12);
  }

  .chip-icon {
    font-size: 16px;
    line-height: 1;
  }

  .chip-label {
    line-height: 1;
  }
}

.chip-location {
  &.active .chip-dot {
    box-shadow: 0 0 0 3px currentColor;
  }
}

.chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: box-shadow var(--transition-fast);
}

.preview-table {
  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
}

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
}

// 弹窗动画
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;

  .modal-content {
    transition: transform 0.3s ease, opacity 0.3s ease;
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

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-item.full-width {
    grid-column: span 1;
  }
}
</style>
