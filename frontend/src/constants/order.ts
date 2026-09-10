/** 配货单状态相关常量 — Orders 页面与各弹窗共用 */

export const ORDER_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'shipped', label: '已发货' },
  { value: 'cancelled', label: '已取消' },
]

export const ORDER_STATUS_TAG_CLASS: Record<string, string> = {
  draft: 'tag-default',
  shipped: 'tag-success',
  cancelled: 'tag-danger',
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  shipped: '已发货',
  cancelled: '已取消',
}

/** 固定的产品类型选项 */
export const PRODUCT_TYPE_OPTIONS = [
  '电解镍',
  '电积镍',
  '不锈钢专用镍',
  '电镀专用镍',
]

/** 固定的产品规格选项 */
export const SPECIFICATION_OPTIONS = [
  '整板',
  '镍条',
  '100×100',
  '50×50',
  '25×25',
  '20×20',
  '镍包',
]
