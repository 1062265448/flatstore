import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { InventoryStock, CreateInventoryDto, UpdateInventoryDto, InventoryQuery } from '@/types'

export const useInventoryStore = defineStore('inventory', () => {
  const inventoryList = ref<InventoryStock[]>([])
  const total = ref(0)
  const loading = ref(false)

  const fetchInventory = async (params: InventoryQuery = {}, append = false) => {
    loading.value = true
    try {
      const res = await api.getInventoryList(params) as any
      inventoryList.value = append ? [...inventoryList.value, ...res.data] : res.data
      total.value = res.total
    } finally {
      loading.value = false
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
