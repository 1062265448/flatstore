<template>
  <div class="page-container warehouse">
    <!-- 页面标题 -->
    <div class="page-header fade-in">
      <h1 class="page-title">3D 仓库</h1>
      <p class="page-subtitle">平面库仓储可视化</p>
    </div>

    <!-- 厂区切换标签 -->
    <div class="factory-tabs fade-in" :style="{ animationDelay: '0.05s' }">
      <button
        class="factory-tab"
        :class="{ active: activeFactory === 'factory-3' }"
        @click="activeFactory = 'factory-3'"
      >
        三厂区
      </button>
      <button
        class="factory-tab"
        :class="{ active: activeFactory === 'factory-2' }"
        @click="activeFactory = 'factory-2'"
      >
        二厂区
      </button>
    </div>

    <!-- 三厂区内容 -->
    <template v-if="activeFactory === 'factory-3'">
      <!-- 3D 场景容器 -->
      <div class="warehouse-container glass-card fade-in" :style="{ animationDelay: '0.1s' }">
        <div ref="containerRef" class="three-container"></div>

        <!-- 3D 控制面板 -->
        <div class="control-panel">
          <div class="control-group">
            <span class="control-label">视角</span>
            <el-select v-model="viewMode" size="small" @change="switchView">
              <el-option label="等轴测" value="iso" />
              <el-option label="俯视" value="top" />
              <el-option label="正视" value="front" />
              <el-option label="侧视" value="side" />
            </el-select>
          </div>
          <div class="control-group">
            <el-button @click="toggleAnimation" size="small">
              {{ animating ? '暂停' : '播放' }}
            </el-button>
          </div>
          <div class="control-group">
            <el-button @click="resetCamera" size="small">重置视角</el-button>
          </div>
          <div class="control-group">
            <el-button @click="toggleCargoVisibility" size="small">
              {{ showCargo ? '隐藏货物' : '显示货物' }}
            </el-button>
          </div>
        </div>

        <!-- 图例 -->
        <div class="legend">
          <div class="legend-title">品级图例</div>
          <div class="legend-items">
            <div class="legend-item">
              <span class="legend-color" style="background: #34c759;"></span>
              <span class="legend-label">9997</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: #0071e3;"></span>
              <span class="legend-label">9996</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: #ff9500;"></span>
              <span class="legend-label">9950</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: #af52de;"></span>
              <span class="legend-label">9920</span>
            </div>
          </div>
        </div>

        <!-- 建筑信息 -->
        <div class="building-info">
          <div class="info-item">
            <span class="info-label">建筑尺寸</span>
            <span class="info-value">120m × 66m</span>
          </div>
          <div class="info-item">
            <span class="info-label">仓储点</span>
            <span class="info-value">{{ totalPallets }} 个</span>
          </div>
          <div class="info-item">
            <span class="info-label">分区</span>
            <span class="info-value">6 个区域</span>
          </div>
        </div>
      </div>

      <!-- 统计信息 + 区域详情（两栏布局） -->
      <div class="data-section fade-in" :style="{ animationDelay: '0.2s' }">
        <!-- 左侧：统计卡片 -->
        <div class="stats-section">
          <h3 class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 3V21H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M7 16L11 12L15 14L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            库存统计
          </h3>
          <div class="stats-grid">
            <div class="stat-card glass-card">
              <div class="stat-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">库存批次</div>
              </div>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L4 9V21H20V9L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M9 21V12H15V21" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.totalWeight }}</div>
                <div class="stat-label">总重量（吨）</div>
              </div>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-icon orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.totalPieces }}</div>
                <div class="stat-label">总片数</div>
              </div>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-icon purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.areas }}</div>
                <div class="stat-label">分区数量</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：区域详情 -->
        <div class="zones-section">
          <h3 class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M3 9H21" stroke="currentColor" stroke-width="2"/>
              <path d="M9 3V21" stroke="currentColor" stroke-width="2"/>
            </svg>
            分区库存分布
          </h3>
          <div class="zones-grid">
            <div
              v-for="(area, index) in areaStats"
              :key="area.name"
              class="zone-card glass-card"
              :style="{ animationDelay: `${0.3 + index * 0.1}s` }"
            >
              <div class="zone-header">
                <div class="zone-color" :style="{ background: area.color }"></div>
                <span class="zone-name">{{ area.name }}</span>
              </div>
              <div class="zone-stats">
                <div class="zone-stat">
                  <span class="zone-stat-value">{{ area.count }}</span>
                  <span class="zone-stat-label">批次</span>
                </div>
                <div class="zone-stat">
                  <span class="zone-stat-value">{{ area.weight }}</span>
                  <span class="zone-stat-label">吨</span>
                </div>
              </div>
              <div class="zone-progress">
                <div
                  class="zone-progress-fill"
                  :style="{ width: `${(area.count / maxAreaCount) * 100}%`, background: area.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 二厂区 - 正在开发中 -->
    <template v-if="activeFactory === 'factory-2'">
      <div class="developing-placeholder glass-card fade-in" :style="{ animationDelay: '0.1s' }">
        <div class="placeholder-text">
          <span class="placeholder-label">二厂区</span>
          <span class="placeholder-status">正在开发中</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useInventoryStore } from '@/stores/inventory'
