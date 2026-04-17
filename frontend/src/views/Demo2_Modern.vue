<template>
  <div class="demo-page">
    <div class="demo-header">
      <h1>🎨 Demo 2: 简约现代风格</h1>
      <p>轻量简洁，适合 Dashboard 集成</p>
    </div>

    <el-card shadow="hover" class="viewer-card">
      <template #header>
        <div class="card-header">
          <span>现代仓储概览</span>
          <el-space>
            <el-select v-model="viewMode" size="small">
              <el-option label="自由视角" value="free" />
              <el-option label="俯视" value="top" />
              <el-option label="等轴测" value="iso" />
            </el-select>
            <el-button @click="toggleAnimation" size="small">
              {{ animating ? '暂停' : '播放' }}
            </el-button>
          </el-space>
        </div>
      </template>
      <div ref="containerRef" class="three-container"></div>
    </el-card>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon blue"><el-icon><Box /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">156.8</div>
            <div class="stat-label">库存总量(吨)</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon green"><el-icon><Goods /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">23</div>
            <div class="stat-label">货架数量</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon orange"><el-icon><Van /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">8</div>
            <div class="stat-label">设备在线</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon purple"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">245</div>
            <div class="stat-label">今日吞吐</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="feature-list">
      <h3>特点</h3>
      <ul>
        <li>简约的几何造型，低多边形风格</li>
        <li>明亮的色彩搭配</li>
        <li>轻量级渲染，性能优秀</li>
        <li>与 Element Plus 风格统一</li>
        <li>适合嵌入现有 Dashboard</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Box, Goods, Van, TrendCharts } from '@element-plus/icons-vue'

const containerRef = ref<HTMLElement>()
const viewMode = ref('iso')
const animating = ref(true)

let scene: THREE.Scene, camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer, controls: OrbitControls
let animationId: number | null = null
let vehicle: THREE.Group | null = null

const initScene = () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = 450

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f4f8)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500)
  camera.position.set(40, 35, 40)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.2

  // 柔和灯光
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(30, 50, 30)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(1024, 1024)
  scene.add(dirLight)

  createEnvironment()
  animate()
}

const createEnvironment = () => {
  // 浅色地面
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 80),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // 简约网格
  const grid = new THREE.GridHelper(100, 50, 0xcbd5e0, 0xe2e8f0)
  grid.position.y = 0.02
  scene.add(grid)

  // 简约货架
  createSimpleRacks()

  // 简约传送带
  createSimpleConveyor()

  // 简约车辆
  createSimpleVehicle()

  // 简约标识
  createSimpleMarkers()
}

const createSimpleRacks = () => {
  const colors = {
    rack: 0x4299e1,  // 蓝色货架
    beam: 0x48bb78,   // 绿色横梁
    cargo: [0x68d391, 0xf6e05e, 0xfc8181, 0xb794f4]  // 彩色货物
  }

  // A区 - 蓝色系
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const rack = createSimpleRackUnit(colors.rack, colors.beam, colors.cargo)
      rack.position.set(-28 + col * 14, 0, -20 + row * 12)
      scene.add(rack)
    }
  }

  // B区 - 紫色系
  const colorsB = { ...colors, rack: 0x9f7aea, beam: 0xed64a6 }
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const rack = createSimpleRackUnit(colorsB.rack, colorsB.beam, colorsB.cargo)
      rack.position.set(18 + col * 14, 0, -15 + row * 12)
      scene.add(rack)
    }
  }
}

const createSimpleRackUnit = (rackColor: number, beamColor: number, cargoColors: number[]) => {
  const group = new THREE.Group()
  const w = 9, h = 10, d = 4

  // 简化立柱（圆角方块）
  const colMat = new THREE.MeshStandardMaterial({ color: rackColor, roughness: 0.4 })
  const colGeo = new THREE.BoxGeometry(0.5, h, 0.5)

  ;[[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]].forEach(([x, z]) => {
    const col = new THREE.Mesh(colGeo, colMat)
    col.position.set(x, h / 2, z)
    col.castShadow = true
    group.add(col)
  })

  // 横梁
  const beamMat = new THREE.MeshStandardMaterial({ color: beamColor, roughness: 0.4 })
  const beamGeo = new THREE.BoxGeometry(w, 0.3, 0.2)
  ;[0, 5, 10].forEach(y => {
    ;[-d/2, d/2].forEach(z => {
      const beam = new THREE.Mesh(beamGeo, beamMat)
      beam.position.set(0, y, z)
      group.add(beam)
    })
  })

  // 简约货物（圆角方块）
  const cargoGeo = new THREE.BoxGeometry(1.8, 2, 1.5)
  cargoGeo.translate(0, 1, 0)

  for (let level = 0; level < 2; level++) {
    const count = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < count; i++) {
      const cargo = new THREE.Mesh(
        cargoGeo,
        new THREE.MeshStandardMaterial({ color: cargoColors[i % cargoColors.length], roughness: 0.5 })
      )
      cargo.position.set(-w/2 + 1.5 + i * 2.5, 0.3 + level * 5, 0)
      cargo.castShadow = true
      group.add(cargo)
    }
  }

  return group
}

