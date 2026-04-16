import request from './request'
import type {
  InventoryStock,
  CreateInventoryDto,
  UpdateInventoryDto,
  InventoryQuery,
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  DistributionOrder,
  CreateOrderDto,
  UpdateOrderDto,
  ShipOrderDto,
  OrderQuery,
  AiRecognizeResult,
  AiRecognitionHistory,
  RecognitionHistoryQuery,
  Statistics,
  PaginatedResponse,
} from '@/types'

// ==================== 统计 ====================
export const getStatistics = () => {
  return request.get<Statistics>('/distribution/statistics')
}

// ==================== 库存 ====================
export const getInventoryList = (params: InventoryQuery) => {
  return request.get<PaginatedResponse<InventoryStock>>('/distribution/inventory', { params })
}

export const getInventoryById = (id: number) => {
  return request.get<InventoryStock>(`/distribution/inventory/${id}`)
}

export const createInventory = (data: CreateInventoryDto) => {
  return request.post<InventoryStock>('/distribution/inventory', data)
}

export const batchCreateInventory = (items: CreateInventoryDto[]) => {
  return request.post('/distribution/inventory/batch', items)
}

export const updateInventory = (id: number, data: UpdateInventoryDto) => {
  return request.patch<InventoryStock>(`/distribution/inventory/${id}`, data)
}

export const deleteInventory = (id: number) => {
  return request.delete(`/distribution/inventory/${id}`)
}

export const batchDeleteInventory = (ids: number[]) => {
  return request.post('/distribution/inventory/batch-delete', { ids })
}

// AI 识别
export const aiRecognize = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  console.log('[AI] 上传文件:', file.name, file.size, file.type)
  // ⚠️ 不设置 Content-Type，让浏览器自动添加 boundary
  return request.post<AiRecognizeResult[]>('/distribution/inventory/ai-recognize', formData, {
    timeout: 120000,  // 统一 120s，与后端一致
  })
}

// ==================== 客户 ====================
export const getCustomers = () => {
  return request.get<Customer[]>('/distribution/customers')
}

export const getCustomerById = (id: number) => {
  return request.get<Customer>(`/distribution/customers/${id}`)
}

export const createCustomer = (data: CreateCustomerDto) => {
  return request.post<Customer>('/distribution/customers', data)
}

export const updateCustomer = (id: number, data: UpdateCustomerDto) => {
  return request.put<Customer>(`/distribution/customers/${id}`, data)
}

export const deleteCustomer = (id: number) => {
  return request.delete(`/distribution/customers/${id}`)
}

// ==================== 配货单 ====================
export const getOrderList = (params: OrderQuery) => {
  return request.get<PaginatedResponse<DistributionOrder>>('/distribution/orders', { params })
}

export const getOrderById = (id: number) => {
  return request.get<DistributionOrder>(`/distribution/orders/${id}`)
}

export const createOrder = (data: CreateOrderDto) => {
  return request.post<DistributionOrder>('/distribution/orders', data)
}

export const updateOrder = (id: number, data: UpdateOrderDto) => {
  return request.put<DistributionOrder>(`/distribution/orders/${id}`, data)
}

export const deleteOrder = (id: number) => {
  return request.delete(`/distribution/orders/${id}`)
}

export const batchDeleteOrders = (ids: number[]) => {
  return request.post('/distribution/orders/batch-delete', { ids })
}

export const confirmOrder = (id: number) => {
  return request.post<DistributionOrder>(`/distribution/orders/${id}/confirm`)
}

export const shipOrder = (id: number, data: ShipOrderDto) => {
  return request.post<DistributionOrder>(`/distribution/orders/${id}/ship`, data)
}

export const deliverOrder = (id: number) => {
  return request.post<DistributionOrder>(`/distribution/orders/${id}/deliver`)
}

export const cancelOrder = (id: number) => {
  return request.post<DistributionOrder>(`/distribution/orders/${id}/cancel`)
}

// ==================== AI 识别历史 ====================
export const getRecognitionHistory = (params: RecognitionHistoryQuery) => {
  return request.get<PaginatedResponse<AiRecognitionHistory>>('/distribution/recognition-history', { params })
}

export const deleteRecognitionHistory = (id: number) => {
  return request.delete(`/distribution/recognition-history/${id}`)
}

export const batchDeleteRecognitionHistory = (ids: number[]) => {
  return request.post('/distribution/recognition-history/batch-delete', { ids })
}