import {
  createWarehouseEnvironment,
  disposeWarehouse,
  getPalletPositions,
} from '@/three/warehouse-builder'
import {
  WAREHOUSE_ZONES,
  getGradeColor,
  getGradeZones,
  BUILDING_CONFIG,
} from '@/three/warehouse-layout'
import type { InventoryStock } from '@/types'

const containerRef = ref<HTMLElement>()
const viewMode = ref('iso')
const animating = ref(true)
const showCargo = ref(true)
const activeFactory = ref('factory-3') // 当前厂区: factory-3=三厂区, factory-2=二厂区

const inventoryStore = useInventoryStore()

// Three.js 对象
let scene: THREE.Scene, camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer, controls: OrbitControls
let animationId: number | null = null
let cargoObjects: THREE.Group[] = []

// 仓储点总数
const totalPallets = computed(() => {
  let total = 0
  WAREHOUSE_ZONES.forEach((zone) => {
    const cols = zone.gridEndX - zone.gridStartX
    const rows = zone.gridEndZ - zone.gridStartZ
    total += cols * rows
  })
  return total
})

// 统计数据
const stats = computed(() => {
  const list = inventoryStore.inventoryList
  const total = list.length
  const totalWeight = list.reduce((sum, item) => sum + (Number(item.weight) || 0), 0).toFixed(2)
  const totalPieces = list.reduce((sum, item) => sum + (item.pieceCount || 0), 0)
  const areas = new Set(list.map(item => item.location).filter(Boolean)).size

  return { total, totalWeight, totalPieces, areas }
})

// 区域统计
const areaStats = computed(() => {
  const list = inventoryStore.inventoryList
  const areaMap = new Map<string, { count: number; weight: number; color: string }>()

  // 初始化所有区域
  WAREHOUSE_ZONES.forEach((zone) => {
    areaMap.set(zone.name, { count: 0, weight: 0, color: `#${zone.color.toString(16).padStart(6, '0')}` })
  })

  list.forEach((item) => {
    const area = item.location || '未知区域'
    if (areaMap.has(area)) {
      const data = areaMap.get(area)!
      data.count++
      data.weight += Number(item.weight) || 0
    }
  })

  return Array.from(areaMap.entries())
    .filter(([name]) => name !== '未知区域')
    .map(([name, data]) => ({
      name,
      count: data.count,
      weight: data.weight.toFixed(2),
      color: data.color,
    }))
})

const maxAreaCount = computed(() => {
  return Math.max(...areaStats.value.map((a) => a.count), 1)
})

