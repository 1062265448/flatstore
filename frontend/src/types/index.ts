// 库存批次
export interface InventoryStock {
  id: number
  packageNo?: string
  batchNo: string
  grade: string
  productType?: string
  specification?: string
  weight: string | number
  pieceCount: number
  location?: string
  nickelContent?: string
  impurityContent?: string
  status: 'available' | 'reserved' | 'shipped'
  inspectionDate?: string
  certificateNo?: string
  remark?: string
  sourceType?: string
  sourceImage?: string
  createdAt: string
  updatedAt: string
}

export interface CreateInventoryDto {
  packageNo?: string
  batchNo: string
  grade: string
  productType?: string
  specification?: string
  weight: number
  pieceCount: number
  location?: string
  nickelContent?: string
  impurityContent?: string
  remark?: string
  inspectionDate?: string
  certificateNo?: string
}

export interface UpdateInventoryDto {
  packageNo?: string
  batchNo?: string
  grade?: string
  productType?: string
  specification?: string
  weight?: number
  pieceCount?: number
  location?: string
  nickelContent?: string
  impurityContent?: string
  remark?: string
  inspectionDate?: string
  certificateNo?: string
}

export interface InventoryQuery {
  page?: number
  limit?: number
  keyword?: string
  grade?: string
  status?: string
  productType?: string
}

// 客户
export interface Customer {
  id: number
  name: string
  contact?: string
  phone?: string
  address?: string
  remark?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerDto {
  name: string
  contact?: string
  phone?: string
  address?: string
  remark?: string
}

export interface UpdateCustomerDto {
  name?: string
  contact?: string
  phone?: string
  address?: string
  remark?: string
}

// 配货单
export interface DistributionOrder {
  id: number
  orderNo: string
  customerId: number
  customerName?: string
  productSpec?: string
  targetGrade?: string
  totalWeight?: string | number
  totalPieces?: number
  status: 'draft' | 'confirmed' | 'shipping' | 'shipped' | 'cancelled'
  shippedAt?: string
  driverName?: string
  vehicleNo?: string
  remark?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
  customer?: { id: number; name: string }
  items?: DistributionOrderItem[]
}

export interface DistributionOrderItem {
  id: number
  orderId: number
  stockId: number
  weight: string | number
  pieceCount: number
  stock?: InventoryStock
}

export interface OrderItemDto {
  stockId: number
  weight: number
  pieceCount: number
}

export interface CreateOrderDto {
  customerId: number
  customerName?: string
  productSpec?: string
  targetGrade?: string
  remark?: string
  items: OrderItemDto[]
}

export interface UpdateOrderDto {
  customerId?: number
  customerName?: string
  productSpec?: string
  targetGrade?: string
  remark?: string
}

export interface ShipOrderDto {
  driverName?: string
  vehicleNo?: string
}

export interface OrderQuery {
  page?: number
  limit?: number
  status?: string
  customerId?: number
}

// AI 识别
export interface AiRecognizeResult {
  packageNo: string | number
  pieceCount: number
  netWeight?: number
  grade: string
  productType: string
  batchNo: string
  inspector?: string
  date?: string
}

export interface AiRecognitionHistory {
  id: number
  imageUrl: string
  result?: string
  itemCount: number
  status: 'success' | 'failed'
  errorMessage?: string
  batchNo?: string
  grade?: string
  date?: string
  createdAt: string
}

export interface RecognitionHistoryQuery {
  page?: number
  limit?: number
  status?: string
}

// 统计
export interface Statistics {
  inventory: {
    total: number
    available: number
    reserved: number
    shipped: number
    totalWeight: string
    totalPieces: number
  }
  order: {
    total: number
    draft: number
    confirmed: number
    shipping: number
    shipped: number
  }
  customer: {
    total: number
  }
}

// API 响应
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  total?: number
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
