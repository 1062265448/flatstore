/**
 * 平面库 3D 仓库布局配置
 *
 * 基于平面库建筑图纸 (1:200)
 * - 建筑总尺寸: 120m × 66m
 * - 柱距: X 7.5m, Z 6m
 * - 仓储点: 1.2m × 1.2m × 1.2m
 */

// 建筑基础尺寸 (units = 米)
export const BUILDING_CONFIG = {
  // 建筑总尺寸
  width: 120,      // X 方向总长 (m)
  depth: 66,       // Z 方向总宽 (m)
  height: 8,       // 建筑高度 (m) - 厂房净高

  // 轴网
  columnX: 7.5,    // 横向柱距 (m)
  columnZ: 6,      // 纵向柱距 (m)
  columnCountX: 16, // 横向柱跨数
  columnCountZ: 11, // 纵向柱跨数

  // 柱子尺寸
  columnWidth: 0.4,  // 柱子截面 (m)
  columnDepth: 0.4,

  // 仓储点（托盘位）
  palletWidth: 1.2,  // 托盘宽 (m)
  palletDepth: 1.2,   // 托盘深 (m)
  palletHeight: 1.2,  // 托盘高 (m)
  palletSpacing: 0.1, // 托盘间距 (m)

  // 通道
  centralAisleWidth: 10, // 中央通道宽度 (m)
  centralAisleZStart: 24, // 通道起点
  centralAisleZEnd: 36,  // 通道终点

  // 墙体
  wallThickness: 0.2,   // 墙体厚度 (m)
  wallHeight: 6,       // 墙体高度 (m)

  // 地面
  floorHeight: 0.1,    // 地面厚度 (m)
}

// 区域定义
export interface WarehouseZone {
  id: string
  name: string
  // 网格范围 (以托盘为单位)
  gridStartX: number
  gridEndX: number
  gridStartZ: number
  gridEndZ: number
  // 3D 位置 (区域中心)
  position: { x: number; z: number }
  // 区域颜色（用于标识）
  color: number
  // 区域说明
  description: string
}

// 仓储区域配置
export const WAREHOUSE_ZONES: WarehouseZone[] = [
  {
    id: 'left-top',
    name: '左上区',
    gridStartX: 0,
    gridEndX: 72,    // 72 个托盘位
    gridStartZ: 40,
    gridEndZ: 55,    // 15 行
    position: { x: 45, z: 57 },
    color: 0x10b981, // 绿色
    description: '高端品级存储区',
  },
  {
    id: 'left-middle',
    name: '左中区',
    gridStartX: 0,
    gridEndX: 72,
    gridStartZ: 24,
    gridEndZ: 40,    // 16 行
    position: { x: 45, z: 38 },
    color: 0x3b82f6, // 蓝色
    description: '主存储区 A',
  },
  {
    id: 'left-bottom',
    name: '左下区',
    gridStartX: 0,
    gridEndX: 72,
    gridStartZ: 0,
    gridEndZ: 24,    // 24 行
    position: { x: 45, z: 14 },
    color: 0x06b6d4, // 青色
    description: '主存储区 B - 靠近出货口',
  },
  {
    id: 'right-bottom',
    name: '右下区',
    gridStartX: 82,
    gridEndX: 100,
    gridStartZ: 0,
    gridEndZ: 24,    // AGV 转运区
    position: { x: 95, z: 14 },
    color: 0x8b5cf6, // 紫色
    description: 'AGV 自动化作业区',
  },
  {
    id: 'right-middle',
    name: '右中区',
    gridStartX: 82,
    gridEndX: 100,
    gridStartZ: 24,
    gridEndZ: 40,
    position: { x: 95, z: 38 },
    color: 0xf59e0b, // 橙色
    description: '设备维护区',
  },
  {
    id: 'right-top',
    name: '右上区',
    gridStartX: 82,
    gridEndX: 100,
    gridStartZ: 40,
    gridEndZ: 55,
    position: { x: 95, z: 57 },
    color: 0xec4899, // 粉色
    description: '质检/计量室区域',
  },
]

// 中央通道配置
export const CENTRAL_AISLE = {
  // 通道边界 (Z 坐标)
  startZ: BUILDING_CONFIG.centralAisleZStart,
  endZ: BUILDING_CONFIG.centralAisleZEnd,
  width: BUILDING_CONFIG.centralAisleWidth,
  // 轨道配置
  railWidth: 0.1,
  railColor: 0x374151,
  // 警示带颜色
  warningColor: 0xfbbf24,
}

// 品级颜色映射
export const GRADE_COLORS: Record<string, number> = {
  '9997': 0x34c759, // 绿色 - 高端
  '9996': 0x0071e3, // 蓝色 - 标准
  '9950': 0xff9500, // 橙色 - 普通
  '9920': 0xaf52de, // 紫色 - 低端
}

// 品级与区域映射
export const GRADE_ZONE_MAP: Record<string, string[]> = {
  '9997': ['left-top', 'left-middle'],
  '9996': ['left-bottom', 'right-bottom'],
  '9950': ['left-middle', 'right-middle'],
  '9920': ['right-middle', 'right-top'],
}

// 获取区域信息
export function getZoneById(zoneId: string): WarehouseZone | undefined {
  return WAREHOUSE_ZONES.find((zone) => zone.id === zoneId)
}

// 获取品级对应的颜色
export function getGradeColor(grade: string): number {
  return GRADE_COLORS[grade] || 0x8e8e93
}

// 获取品级对应的区域列表
export function getGradeZones(grade: string): WarehouseZone[] {
  const zoneIds = GRADE_ZONE_MAP[grade] || ['left-middle']
  return zoneIds
    .map((id) => getZoneById(id))
    .filter((z): z is WarehouseZone => z !== undefined)
}

// 计算网格总数
export function calculateTotalPallets(): number {
  let total = 0
  WAREHOUSE_ZONES.forEach((zone) => {
    const cols = zone.gridEndX - zone.gridStartX
    const rows = zone.gridEndZ - zone.gridStartZ
    total += cols * rows
  })
  return total
}

// 网格坐标转 3D 世界坐标
export function gridToWorld(
  gridX: number,
  gridZ: number,
  zone: WarehouseZone
): { x: number; z: number } {
  const spacing = BUILDING_CONFIG.palletWidth + BUILDING_CONFIG.palletSpacing
  const zoneOriginX = zone.gridStartX * spacing
  const zoneOriginZ = zone.gridStartZ * spacing

  return {
    x: zoneOriginX + gridX * spacing,
    z: zoneOriginZ + gridZ * spacing,
  }
}

// 特殊设施配置
export interface EquipmentConfig {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  color: number
}

export const EQUIPMENTS: EquipmentConfig[] = [
  {
    id: 'overhead-crane-1',
    name: '无人吊装系统 A',
    position: { x: 30, y: 6, z: 30 },
    size: { width: 80, height: 1, depth: 0.3 },
    color: 0x4b5563,
  },
  {
    id: 'overhead-crane-2',
    name: '无人吊装系统 B',
    position: { x: 90, y: 6, z: 30 },
    size: { width: 20, height: 1, depth: 0.3 },
    color: 0x4b5563,
  },
  {
    id: 'agv-station-1',
    name: 'AGV 充电站',
    position: { x: 100, y: 0, z: 5 },
    size: { width: 3, height: 1.5, depth: 2 },
    color: 0x10b981,
  },
  {
    id: 'control-room',
    name: '控制室',
    position: { x: 115, y: 0, z: 60 },
    size: { width: 4, height: 3, depth: 5 },
    color: 0x6366f1,
  },
]
