/**
 * 平面库 3D 建筑构建模块
 *
 * 基于 warehouse-layout.ts 的配置创建 Three.js 场景
 */

import * as THREE from 'three'
import {
  BUILDING_CONFIG,
  WAREHOUSE_ZONES,
  CENTRAL_AISLE,
  WarehouseZone,
} from './warehouse-layout'

// 存储所有创建的对象，用于清理
const warehouseObjects: THREE.Object3D[] = []

/**
 * 清理所有仓库对象
 */
export function disposeWarehouse(): void {
  warehouseObjects.forEach((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose())
      } else {
        obj.material.dispose()
      }
    }
  })
  warehouseObjects.length = 0
}

/**
 * 创建地面
 */
export function createFloor(scene: THREE.Scene): THREE.Mesh {
  const floorGeo = new THREE.PlaneGeometry(
    BUILDING_CONFIG.width,
    BUILDING_CONFIG.depth
  )
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // 工业灰
    roughness: 0.9,
    metalness: 0.1,
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(BUILDING_CONFIG.width / 2, 0, BUILDING_CONFIG.depth / 2)
  floor.receiveShadow = true
  scene.add(floor)
  warehouseObjects.push(floor)
  return floor
}

/**
 * 创建外墙（已禁用）
 * 如需启用，取消下面的注释
 */
// export function createWalls(scene: THREE.Scene): THREE.Group {
//   const wallGroup = new THREE.Group()
//   const { width, depth, wallThickness, wallHeight } = BUILDING_CONFIG

//   const wallMat = new THREE.MeshStandardMaterial({
//     color: 0xcbd5e1,
//     roughness: 0.8,
//     metalness: 0.1,
//   })

//   // 前面墙 (Z = 0)
//   const frontWall = new THREE.Mesh(
//     new THREE.BoxGeometry(width, wallHeight, wallThickness),
//     wallMat
//   )
//   frontWall.position.set(width / 2, wallHeight / 2, 0)
//   frontWall.castShadow = true
//   wallGroup.add(frontWall)

//   // 后面墙 (Z = depth)
//   const backWall = new THREE.Mesh(
//     new THREE.BoxGeometry(width, wallHeight, wallThickness),
//     wallMat
//   )
//   backWall.position.set(width / 2, wallHeight / 2, depth)
//   backWall.castShadow = true
//   wallGroup.add(backWall)

//   // 左面墙 (X = 0)
//   const leftWall = new THREE.Mesh(
//     new THREE.BoxGeometry(wallThickness, wallHeight, depth),
//     wallMat
//   )
//   leftWall.position.set(0, wallHeight / 2, depth / 2)
//   leftWall.castShadow = true
//   wallGroup.add(leftWall)

//   // 右面墙 (X = width)
//   const rightWall = new THREE.Mesh(
//     new THREE.BoxGeometry(wallThickness, wallHeight, depth),
//     wallMat
//   )
//   rightWall.position.set(width, wallHeight / 2, depth / 2)
//   rightWall.castShadow = true
//   wallGroup.add(rightWall)

//   scene.add(wallGroup)
//   warehouseObjects.push(wallGroup)
//   return wallGroup
// }

/**
 * 创建柱子（已禁用）
 * 如需启用，取消下面的注释
 */
// export function createColumns(scene: THREE.Scene): THREE.Group {
//   const columnGroup = new THREE.Group()
//   const { columnWidth, columnDepth, columnCountX, columnCountZ, columnX, columnZ } =
//     BUILDING_CONFIG

//   const columnMat = new THREE.MeshStandardMaterial({
//     color: 0x64748b,
//     roughness: 0.6,
//     metalness: 0.2,
//   })

//   for (let i = 1; i <= columnCountX; i++) {
//     for (let j = 1; j <= columnCountZ; j++) {
//       const column = new THREE.Mesh(
//         new THREE.BoxGeometry(columnWidth, BUILDING_CONFIG.wallHeight, columnDepth),
//         columnMat
//       )
//       column.position.set(
//         i * columnX - columnX / 2,
//         BUILDING_CONFIG.wallHeight / 2,
//         j * columnZ - columnZ / 2
//       )
//       column.castShadow = true
//       column.receiveShadow = true
//       columnGroup.add(column)
//     }
//   }

//   scene.add(columnGroup)
//   warehouseObjects.push(columnGroup)
//   return columnGroup
// }

/**
 * 创建仓储点网格（托盘位）
 */
