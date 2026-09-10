<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content modal-lg glass-card">
          <div class="modal-header">
            <h3 class="modal-title">识别详情</h3>
            <button class="modal-close" @click="close">✕</button>
          </div>

          <div class="modal-body" v-if="history">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">ID</span>
                <span class="detail-value">{{ history.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态</span>
                <span :class="['tag', history.status === 'success' ? 'tag-success' : 'tag-danger']">
                  {{ history.status === 'success' ? '成功' : '失败' }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">识别数量</span>
                <span class="detail-value">{{ history.itemCount }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">批号</span>
                <span class="detail-value">{{ history.batchNo || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">品级</span>
                <span class="detail-value">{{ history.grade || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">识别时间</span>
                <span class="detail-value">{{ formatDate(history.createdAt) }}</span>
              </div>
              <div v-if="history.errorMessage" class="detail-item full-width">
                <span class="detail-label">错误信息</span>
                <span class="detail-value text-danger">{{ history.errorMessage }}</span>
              </div>
            </div>

            <div v-if="parsedResults.length" class="result-section">
              <h4>识别结果</h4>
              <div class="results-table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>包号</th>
                      <th>批号</th>
                      <th>品级</th>
                      <th>规格</th>
                      <th>产品类型</th>
                      <th>片数</th>
                      <th>净重(kg)</th>
                      <th>日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, i) in parsedResults" :key="i">
                      <td>{{ item.packageNo || '-' }}</td>
                      <td class="batch-no">{{ item.batchNo || '-' }}</td>
                      <td><span class="tag tag-info">{{ item.grade || '-' }}</span></td>
                      <td>{{ item.specification || '-' }}</td>
                      <td>{{ item.productType || '-' }}</td>
                      <td>{{ item.pieceCount || '-' }}</td>
                      <td class="weight">{{ (item.netWeight || 0).toFixed(1) }}</td>
                      <td>{{ item.date || '-' }}</td>
                    </tr>
                  </tbody>
                  <tfoot v-if="parsedResults.length">
                    <tr class="summary-row">
                      <td colspan="6" class="summary-label">合计</td>
                      <td class="weight">{{ parsedTotalWeight }} kg</td>
                      <td v-if="parsedTotalPieces > 0">{{ parsedTotalPieces }}块</td>
                      <td v-else>-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div v-if="history.imageUrl" class="image-section">
              <h4>原始图片</h4>
              <img :src="history.imageUrl" class="detail-image" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-pill btn-ghost" @click="close">关闭</button>
            <button
              v-if="parsedResults.length"
              class="btn-pill btn-primary"
              @click="handleImport"
            >导入库存</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeProductType, isRangePackageNo } from '@/utils/stock'
import type { OcrRecognitionHistory, OcrRecognizeResult } from '@/types'

const props = defineProps<{
  modelValue: boolean
  history: OcrRecognitionHistory | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 点击「导入库存」，回传解析后的结果与历史记录 */
  import: [results: OcrRecognizeResult[], history: OcrRecognitionHistory]
}>()

const close = () => emit('update:modelValue', false)

const parsedResults = computed<OcrRecognizeResult[]>(() => {
  if (!props.history?.result) return []
  try {
    const raw = typeof props.history.result === 'string'
      ? JSON.parse(props.history.result)
      : props.history.result
    // 统一产品类型名称
    return (Array.isArray(raw) ? raw : []).map((item: any) => ({
      ...item,
      productType: item.productType ? normalizeProductType(item.productType) : '',
    }))
  } catch {
    return []
  }
})

const parsedTotalWeight = computed(() =>
  parsedResults.value.reduce((sum, r: any) => sum + (r.netWeight || 0), 0).toFixed(1)
)
const parsedTotalPieces = computed(() => {
  if (parsedResults.value.some((r: any) => isRangePackageNo(r.packageNo))) return 0
  return parsedResults.value.reduce((sum, r: any) => sum + (r.pieceCount || 0), 0)
})

const handleImport = () => {
  if (!props.history || !parsedResults.value.length) return
  close()
  emit('import', [...parsedResults.value], props.history)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}
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

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  &.full-width {
    grid-column: span 2;
  }

  .detail-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-value {
    font-size: var(--font-size-base);
    color: var(--color-text-primary);

    &.text-danger {
      color: var(--color-danger);
    }
  }
}

.result-section,
.image-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-divider);

  h4 {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }
}

.results-table-wrap {
  max-height: 300px;
  overflow-y: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
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

  .batch-no {
    font-weight: 500;
    font-family: monospace;
  }

  .weight {
    font-family: monospace;
    color: var(--color-text-primary);
  }

  .summary-row {
    background: var(--color-bg-tertiary);
    font-weight: 600;

    .summary-label {
      text-align: right;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }

    .weight {
      font-family: var(--font-mono);
      color: var(--color-primary);
    }
  }
}

.detail-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: var(--radius-md);
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
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-item.full-width {
    grid-column: span 1;
  }
}
</style>
