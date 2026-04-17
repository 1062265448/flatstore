<template>
  <div class="demo-page">
    <div class="demo-header">
      <h1>🎮 Demo 4: RTS 游戏风格</h1>
      <p>俯视视角，类即时战略游戏，适合指挥监控</p>
    </div>

    <el-card shadow="hover" class="viewer-card">
      <template #header>
        <div class="card-header">
          <span>仓储指挥中心</span>
          <el-space>
            <el-button-group size="small">
              <el-button @click="setView('top')">俯视</el-button>
              <el-button @click="setView('iso')">等轴测</el-button>
              <el-button @click="setView('free')">自由</el-button>
            </el-button-group>
            <el-button @click="toggleAnimation" size="small">
              {{ animating ? '暂停' : '播放' }}
            </el-button>
          </el-space>
        </div>
      </template>
      <div ref="containerRef" class="three-container"></div>
    </el-card>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card shadow="hover" class="rts-card">
          <div class="rts-header">
            <span class="rts-icon">📦</span>
            <span>库存</span>
          </div>
          <div class="rts-value">156.8 吨</div>
          <div class="rts-bar">
            <div class="rts-bar-fill" style="width: 78%"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="rts-card">
          <div class="rts-header">
            <span class="rts-icon">🏗️</span>
            <span>设备</span>
          </div>
          <div class="rts-value">8 / 10 在线</div>
          <div class="rts-bar">
            <div class="rts-bar-fill green" style="width: 80%"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="rts-card">
          <div class="rts-header">
            <span class="rts-icon">📈</span>
            <span>效率</span>
          </div>
          <div class="rts-value">92.5%</div>
          <div class="rts-bar">
            <div class="rts-bar-fill yellow" style="width: 92%"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="feature-list">
      <h3>特点</h3>
      <ul>
        <li>俯视等轴测视角，视野开阔</li>
        <li>类似 RTS 游戏的小地图标识</li>
        <li>单位指示器和路径显示</li>
        <li>紧凑的布局，高密度信息展示</li>
        <li>适合指挥中心和监控场景</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const containerRef = ref<HTMLElement>()
const viewMode = ref('top')
const animating = ref(true)

let scene: THREE.Scene, camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer, controls: OrbitControls
let animationId: number | null = null
let vehicles: THREE.Group[] = []
let markers: THREE.Group | null = null

const initScene = () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = 450

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2d5016)

  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500)
  camera.position.set(0, 80, 0)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.5
  controls.minDistance = 30
  controls.maxDistance = 150

  // 俯视灯光
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.6)
  sunLight.position.set(30, 80, 30)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.near = 10
  sunLight.shadow.camera.far = 200
  sunLight.shadow.camera.left = -80
  sunLight.shadow.camera.right = 80
  sunLight.shadow.camera.top = 80
  sunLight.shadow.camera.bottom = -80
  scene.add(sunLight)

  createEnvironment()
  createMinimap()
  animate()
}

const createEnvironment = () => {
  // 草地地面
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 120),
    new THREE.MeshStandardMaterial({ color: 0x3d6b1e, roughness: 0.9 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // 道路
  createRoads()

  // 建筑区域
  createBuildings()

  // 单位
  createUnits()
}

const createRoads = () => {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 })

  // 主路（东西）
  const road1 = new THREE.Mesh(new THREE.PlaneGeometry(140, 8), roadMat)
  road1.rotation.x = -Math.PI / 2
  road1.position.y = 0.02
  scene.add(road1)

  // 主路（南北）
  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 100), roadMat)
  road2.rotation.x = -Math.PI / 2
  road2.position.y = 0.02
  scene.add(road2)

  // 黄色中线
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 })
  const lineGeo = new THREE.PlaneGeometry(140, 0.3)

  for (let x = -65; x < 65; x += 5) {
    const line = new THREE.Mesh(lineGeo, lineMat)
    line.rotation.x = -Math.PI / 2
    line.position.set(x, 0.03, 0)
    scene.add(line)
  }
}

