<template>
  <div class="demo-page">
    <div class="demo-header">
      <h1>🏭 Demo 1: 工业写实风格</h1>
      <p>真实还原工厂场景，适合生产监控</p>
    </div>

    <el-card shadow="hover" class="viewer-card">
      <template #header>
        <div class="card-header">
          <span>工业仓储实景</span>
          <el-space>
            <el-select v-model="viewMode" size="small">
              <el-option label="自由视角" value="free" />
              <el-option label="俯视" value="top" />
              <el-option label="正视" value="front" />
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
        <el-card shadow="hover">
          <el-statistic title="库存总量" :value="156.8" suffix="吨" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="货架数量" :value="23" suffix="组" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="设备在线" :value="8" suffix="台" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="今日吞吐量" :value="245" suffix="件" />
        </el-card>
      </el-col>
    </el-row>

    <div class="feature-list">
      <h3>特点</h3>
      <ul>
        <li>逼真的工业材质（金属、混凝土、塑料）</li>
        <li>真实的灯光阴影效果</li>
        <li>叉车、传送带等设备建模</li>
        <li>分区标识（原材料区/半成品区/成品区）</li>
        <li>实时数据监控面板</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const containerRef = ref<HTMLElement>()
const viewMode = ref('free')
const animating = ref(true)

let scene: THREE.Scene, camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer, controls: OrbitControls
let animationId: number | null = null
let forklift: THREE.Group | null = null

const initScene = () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = 450

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)
  scene.fog = new THREE.Fog(0x1a1a2e, 60, 150)

  camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500)
  camera.position.set(50, 40, 50)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.1

  // 灯光
  const ambientLight = new THREE.AmbientLight(0x404060, 0.4)
  scene.add(ambientLight)

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
  sunLight.position.set(40, 60, 40)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(2048, 2048)
  sunLight.shadow.camera.near = 10
  sunLight.shadow.camera.far = 150
  sunLight.shadow.camera.left = -60
  sunLight.shadow.camera.right = 60
  sunLight.shadow.camera.top = 60
  sunLight.shadow.camera.bottom = -60
  scene.add(sunLight)

  // 工业补光
  scene.add(new THREE.SpotLight(0xffffee, 0.6, 100, Math.PI / 5, 0.5).translateX(-30).translateY(30).translateZ(-30))
  scene.add(new THREE.SpotLight(0xffffee, 0.6, 100, Math.PI / 5, 0.5).translateX(30).translateY(30).translateZ(30))

  createEnvironment()
  animate()
}

const createEnvironment = () => {
  // 混凝土地面
  const floorGeo = new THREE.PlaneGeometry(120, 100)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.9, metalness: 0.1 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // 地面网格
  scene.add(new THREE.GridHelper(120, 60, 0x2d3748, 0x2d3748))

  // 创建货架
  createRacks()

  // 创建传送带
  createConveyors()

  // 创建叉车
  createForklift()

  // 区域标识
  createZoneMarkers()
}

const createRacks = () => {
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.6, metalness: 0.4 })
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xf6ad55, roughness: 0.4, metalness: 0.6 })
  const cargoColors = [0x48bb78, 0xf6ad55, 0xa0aec0]

  // A区
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const rack = createRackUnit(rackMat, beamMat, cargoColors)
      rack.position.set(-35 + col * 14, 0, -25 + row * 12)
      rack.name = `A-${row + 1}-${col + 1}`
      scene.add(rack)
    }
  }

  // B区
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const rack = createRackUnit(rackMat, beamMat, cargoColors)
      rack.position.set(15 + col * 14, 0, -20 + row * 12)
      rack.name = `B-${row + 1}-${col + 1}`
      scene.add(rack)
    }
  }
}

const createRackUnit = (rackMat: THREE.Material, beamMat: THREE.Material, cargoColors: number[]) => {
  const group = new THREE.Group()
  const w = 10, h = 12, d = 5

  // 立柱
  const colGeo = new THREE.BoxGeometry(0.4, h, 0.4)
  ;[[-w/2 + 0.2, -d/2 + 0.2], [w/2 - 0.2, -d/2 + 0.2], [-w/2 + 0.2, d/2 - 0.2], [w/2 - 0.2, d/2 - 0.2]].forEach(([x, z]) => {
    const col = new THREE.Mesh(colGeo, rackMat)
    col.position.set(x, h / 2, z)
    col.castShadow = true
    group.add(col)
  })

  // 横梁
  const beamGeo = new THREE.BoxGeometry(w - 0.4, 0.25, 0.2)
  ;[0, 4, 8, 12].forEach(y => {
    ;[-d/2 + 0.2, d/2 - 0.2].forEach(z => {
      const beam = new THREE.Mesh(beamGeo, beamMat)
      beam.position.set(0, y, z)
      beam.castShadow = true
      group.add(beam)
    })
  })

  // 货物
  const cargoGeo = new THREE.BoxGeometry(1.5, 2, 1.2)
  for (let level = 0; level < 3; level++) {
    const count = Math.floor(Math.random() * 4) + 1
    for (let i = 0; i < count; i++) {
      const cargo = new THREE.Mesh(cargoGeo, new THREE.MeshStandardMaterial({
        color: cargoColors[Math.floor(Math.random() * cargoColors.length)],
        roughness: 0.5
      }))
      cargo.position.set(-w/2 + 1.5 + i * 2.2, 1.5 + level * 4, 0)
      cargo.castShadow = true
      group.add(cargo)
    }
  }

  return group
}