// 初始化场景
const initScene = () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = 600

  // 创建场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1e293b) // 深蓝灰色背景

  // 创建相机
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500)
  camera.position.set(100, 80, 100)

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  containerRef.value.appendChild(renderer.domElement)

  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI / 2.2
  controls.minDistance = 20
  controls.maxDistance = 200
  controls.target.set(60, 0, 33)

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(60, 50, 50)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(2048, 2048)
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 200
  dirLight.shadow.camera.left = -80
  dirLight.shadow.camera.right = 80
  dirLight.shadow.camera.top = 80
  dirLight.shadow.camera.bottom = -80
  scene.add(dirLight)

  // 添加补光
  const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.3)
  fillLight.position.set(-30, 20, -30)
  scene.add(fillLight)

  // 创建仓库环境
  createWarehouseEnvironment(scene)

  // 创建货物
  createCargo()

  // 开始动画
  animate()
}

// 创建货物
const createCargo = () => {
  // 清除旧货物
  cargoObjects.forEach((obj) => scene.remove(obj))
  cargoObjects = []

  const list = inventoryStore.inventoryList
  if (list.length === 0) return

  // 按品级分组
  const byGrade: Record<string, InventoryStock[]> = {}
  list.forEach((item) => {
    const grade = item.grade || '9997'
    if (!byGrade[grade]) {
      byGrade[grade] = []
    }
    byGrade[grade].push(item)
  })

  // 遍历每个品级
  Object.entries(byGrade).forEach(([grade, items]) => {
    const zones = getGradeZones(grade)
    if (zones.length === 0) return

    const color = getGradeColor(grade)
    const zone = zones[0]
    const positions = getPalletPositions(zone)

    items.forEach((item, index) => {
      if (index >= positions.length) return

      const pos = positions[index]
      const weight = Number(item.weight) || 1
      const scale = Math.min(Math.max(weight / 10, 0.3), 1.5)

      // 创建货物组
      const cargoGroup = new THREE.Group()
      cargoGroup.name = `cargo-${item.id}`

      // 货物主体
      const cargoGeo = new THREE.BoxGeometry(1, 0.8 * scale, 0.8)
      const cargoMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.2,
      })
      const cargo = new THREE.Mesh(cargoGeo, cargoMat)
      cargo.position.y = BUILDING_CONFIG.palletHeight + 0.4 * scale
      cargo.castShadow = true
      cargo.receiveShadow = true
      cargoGroup.add(cargo)

      // 托盘底座
      const palletGeo = new THREE.BoxGeometry(1.1, 0.1, 0.9)
      const palletMat = new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.8,
      })
      const pallet = new THREE.Mesh(palletGeo, palletMat)
      pallet.position.y = BUILDING_CONFIG.palletHeight / 2
      pallet.castShadow = true
      cargoGroup.add(pallet)

      cargoGroup.position.set(pos.x, 0, pos.z)

      // 存储原始位置用于动画
      cargoGroup.userData.originalY = 0
      cargoGroup.userData.phase = Math.random() * Math.PI * 2

      scene.add(cargoGroup)
      cargoObjects.push(cargoGroup)
    })
  })
}

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (animating.value) {
    const time = Date.now() * 0.001

    // 货物轻微浮动动画
    cargoObjects.forEach((cargo) => {
      if (showCargo.value) {
        const offset = Math.sin(time + cargo.userData.phase) * 0.02
        cargo.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.position.y += offset * 0.1
          }
        })
      }
    })
  }

  controls.update()
  renderer.render(scene, camera)
}

// 切换视角
const switchView = (mode: string) => {
  const targetPosition: Record<string, { x: number; y: number; z: number }> = {
    iso: { x: 100, y: 80, z: 100 },
    top: { x: 60, y: 150, z: 33 },
    front: { x: 60, y: 30, z: -20 },
    side: { x: 140, y: 40, z: 33 },
  }

  const pos = targetPosition[mode]
  if (pos) {
    camera.position.set(pos.x, pos.y, pos.z)
    controls.target.set(60, 0, 33)
  }
}