const createBuildings = () => {
  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 })
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.6 })
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x4a6741, roughness: 0.5 })
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.4 })

  // 仓库A
  const warehouseA = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 25), buildingMat)
  warehouseA.position.set(-35, 4, -30)
  warehouseA.castShadow = true
  warehouseA.receiveShadow = true
  scene.add(warehouseA)

  const roofA = new THREE.Mesh(new THREE.BoxGeometry(42, 1, 27), roofMat)
  roofA.position.set(-35, 8.5, -30)
  scene.add(roofA)

  // 仓库B
  const warehouseB = new THREE.Mesh(new THREE.BoxGeometry(35, 8, 20), buildingMat)
  warehouseB.position.set(35, 4, -25)
  warehouseB.castShadow = true
  scene.add(warehouseB)

  const roofB = new THREE.Mesh(new THREE.BoxGeometry(37, 1, 22), roofMat)
  roofB.position.set(35, 8.5, -25)
  scene.add(roofB)

  // 货架区
  const cargoColors = [0x228b22, 0x32cd32, 0x90ee90, 0x006400]

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const group = new THREE.Group()
      const w = 6, h = 5, d = 3

      // 货架框
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rackMat)
      frame.position.y = h / 2
      frame.castShadow = true
      group.add(frame)

      // 横梁
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.2, d - 0.5), beamMat)
      beam.position.y = h * 0.6
      group.add(beam)

      // 货物
      const cargoGeo = new THREE.BoxGeometry(1.2, 1, 1)
      const count = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < count; i++) {
        const cargo = new THREE.Mesh(
          cargoGeo,
          new THREE.MeshStandardMaterial({ color: cargoColors[i % cargoColors.length] })
        )
        cargo.position.set(-w/2 + 0.8 + i * 1.8, h * 0.4, 0)
        cargo.castShadow = true
        group.add(cargo)
      }

      group.position.set(-50 + col * 9, 0, 15 + row * 8)
      scene.add(group)
    }
  }

  // 传送带
  const conveyorMat = new THREE.MeshStandardMaterial({ color: 0x5c5c5c, roughness: 0.5 })
  const belt = new THREE.Mesh(new THREE.BoxGeometry(60, 0.5, 2.5), conveyorMat)
  belt.position.set(0, 0.5, 30)
  belt.castShadow = true
  scene.add(belt)

  // 传送带支腿
  const legGeo = new THREE.BoxGeometry(0.4, 0.5, 2.5)
  for (let x = -27; x <= 27; x += 9) {
    const leg = new THREE.Mesh(legGeo, conveyorMat)
    leg.position.set(x, 0.25, 30)
    scene.add(leg)
  }
}

const createUnits = () => {
  // 叉车1
  const forklift1 = createForkliftUnit(0xcc0000)
  forklift1.position.set(-20, 0, 5)
  forklift1.name = 'forklift1'
  scene.add(forklift1)
  vehicles.push(forklift1)

  // 叉车2
  const forklift2 = createForkliftUnit(0x0066cc)
  forklift2.position.set(20, 0, -5)
  forklift2.name = 'forklift2'
  scene.add(forklift2)
  vehicles.push(forklift2)

  // 货车
  const truck = createTruckUnit()
  truck.position.set(50, 0, 0)
  truck.name = 'truck'
  scene.add(truck)
  vehicles.push(truck)
}

const createForkliftUnit = (color: number) => {
  const group = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.2, 2.5),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
  )
  body.position.y = 1
  body.castShadow = true
  group.add(body)

  // 驾驶舱
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  )
  cabin.position.set(0, 2, -0.3)
  group.add(cabin)

  // 货叉
  const fork = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  )
  fork.position.set(0, 0.8, 1.8)
  group.add(fork)

  // 轮子
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8)
  ;[[-0.7, 0, 0.7], [0.7, 0, 0.7], [-0.7, 0, -0.7], [0.7, 0, -0.7]].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }))
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, 0.3, z)
    group.add(wheel)
  })

  return group
}

const createTruckUnit = () => {
  const group = new THREE.Group()

  // 车厢
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 2, 5),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  )
  cargo.position.y = 1.5
  cargo.castShadow = true
  group.add(cargo)

  // 驾驶室
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 1.8, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x4169e1 })
  )
  cabin.position.set(0, 1.4, -2.8)
  group.add(cabin)

  // 车轮
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12)
  ;[[-1, 0, 1.5], [1, 0, 1.5], [-1, 0, -1.5], [1, 0, -1.5], [-1, 0, -3], [1, 0, -3]].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }))
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, 0.5, z)
    group.add(wheel)
  })

  group.rotation.y = Math.PI / 2

  return group
}

