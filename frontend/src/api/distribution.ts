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
export const getInventoryList = (params: InventoryQuery, signal?: AbortSignal) => {
  return request.get<PaginatedResponse<InventoryStock>>('/distribution/inventory', { params, signal } as any)
}

export const getInventoryById = (id: number) => {
  return request.get<InventoryStock>(`/distribution/inventory/${id}`)
}

export const createInventory = (data: CreateInventoryDto) => {
  return request.post<InventoryStock>('/distribution/inventory', data)
}

export interface BatchCreateInventoryRequest {
  items: CreateInventoryDto[]
  recognitionHistoryId?: number
}

export const batchCreateInventory = (data: BatchCreateInventoryRequest) => {
  return request.post('/distribution/inventory/batch', data)
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

// 库存远程搜索（用于 el-select）
export const searchInventory = (keyword: string, limit?: number) => {
  return request.get<InventoryStock[]>('/distribution/inventory/search', {
    params: { keyword, limit },
  } as any)
}

// AI 识别
export const aiRecognize = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<{ results: AiRecognizeResult[]; historyId: number }>('/distribution/inventory/ai-recognize', formData, {
    timeout: 120000,
  } as any)
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
export const getOrderList = (params: OrderQuery, signal?: AbortSignal) => {
  return request.get<PaginatedResponse<DistributionOrder>>('/distribution/orders', { params, signal } as any)
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
  return request.get<PaginatedResponse<AiRecognitionHistory>>('/distribution/recognition-history', { params } as any)
}

export const deleteRecognitionHistory = (id: number) => {
  return request.delete(`/distribution/recognition-history/${id}`)
}

export const batchDeleteRecognitionHistory = (ids: number[]) => {
  return request.post('/distribution/recognition-history/batch-delete', { ids })
}
