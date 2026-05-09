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
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '@/types'

// ==================== Auth ====================
export const login = (data: LoginRequest) =>
  request.post<LoginResponse>('/auth/login', data)

export const register = (data: RegisterRequest) =>
  request.post('/auth/register', data)

export const getProfile = () =>
  request.get('/auth/profile')

// ==================== Statistics ====================
export const getStatistics = () =>
  request.get<Statistics>('/distribution/statistics')

// ==================== Inventory ====================
export const getInventoryList = (params: InventoryQuery) =>
  request.get<PaginatedResponse<InventoryStock>>('/distribution/inventory', { params })

export const getInventoryById = (id: number) =>
  request.get<InventoryStock>(`/distribution/inventory/${id}`)

export const createInventory = (data: CreateInventoryDto) =>
  request.post<InventoryStock>('/distribution/inventory', data)

export const batchCreateInventory = (data: { items: CreateInventoryDto[]; recognitionHistoryId?: number }) =>
  request.post('/distribution/inventory/batch', data)

export const updateInventory = (id: number, data: UpdateInventoryDto) =>
  request.patch<InventoryStock>(`/distribution/inventory/${id}`, data)

export const deleteInventory = (id: number) =>
  request.delete(`/distribution/inventory/${id}`)

export const batchDeleteInventory = (ids: number[]) =>
  request.post('/distribution/inventory/batch-delete', { ids })

export const searchInventory = (keyword: string, limit?: number) =>
  request.get<InventoryStock[]>('/distribution/inventory/search', { params: { keyword, limit } })

// AI 识别
export const aiRecognize = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<{ results: AiRecognizeResult[]; historyId: number }>('/distribution/inventory/ai-recognize', formData, {
    timeout: 120000,
  } as any)
}

// ==================== Customers ====================
export const getCustomers = () =>
  request.get<Customer[]>('/distribution/customers')

export const getCustomerById = (id: number) =>
  request.get<Customer>(`/distribution/customers/${id}`)

export const createCustomer = (data: CreateCustomerDto) =>
  request.post<Customer>('/distribution/customers', data)

export const updateCustomer = (id: number, data: UpdateCustomerDto) =>
  request.put<Customer>(`/distribution/customers/${id}`, data)

export const deleteCustomer = (id: number) =>
  request.delete(`/distribution/customers/${id}`)

// ==================== Orders ====================
export const getOrderList = (params: OrderQuery) =>
  request.get<PaginatedResponse<DistributionOrder>>('/distribution/orders', { params })

export const getOrderById = (id: number) =>
  request.get<DistributionOrder>(`/distribution/orders/${id}`)

export const createOrder = (data: CreateOrderDto) =>
  request.post<DistributionOrder>('/distribution/orders', data)

export const updateOrder = (id: number, data: UpdateOrderDto) =>
  request.put<DistributionOrder>(`/distribution/orders/${id}`, data)

export const deleteOrder = (id: number) =>
  request.delete(`/distribution/orders/${id}`)

export const batchDeleteOrders = (ids: number[]) =>
  request.post('/distribution/orders/batch-delete', { ids })

export const shipOrder = (id: number, data: ShipOrderDto) =>
  request.post<DistributionOrder>(`/distribution/orders/${id}/ship`, data)

export const deliverOrder = (id: number) =>
  request.post<DistributionOrder>(`/distribution/orders/${id}/deliver`)

export const cancelOrder = (id: number) =>
  request.post<DistributionOrder>(`/distribution/orders/${id}/cancel`)

// ==================== AI Recognition History ====================
export const getRecognitionHistory = (params: RecognitionHistoryQuery) =>
  request.get<PaginatedResponse<AiRecognitionHistory>>('/distribution/recognition-history', { params })

export const deleteRecognitionHistory = (id: number) =>
  request.delete(`/distribution/recognition-history/${id}`)

export const batchDeleteRecognitionHistory = (ids: number[]) =>
  request.post('/distribution/recognition-history/batch-delete', { ids })