// 重置相机
const resetCamera = () => {
  viewMode.value = 'iso'
  switchView('iso')
}

// 切换动画
const toggleAnimation = () => {
  animating.value = !animating.value
}

// 切换货物可见性
const toggleCargoVisibility = () => {
  showCargo.value = !showCargo.value
  cargoObjects.forEach((cargo) => {
    cargo.visible = showCargo.value
  })
}

// 监听数据变化
watch(
  () => inventoryStore.inventoryList,
  () => {
    if (scene) {
      createCargo()
    }
  },
  { deep: true }
)

// 响应式调整
const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return
  const width = containerRef.value.clientWidth
  camera.aspect = width / 600
  camera.updateProjectionMatrix()
  renderer.setSize(width, 600)
}

onMounted(async () => {
  // 获取库存数据
  await inventoryStore.fetchInventory({ page: 1, limit: 200 })

  // 初始化场景
  initScene()

  // 监听窗口变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  disposeWarehouse()
  if (renderer) {
    renderer.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.warehouse {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-2xl);
}

// ==================== 厂区切换标签 ====================
.factory-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

.factory-tab {
  padding: var(--spacing-sm) var(--spacing-xl);
  border: 2px solid var(--color-border);
  background: transparent;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  &.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }
}

// ==================== 页面标题 ====================
.page-header {
  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ==================== 3D 容器 ====================
.warehouse-container {
  position: relative;
  margin-bottom: var(--spacing-xl);
  overflow: hidden;
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

.three-container {
  width: 100%;
  height: 600px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

// ==================== 控制面板 ====================
.control-panel {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  display: flex;
  gap: var(--spacing-sm);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.control-label {
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.7);
}

// ==================== 图例 ====================
.legend {
  position: absolute;
  bottom: var(--spacing-md);
  left: var(--spacing-md);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.legend-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: #fff;
  margin-bottom: var(--spacing-sm);
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-label {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.7);
}

// ==================== 建筑信息 ====================
.building-info {
  position: absolute;
  top: var(--spacing-md);
  left: var(--spacing-md);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(10px);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  gap: var(--spacing-lg);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.5);
}

.info-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: #fff;
}

// ==================== 数据区域（两栏布局） ====================
.data-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);

  svg {
    color: var(--color-primary);
  }
}

// 统计网格
.stats-section {
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
}

.stats-grid {
  .stat-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;

    &.blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    &.green { background: linear-gradient(135deg, #10B981, #059669); }
    &.orange { background: linear-gradient(135deg, #F59E0B, #D97706); }
    &.purple { background: linear-gradient(135deg, #8B5CF6, #7C3AED); }
  }

  .stat-content {
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-text-primary);
      letter-spacing: -0.02em;
    }

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  }
}

// 区域网格
.zones-section {
  .zones-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}

.zones-grid {
  .zone-card {
    padding: var(--spacing-lg);
    animation: slideUp 0.6s ease forwards;
    opacity: 0;
  }
}

.zone-card {
  .zone-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .zone-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .zone-name {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .zone-stats {
    display: flex;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
  }

  .zone-stat {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-xs);
  }

  .zone-stat-value {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .zone-stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .zone-progress {
    height: 4px;
    background: var(--color-bg-tertiary);
    border-radius: 2px;
    overflow: hidden;
  }

  .zone-progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }
}

// ==================== 二厂区 - 正在开发中 ====================
.developing-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  opacity: 0;

  &.fade-in {
    animation: slideUp 0.6s ease forwards;
  }
}

.placeholder-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.placeholder-label {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.placeholder-status {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-warning-bg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-warning);
}

// ==================== 响应式 ====================
@media (max-width: 1024px) {
  .data-section {
    grid-template-columns: 1fr;
  }

  .building-info {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .features-preview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .zones-section .zones-grid {
    grid-template-columns: 1fr;
  }

  .control-panel {
    flex-wrap: wrap;
  }
}
</style>
