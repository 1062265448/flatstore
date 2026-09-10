<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content glass-card">
          <div class="modal-header">
            <h3 class="modal-title">{{ isEdit ? '编辑库存' : '新增库存' }}</h3>
            <button class="modal-close" @click="close">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-item">
                <label>批号 *</label>
                <input v-model="form.batchNo" type="text" placeholder="请输入批号" />
              </div>
              <div class="form-item">
                <label>品级 *</label>
                <select v-model="form.grade" class="form-select">
                  <option value="">请选择品级</option>
                  <option value="9997">9997</option>
                  <option value="9996">9996</option>
                  <option value="9950">9950</option>
                  <option value="9920">9920</option>
                </select>
              </div>
              <div class="form-item">
                <label>规格</label>
                <select v-model="form.specification" class="form-select">
                  <option value="">请选择规格</option>
                  <option value="整板">整板</option>
                  <option value="镍条">镍条</option>
                  <option value="100*100">100*100</option>
                  <option value="50*50">50*50</option>
                  <option value="25*25">25*25</option>
                </select>
              </div>
              <div class="form-item">
                <label>产品类型</label>
                <select v-model="form.productType" class="form-select">
                  <option value="">请选择产品类型</option>
                  <option v-for="t in PRODUCT_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="form-item">
                <label>重量(kg) *</label>
                <input v-model.number="form.weight" type="number" step="0.001" min="0" placeholder="0.000" />
              </div>
              <div class="form-item">
                <label>片数</label>
                <input v-model.number="form.pieceCount" type="number" min="0" placeholder="留空表示不适用" />
              </div>
              <div class="form-item full-width">
                <label>存放位置</label>
                <div class="location-select-wrap">
                  <select v-model="locationPreset" class="form-select" @change="onLocationPresetChange">
                    <option value="">自定义位置</option>
                    <option v-for="p in LOCATION_PRESETS" :key="p" :value="p">{{ p }}</option>
                  </select>
                  <input
                    v-model="form.location"
                    type="text"
                    placeholder="输入或选择位置"
                    class="location-input"
                  />
                </div>
              </div>
              <div class="form-item full-width">
                <label>备注</label>
                <textarea v-model="form.remark" rows="3" placeholder="备注信息"></textarea>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-pill btn-ghost" @click="close">取消</button>
            <button class="btn-pill btn-primary" @click="handleSubmit">确定</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { PRODUCT_TYPE_OPTIONS } from '@/constants/order'
import { LOCATION_PRESETS } from '@/constants/inventory'
import type { InventoryStock, CreateInventoryDto } from '@/types'

const props = defineProps<{
  modelValue: boolean
  /** 传入则为编辑模式，null 为新建 */
  editStock: InventoryStock | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const inventoryStore = useInventoryStore()
const showToast = inject('showToast') as (message: string, type?: string) => void

const isEdit = computed(() => props.editStock !== null)

const form = reactive<CreateInventoryDto>({
  batchNo: '',
  grade: '',
  specification: '',
  productType: '',
  weight: 0,
  pieceCount: undefined as number | undefined,
  location: '',
  remark: '',
})

const locationPreset = ref('')
const onLocationPresetChange = () => {
  if (locationPreset.value) {
    form.location = locationPreset.value
  }
}

const close = () => emit('update:modelValue', false)

const handleSubmit = async () => {
  if (!form.batchNo || !form.grade || !form.weight) {
    showToast?.('请填写必填项', 'warning')
    return
  }
  try {
    if (isEdit.value && props.editStock) {
      await inventoryStore.updateInventory(props.editStock.id, form)
      showToast?.('更新成功', 'success')
    } else {
      await inventoryStore.createInventory(form)
      showToast?.('创建成功', 'success')
    }
    close()
    emit('saved')
  } catch {
    // 错误已在 API 层处理
  }
}

// 弹窗打开时初始化表单
watch(() => props.modelValue, (visible) => {
  if (!visible) return
  if (props.editStock) {
    const row = props.editStock
    Object.assign(form, {
      batchNo: row.batchNo || '',
      grade: row.grade || '',
      specification: row.specification || '',
      productType: row.productType || '',
      weight: Number(row.weight) || 0,
      pieceCount: row.pieceCount || undefined,
      location: row.location || '',
      remark: row.remark || '',
    })
    locationPreset.value = LOCATION_PRESETS.includes(row.location || '') ? row.location! : ''
  } else {
    Object.assign(form, {
      batchNo: '',
      grade: '',
      specification: '',
      productType: '',
      weight: 0,
      pieceCount: undefined as number | undefined,
      location: '',
      nickelContent: '',
      remark: '',
    })
    locationPreset.value = ''
  }
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
  max-width: 640px;
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
  textarea,
  select {
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

.form-select {
  cursor: pointer;
}

.location-select-wrap {
  display: flex;
  gap: var(--spacing-sm);

  .form-select {
    flex: 1;
  }

  .location-input {
    flex: 1;
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

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-item.full-width {
    grid-column: span 1;
  }
}
</style>