export function createStorageGrid(scene: THREE.Scene): THREE.Group[] {
  const gridGroups: THREE.Group[] = []
  const spacing = BUILDING_CONFIG.palletWidth + BUILDING_CONFIG.palletSpacing

  WAREHOUSE_ZONES.forEach((zone) => {
    const zoneGroup = new THREE.Group()
    zoneGroup.name = `zone-${zone.id}`

    // 区域底板（半透明）
    const zoneWidth = (zone.gridEndX - zone.gridStartX) * spacing
    const zoneDepth = (zone.gridEndZ - zone.gridStartZ) * spacing
    const zoneGeo = new THREE.PlaneGeometry(zoneWidth, zoneDepth)
    const zoneMat = new THREE.MeshStandardMaterial({
      color: zone.color,
      transparent: true,
      opacity: 0.1,
      roughness: 0.9,
    })
    const zoneFloor = new THREE.Mesh(zoneGeo, zoneMat)
    zoneFloor.rotation.x = -Math.PI / 2
    zoneFloor.position.set(
      zone.gridStartX * spacing + zoneWidth / 2,
      0.01,
      zone.gridStartZ * spacing + zoneDepth / 2
    )
    zoneFloor.receiveShadow = true
    zoneGroup.add(zoneFloor)

    // 托盘点位（线框盒子）
    const palletGeo = new THREE.BoxGeometry(
      BUILDING_CONFIG.palletWidth,
      BUILDING_CONFIG.palletHeight,
      BUILDING_CONFIG.palletDepth
    )
    const palletMat = new THREE.MeshStandardMaterial({
      color: zone.color,
      transparent: true,
      opacity: 0.3,
      roughness: 0.5,
    })

    for (let x = zone.gridStartX; x < zone.gridEndX; x++) {
      for (let z = zone.gridStartZ; z < zone.gridEndZ; z++) {
        const pallet = new THREE.Mesh(palletGeo, palletMat)
        pallet.position.set(
          x * spacing + BUILDING_CONFIG.palletWidth / 2,
          BUILDING_CONFIG.palletHeight / 2,
          z * spacing + BUILDING_CONFIG.palletDepth / 2
        )
        pallet.castShadow = true
        zoneGroup.add(pallet)
      }
    }

    scene.add(zoneGroup)
    warehouseObjects.push(zoneGroup)
    gridGroups.push(zoneGroup)
  })

  return gridGroups
}

/**
 * 创建中央通道
 */
export function createCentralAisle(scene: THREE.Scene): THREE.Group {
  const aisleGroup = new THREE.Group()

  // 通道地面（黄色警示带）
  const aisleMat = new THREE.MeshStandardMaterial({
    color: CENTRAL_AISLE.warningColor,
    transparent: true,
    opacity: 0.4,
    roughness: 0.7,
  })

  const aisle = new THREE.Mesh(
    new THREE.PlaneGeometry(BUILDING_CONFIG.width, CENTRAL_AISLE.width),
    aisleMat
  )
  aisle.rotation.x = -Math.PI / 2
  aisle.position.set(
    BUILDING_CONFIG.width / 2,
    0.02,
    (CENTRAL_AISLE.startZ + CENTRAL_AISLE.endZ) / 2
  )
  aisle.receiveShadow = true
  aisleGroup.add(aisle)

  // 通道边界线
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 })
  const lineGeo = new THREE.BoxGeometry(BUILDING_CONFIG.width, 0.05, 0.1)

  const frontLine = new THREE.Mesh(lineGeo, lineMat)
  frontLine.position.set(BUILDING_CONFIG.width / 2, 0.03, CENTRAL_AISLE.startZ)
  aisleGroup.add(frontLine)

  const backLine = new THREE.Mesh(lineGeo, lineMat)
  backLine.position.set(BUILDING_CONFIG.width / 2, 0.03, CENTRAL_AISLE.endZ)
  aisleGroup.add(backLine)

  // 轨道
  const railMat = new THREE.MeshStandardMaterial({
    color: CENTRAL_AISLE.railColor,
    roughness: 0.4,
    metalness: 0.6,
  })
  const railGeo = new THREE.BoxGeometry(BUILDING_CONFIG.width, 0.2, CENTRAL_AISLE.railWidth)

  const rail1 = new THREE.Mesh(railGeo, railMat)
  rail1.position.set(
    BUILDING_CONFIG.width / 2,
    0.1,
    CENTRAL_AISLE.startZ + 2
  )
  aisleGroup.add(rail1)

  const rail2 = new THREE.Mesh(railGeo, railMat)
  rail2.position.set(
    BUILDING_CONFIG.width / 2,
    0.1,
    CENTRAL_AISLE.endZ - 2
  )
  aisleGroup.add(rail2)

  scene.add(aisleGroup)
  warehouseObjects.push(aisleGroup)
  return aisleGroup
}

/**
 * 创建区域标识牌
 */
