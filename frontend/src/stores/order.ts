import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { DistributionOrder, CreateOrderDto, UpdateOrderDto, ShipOrderDto, OrderQuery } from '@/types'

export const useOrderStore = defineStore('order', () => {
  const orderList = ref<DistributionOrder[]>([])
  const currentOrder = ref<DistributionOrder | null>(null)
  const total = ref(0)
  const loading = ref(false)

  const fetchOrders = async (params: OrderQuery = {}) => {
    loading.value = true
    try {
      const res = await api.getOrderList(params) as { data: DistributionOrder[]; total: number }
      orderList.value = res.data
      total.value = res.total
    } catch (error) {
      // 错误已在 API 响应拦截器中提示，此处仅重置数据
      orderList.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const fetchOrderById = async (id: number) => {
    loading.value = true
    try {
      const res = await api.getOrderById(id) as DistributionOrder
      currentOrder.value = res
      return res
    } catch (error) {
      currentOrder.value = null
      throw error
    } finally {
      loading.value = false
    }
  }

  const createOrder = async (dto: CreateOrderDto) => {
    const res = await api.createOrder(dto)
    await fetchOrders()
    return res
  }

  const updateOrder = async (id: number, dto: UpdateOrderDto) => {
    const res = await api.updateOrder(id, dto)
    await fetchOrders()
    return res
  }

  const deleteOrder = async (id: number) => {
    await api.deleteOrder(id)
    await fetchOrders()
  }

  const batchDelete = async (ids: number[]) => {
    await api.batchDeleteOrders(ids)
    await fetchOrders()
  }

  const shipOrder = async (id: number, dto: ShipOrderDto) => {
    await api.shipOrder(id, dto)
    await fetchOrders()
  }

  const deliverOrder = async (id: number) => {
    await api.deliverOrder(id)
    await fetchOrders()
  }

  const cancelOrder = async (id: number) => {
    await api.cancelOrder(id)
    await fetchOrders()
  }

  return {
    orderList,
    currentOrder,
    total,
    loading,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    batchDelete,
    shipOrder,
    deliverOrder,
    cancelOrder,
  }
})