const createSimpleConveyor = () => {
  const mat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.4 })

  // 主体
  const belt = new THREE.Mesh(new THREE.BoxGeometry(50, 0.8, 2), mat)
  belt.position.set(0, 0.6, 5)
  belt.castShadow = true
  scene.add(belt)

  // 支腿
  const legGeo = new THREE.BoxGeometry(0.3, 0.6, 1.5)
  for (let x = -22; x <= 22; x += 11) {
    const leg = new THREE.Mesh(legGeo, mat)
    leg.position.set(x, 0.3, 5)
    scene.add(leg)
  }

  // 货物托盘
  const trayGeo = new THREE.BoxGeometry(2, 0.3, 1.5)
  const trayColors = [0x68d391, 0xf6e05e, 0xfc8181]
  for (let i = 0; i < 5; i++) {
    const tray = new THREE.Mesh(trayGeo, new THREE.MeshStandardMaterial({ color: trayColors[i % 3] }))
    tray.position.set(-20 + i * 10, 1.15, 5)
    tray.castShadow = true
    scene.add(tray)
  }
}

const createSimpleVehicle = () => {
  vehicle = new THREE.Group()

  // 车身
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.5, 3),
    new THREE.MeshStandardMaterial({ color: 0x4299e1, roughness: 0.4 })
  )
  body.position.y = 1.2
  body.castShadow = true
  vehicle.add(body)

  // 车顶
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1, 2),
    new THREE.MeshStandardMaterial({ color: 0x63b3ed, roughness: 0.4 })
  )
  roof.position.set(0, 2.5, -0.3)
  vehicle.add(roof)

  // 轮子
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2d3748 })
  ;[[-1, 0, 1], [1, 0, 1], [-1, 0, -1], [1, 0, -1]].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x * 1.2, 0.4, z * 1.2)
    vehicle.add(wheel)
  })

  vehicle.position.set(-20, 0, -5)
  scene.add(vehicle)
}

const createSimpleMarkers = () => {
  const createSign = (text: string, x: number, z: number, color: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 200; canvas.height = 50
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    roundRect(ctx, 0, 0, 200, 50, 8)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(text, 100, 33)

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 1.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide })
    )
    sign.rotation.x = -Math.PI / 2
    sign.position.set(x, 0.03, z)
    scene.add(sign)
  }

  createSign('A区', -14, -30, 0x4299e1)
  createSign('B区', 28, -22, 0x9f7aea)
  createSign('C区', 28, 10, 0xed64a6)
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
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

let vehicleSpeed = 0.1

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (animating.value && vehicle) {
    vehicle.position.x += vehicleSpeed
    vehicle.rotation.y = vehicleSpeed > 0 ? 0 : Math.PI

    if (vehicle.position.x > 25) vehicleSpeed = -0.1
    if (vehicle.position.x < -25) vehicleSpeed = 0.1
  }

  controls.update()
  renderer.render(scene, camera)
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
  background: #f7fafc;
  min-height: 100vh;

  .demo-header {
    text-align: center;
    margin-bottom: 24px;
    color: #2d3748;

    h1 { font-size: 28px; margin-bottom: 8px; }
    p { color: #718696; }
  }

  .viewer-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .three-container {
      height: 450px;
      border-radius: 8px;
      overflow: hidden;
      background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
    }
  }

  .stats-row {
    margin-top: 20px;

    .stat-card {
      .el-card__body {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        color: #fff;

        &.blue { background: linear-gradient(135deg, #4299e1, #3182ce); }
        &.green { background: linear-gradient(135deg, #48bb78, #38a169); }
        &.orange { background: linear-gradient(135deg, #ed8936, #dd6b20); }
        &.purple { background: linear-gradient(135deg, #9f7aea, #805ad5); }
      }

      .stat-content {
        .stat-value {
          font-size: 26px;
          font-weight: bold;
          color: #2d3748;
        }
        .stat-label {
          font-size: 13px;
          color: #718696;
        }
      }
    }
  }

  .feature-list {
    margin-top: 24px;
    padding: 20px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    h3 { color: #2d3748; margin-bottom: 12px; }

    ul {
      list-style: none;
      padding: 0;
      li {
        color: #4a5568;
        padding: 8px 0;
        padding-left: 24px;
        position: relative;
        &::before { content: '●'; position: absolute; left: 0; color: #48bb78; }
      }
    }
  }
}
</style>