const createConveyors = () => {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.3, metalness: 0.7 })
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9 })

  // 主传送带
  const frame = new THREE.Mesh(new THREE.BoxGeometry(70, 0.6, 2.5), frameMat)
  frame.position.set(0, 1, 0)
  frame.castShadow = true
  scene.add(frame)

  const belt = new THREE.Mesh(new THREE.BoxGeometry(68, 0.1, 2), beltMat)
  belt.position.set(0, 1.35, 0)
  scene.add(belt)

  // 滚筒
  const rollerGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.3, 16)
  for (let i = 0; i < 18; i++) {
    const roller = new THREE.Mesh(rollerGeo, frameMat)
    roller.rotation.x = Math.PI / 2
    roller.position.set(-32 + i * 4, 1.1, 0)
    scene.add(roller)
  }

  // 入料口
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 4), new THREE.MeshStandardMaterial({ color: 0x3182ce, roughness: 0.5 }))
  hopper.position.set(-40, 2, 0)
  hopper.castShadow = true
  scene.add(hopper)
}

const createForklift = () => {
  forklift = new THREE.Group()

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe53e3e, roughness: 0.4, metalness: 0.3 })
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x3182ce, roughness: 0.3, metalness: 0.5 })
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9 })

  // 车身
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 3.5), bodyMat)
  body.position.y = 1.8
  body.castShadow = true
  forklift.add(body)

  // 驾驶舱
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.8), cabinMat)
  cabin.position.set(0, 3.3, -0.6)
  cabin.castShadow = true
  forklift.add(cabin)

  // 货叉
  const forkMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.3, metalness: 0.7 })
  ;[-0.7, 0.7].forEach(x => {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 3), forkMat)
    fork.position.set(x, 1.2, 3)
    forklift.add(fork)
  })

  // 支柱
  ;[-0.7, 0.7].forEach(x => {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.5, 0.15), forkMat)
    mast.position.set(x, 2.8, 1.5)
    forklift.add(mast)
  })

  // 轮胎
  const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16)
  ;[[-1.3, 0, 1.2], [1.3, 0, 1.2], [-1.3, 0, -1.2], [1.3, 0, -1.2]].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, tireMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, y, z)
    forklift.add(wheel)
  })

  // 警示灯
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffa500 }))
  light.position.set(0, 4.2, -0.8)
  forklift.add(light)

  forklift.position.set(-15, 0, -10)
  scene.add(forklift)
}

const createZoneMarkers = () => {
  const createSign = (text: string, x: number, z: number, color: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(text, 128, 42)

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 2.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
    )
    sign.rotation.x = -Math.PI / 2
    sign.position.set(x, 0.05, z)
    scene.add(sign)
  }

  createSign('A区 - 原材料', -15, -35, 0x38a169)
  createSign('B区 - 半成品', 30, -28, 0xd69e2e)
  createSign('C区 - 成品', 30, 15, 0x3182ce)
  createSign('入库区', -45, 0, 0x3182ce)
  createSign('出库区', 45, 0, 0xe53e3e)
}

let speed = 0.12

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (animating.value && forklift) {
    forklift.position.x += speed
    forklift.rotation.y = speed > 0 ? 0 : Math.PI

    if (forklift.position.x > 35) speed = -0.12
    if (forklift.position.x < -35) speed = 0.12
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
  background: #0d1117;
  min-height: 100vh;

  .demo-header {
    text-align: center;
    margin-bottom: 24px;
    color: #c9d1d9;

    h1 { font-size: 28px; margin-bottom: 8px; }
    p { color: #8b949e; }
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
    }
  }

  .stats-row {
    margin-top: 20px;
    :deep(.el-card) {
      background: #161b22;
      border-color: #30363d;
      .el-statistic__head { color: #8b949e; }
      .el-statistic__content { color: #58a6ff; font-size: 24px; }
    }
  }

  .feature-list {
    margin-top: 24px;
    padding: 20px;
    background: #161b22;
    border-radius: 8px;
    border: 1px solid #30363d;

    h3 { color: #c9d1d9; margin-bottom: 12px; }

    ul {
      list-style: none;
      padding: 0;
      li {
        color: #8b949e;
        padding: 8px 0;
        padding-left: 20px;
        position: relative;
        &::before { content: '✓'; position: absolute; left: 0; color: #3fb950; }
      }
    }
  }
}
</style>
