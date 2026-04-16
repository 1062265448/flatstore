import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/distribution'
import type { DistributionOrder, CreateOrderDto, UpdateOrderDto, ShipOrderDto, OrderQuery } from '@/types'
import { ElMessage } from 'element-plus'

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
    ElMessage.success('创建成功')
    await fetchOrders()
    return res
  }

  const updateOrder = async (id: number, dto: UpdateOrderDto) => {
    const res = await api.updateOrder(id, dto)
    ElMessage.success('更新成功')
    await fetchOrders()
    return res
  }

  const deleteOrder = async (id: number) => {
    await api.deleteOrder(id)
    ElMessage.success('删除成功')
    await fetchOrders()
  }

  const batchDelete = async (ids: number[]) => {
    await api.batchDeleteOrders(ids)
    ElMessage.success('批量删除成功')
    await fetchOrders()
  }

  const confirmOrder = async (id: number) => {
    await api.confirmOrder(id)
    ElMessage.success('订单已确认')
    await fetchOrders()
  }

  const shipOrder = async (id: number, dto: ShipOrderDto) => {
    await api.shipOrder(id, dto)
    ElMessage.success('订单已发货')
    await fetchOrders()
  }

  const deliverOrder = async (id: number) => {
    await api.deliverOrder(id)
    ElMessage.success('发运完成')
    await fetchOrders()
  }

  const cancelOrder = async (id: number) => {
    await api.cancelOrder(id)
    ElMessage.success('订单已取消')
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
    confirmOrder,
    shipOrder,
    deliverOrder,
    cancelOrder,
  }
})