export function createZoneMarkers(scene: THREE.Scene): THREE.Group {
  const markerGroup = new THREE.Group()

  WAREHOUSE_ZONES.forEach((zone) => {
    const marker = createTextMarker(zone.name, zone.color)
    marker.position.set(zone.position.x, 0.03, zone.position.z)
    markerGroup.add(marker)
  })

  scene.add(markerGroup)
  warehouseObjects.push(markerGroup)
  return markerGroup
}

/**
 * 创建文字标识
 */
function createTextMarker(text: string, color: number): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // 背景
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
  roundRect(ctx, 0, 0, 256, 64, 12)
  ctx.fill()

  // 文字
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 32)

  const texture = new THREE.CanvasTexture(canvas)
  const geo = new THREE.PlaneGeometry(8, 2)
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

/**
 * 圆角矩形辅助函数
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * 创建设备（已禁用）
 * 如需启用，取消下面的注释
 */
// export function createEquipment(scene: THREE.Scene): THREE.Group {
//   const equipmentGroup = new THREE.Group()

//   EQUIPMENTS.forEach((equip) => {
//     const geo = new THREE.BoxGeometry(equip.size.width, equip.size.height, equip.size.depth)
//     const mat = new THREE.MeshStandardMaterial({
//       color: equip.color,
//       roughness: 0.5,
//       metalness: 0.3,
//     })
//     const mesh = new THREE.Mesh(geo, mat)
//     mesh.position.set(equip.position.x, equip.position.y + equip.size.height / 2, equip.position.z)
//     mesh.castShadow = true
//     mesh.receiveShadow = true
//     mesh.name = equip.id
//     equipmentGroup.add(mesh)
//   })

//   scene.add(equipmentGroup)
//   warehouseObjects.push(equipmentGroup)
//   return equipmentGroup
// }

/**
 * 创建 AGV 小车（已禁用）
 * 如需启用，取消下面的注释
 */
// export function createAGV(scene: THREE.Scene, position: { x: number; z: number }): THREE.Group {
//   const agv = new THREE.Group()
//   agv.name = 'AGV'

//   // 车身
//   const bodyMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 })
//   const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1), bodyMat)
//   body.position.y = 0.25
//   body.castShadow = true
//   agv.add(body)

//   // 支架
//   const frameMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 })
//   const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), frameMat)
//   frame.position.y = 0.7
//   frame.castShadow = true
//   agv.add(frame)

//   // 轮子
//   const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 })
//   const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16)
//   ;[
//     [-0.6, 0.15, 0.4],
//     [0.6, 0.15, 0.4],
//     [-0.6, 0.15, -0.4],
//     [0.6, 0.15, -0.4],
//   ].forEach(([x, y, z]) => {
//     const wheel = new THREE.Mesh(wheelGeo, wheelMat)
//     wheel.rotation.z = Math.PI / 2
//     wheel.position.set(x as number, y as number, z as number)
//     agv.add(wheel)
//   })

//   agv.position.set(position.x, 0, position.z)
//   scene.add(agv)
//   warehouseObjects.push(agv)
//   return agv
// }

/**
 * 创建完整的仓库环境（仅库存相关元素）
 */
export function createWarehouseEnvironment(scene: THREE.Scene): {
  floor: THREE.Mesh
  walls: THREE.Group | null
  columns: THREE.Group | null
  zones: THREE.Group[]
  aisle: THREE.Group
  markers: THREE.Group
  equipment: THREE.Group | null
} {
  // 地面
  const floor = createFloor(scene)

  // 外墙（已禁用）
  const walls = null

  // 柱子（已禁用）
  const columns = null

  // 仓储网格
  const zones = createStorageGrid(scene)

  // 中央通道
  const aisle = createCentralAisle(scene)

  // 区域标识
  const markers = createZoneMarkers(scene)

  // 设备（已禁用）
  const equipment = null

  return { floor, walls, columns, zones, aisle, markers, equipment }
}

/**
 * 获取某个区域的托盘位置列表
 */
export function getPalletPositions(zone: WarehouseZone): { x: number; z: number }[] {
  const positions: { x: number; z: number }[] = []
  const spacing = BUILDING_CONFIG.palletWidth + BUILDING_CONFIG.palletSpacing

  for (let x = zone.gridStartX; x < zone.gridEndX; x++) {
    for (let z = zone.gridStartZ; z < zone.gridEndZ; z++) {
      positions.push({
        x: x * spacing + BUILDING_CONFIG.palletWidth / 2,
        z: z * spacing + BUILDING_CONFIG.palletDepth / 2,
      })
    }
  }

  return positions
}

export { warehouseObjects }
