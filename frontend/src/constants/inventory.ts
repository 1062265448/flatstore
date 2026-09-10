/** 库存状态与关联订单状态常量 — Inventory 页面与弹窗共用 */

export const INVENTORY_STATUS_TAG_CLASS: Record<string, string> = {
  available: 'tag-success',
  reserved: 'tag-warning',
  shipped: 'tag-default',
  issued: 'tag-info',
}

export const INVENTORY_STATUS_LABEL: Record<string, string> = {
  available: '可用',
  reserved: '已预留',
  shipped: '已发货',
  issued: '已发出',
}

/** 库存详情中关联配货单的状态映射（比列表页多 shipping 态） */
export const LINKED_ORDER_STATUS_TAG_CLASS: Record<string, string> = {
  draft: 'tag-default',
  shipping: 'tag-info',
  shipped: 'tag-success',
  cancelled: 'tag-danger',
}

export const LINKED_ORDER_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  shipping: '发货中',
  shipped: '已发货',
  cancelled: '已取消',
}

/** 位置预设选项 */
export const LOCATION_PRESETS = ['三厂区', '二厂区']
