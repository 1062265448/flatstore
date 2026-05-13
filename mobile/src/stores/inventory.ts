import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { InventoryStock, CreateInventoryDto, UpdateInventoryDto, InventoryQuery } from '@/types'

export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref<InventoryStock[]>([])
  const total = ref(0)
  const loading = ref(false)

  let abortController: AbortController | null = null

  const fetchInventory = async (params: InventoryQuery = {}, append = false) => {
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    loading.value = true
    try {
      const res = await api.getInventoryList(params, signal) as { data: InventoryStock[]; total: number }
      if (signal.aborted) return
      inventoryList.value = append ? [...inventoryList.value, ...res.data] : res.data
      total.value = res.total
      if (!append && res.data.length === 0 && res.total > 0 && (params.page ?? 1) > 1) {
        return fetchInventory({ ...params, page: 1 }, false)
      }
    } catch (error: any) {
      // AbortError 表示请求被取消，静默忽略
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
      if (error?.response?.status === 401) return
      // 保留现有数据，不清空（网络抖动时列表依然可见）
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  const createInventory = async (dto: CreateInventoryDto) => {
    const res = await api.createInventory(dto)
    return res
  }

  const updateInventory = async (id: number, dto: UpdateInventoryDto) => {
    const res = await api.updateInventory(id, dto)
    return res
  }

  const deleteInventory = async (id: number) => {
    await api.deleteInventory(id)
  }

  return { inventoryList, total, loading, fetchInventory, createInventory, updateInventory, deleteInventory }
})
