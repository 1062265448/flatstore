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
      // ⚠️ Axios 已解包，res.data 直接是数组
      const res = await api.getOrderList(params)
      orderList.value = res.data
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  const fetchOrderById = async (id: number) => {
    loading.value = true
    try {
      const res = await api.getOrderById(id)
      currentOrder.value = res as DistributionOrder
      return res
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