const createMinimap = () => {
  markers = new THREE.Group()

  // 小地图边框
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 45),
    new THREE.MeshBasicMaterial({ color: 0x2d5016, transparent: true, opacity: 0.8 })
  )
  border.rotation.x = -Math.PI / 2
  border.position.set(0, 0.1, 55)
  markers.add(border)

  // 建筑标记
  const buildMarker = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 10),
    new THREE.MeshBasicMaterial({ color: 0x8b7355 })
  )
  buildMarker.rotation.x = -Math.PI / 2
  buildMarker.position.set(-35, 0.15, -30)
  markers.add(buildMarker)

  scene.add(markers)
}

let time = 0
const animate = () => {
  animationId = requestAnimationFrame(animate)
  time += 0.02

  if (animating.value) {
    // 叉车1 移动
    const forklift1 = vehicles.find(v => v.name === 'forklift1')
    if (forklift1) {
      forklift1.position.x = Math.sin(time) * 30
      forklift1.position.z = Math.cos(time) * 15
      forklift1.rotation.y = -time + Math.PI / 2
    }

    // 叉车2 移动
    const forklift2 = vehicles.find(v => v.name === 'forklift2')
    if (forklift2) {
      forklift2.position.x = Math.cos(time * 0.7) * 25
      forklift2.position.z = Math.sin(time * 0.7) * 20
      forklift2.rotation.y = -time * 0.7 + Math.PI
    }

    // 货车移动
    const truck = vehicles.find(v => v.name === 'truck')
    if (truck) {
      truck.position.x = 55 - (time * 5) % 120
      if (truck.position.x < -65) truck.position.x = 65
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

const setView = (view: string) => {
  viewMode.value = view
  if (view === 'top') {
    camera.position.set(0, 100, 0.1)
    camera.lookAt(0, 0, 0)
  } else if (view === 'iso') {
    camera.position.set(60, 50, 60)
    camera.lookAt(0, 0, 0)
  } else {
    camera.position.set(50, 40, 50)
    camera.lookAt(0, 0, 0)
  }
  controls.update()
}

const toggleAnimation = () => { animating.value = !animating.value }

onMounted(() => {
  initScene()
  window.addEventListener('resize', () => {
    if (!containerRef.value) return
    camera.aspect = containerRef.value.clientWidth / 450
    camera.updateProjectionMatrix()
    renderer.setSize(containerRef.value.clientWidth, 450)
  })
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  renderer?.dispose()
})
</script>

<style scoped lang="scss">
.demo-page {
  padding: 20px;
  background: #1a1a1a;
  min-height: 100vh;

  .demo-header {
    text-align: center;
    margin-bottom: 24px;
    color: #e0e0e0;

    h1 { font-size: 28px; margin-bottom: 8px; }
    p { color: #888; }
  }

  .viewer-card {
    background: #2a2a2a !important;
    border: 2px solid #444 !important;

    :deep(.el-card__header) {
      background: #333;
      border-bottom: 1px solid #444;
      color: #e0e0e0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .three-container {
      height: 450px;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #333;
    }
  }

  .stats-row {
    margin-top: 20px;

    .rts-card {
      background: linear-gradient(135deg, #2a2a2a 0%, #333 100%) !important;
      border: 2px solid #555 !important;
      padding: 16px;

      .rts-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #888;
        font-size: 14px;
        margin-bottom: 8px;

        .rts-icon {
          font-size: 18px;
        }
      }

      .rts-value {
        font-size: 24px;
        font-weight: bold;
        color: #fff;
        margin-bottom: 8px;
      }

      .rts-bar {
        height: 6px;
        background: #1a1a1a;
        border-radius: 3px;
        overflow: hidden;

        .rts-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a90d9, #6eb5ff);
          border-radius: 3px;
          transition: width 0.3s ease;

          &.green {
            background: linear-gradient(90deg, #4caf50, #8bc34a);
          }

          &.yellow {
            background: linear-gradient(90deg, #ff9800, #ffb74d);
          }
        }
      }
    }
  }

  .feature-list {
    margin-top: 24px;
    padding: 20px;
    background: #2a2a2a;
    border: 2px solid #444;
    border-radius: 4px;

    h3 { color: #e0e0e0; margin-bottom: 12px; }

    ul {
      list-style: none;
      padding: 0;
      li {
        color: #aaa;
        padding: 8px 0;
        padding-left: 24px;
        position: relative;
        &::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #4a90d9;
        }
      }
    }
  }
}
</style>
