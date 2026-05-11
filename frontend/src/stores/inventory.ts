import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { InventoryStock, CreateInventoryDto, UpdateInventoryDto, InventoryQuery } from '@/types'

export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref<InventoryStock[]>([])
  const total = ref(0)
  const loading = ref(false)

  const fetchInventory = async (params: InventoryQuery = {}) => {
    loading.value = true
    try {
      const res = await api.getInventoryList(params) as { data: InventoryStock[]; total: number }
      inventoryList.value = res.data
      total.value = res.total
    } catch (error) {
      // 错误已在 API 响应拦截器中提示，此处仅重置数据
      inventoryList.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const createInventory = async (dto: CreateInventoryDto) => {
    const res = await api.createInventory(dto)
    await fetchInventory()
    return res
  }

  const updateInventory = async (id: number, dto: UpdateInventoryDto) => {
    const res = await api.updateInventory(id, dto)
    await fetchInventory()
    return res
  }

  const deleteInventory = async (id: number) => {
    await api.deleteInventory(id)
    await fetchInventory()
  }

  const batchDelete = async (ids: number[]) => {
    await api.batchDeleteInventory(ids)
    await fetchInventory()
  }

  return {
    inventoryList,
    total,
    loading,
    fetchInventory,
    createInventory,
    updateInventory,
    deleteInventory,
    batchDelete,
  }
})
