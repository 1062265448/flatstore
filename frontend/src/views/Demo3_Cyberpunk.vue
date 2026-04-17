<template>
  <div class="demo-page">
    <div class="demo-header">
      <h1>🚀 Demo 3: 科幻未来风格</h1>
      <p>赛博朋克科技感，适合大屏展示</p>
    </div>

    <el-card shadow="hover" class="viewer-card">
      <template #header>
        <div class="card-header">
          <span>未来仓储系统</span>
          <el-space>
            <el-select v-model="viewMode" size="small">
              <el-option label="自由视角" value="free" />
              <el-option label="俯视" value="top" />
              <el-option label="环绕" value="orbit" />
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
        <el-card shadow="hover" class="cyber-card">
          <div class="cyber-stat">
            <span class="cyber-label">库存总量</span>
            <span class="cyber-value">156.8<span class="unit">TON</span></span>
            <div class="cyber-line"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cyber-card">
          <div class="cyber-stat">
            <span class="cyber-label">货架数量</span>
            <span class="cyber-value">23<span class="unit">UNITS</span></span>
            <div class="cyber-line"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cyber-card">
          <div class="cyber-stat">
            <span class="cyber-label">设备在线</span>
            <span class="cyber-value">8<span class="unit">/10</span></span>
            <div class="cyber-line"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cyber-card">
          <div class="cyber-stat">
            <span class="cyber-label">吞吐量</span>
            <span class="cyber-value">245<span class="unit">/HR</span></span>
            <div class="cyber-line"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="feature-list">
      <h3>特点</h3>
      <ul>
        <li>霓虹灯光效果，赛博朋克风格</li>
        <li>发光边框和扫描线效果</li>
        <li>全息投影式数据展示</li>
        <li>动态粒子系统</li>
        <li>适合展厅和大屏展示</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const containerRef = ref<HTMLElement>()
const viewMode = ref('orbit')
const animating = ref(true)

let scene: THREE.Scene, camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer, controls: OrbitControls
let animationId: number | null = null
let vehicle: THREE.Group | null = null
let particles: THREE.Points | null = null

const initScene = () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = 450

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a12)
  scene.fog = new THREE.Fog(0x0a0a12, 50, 150)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500)
  camera.position.set(45, 35, 45)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5

  // 霓虹灯光
  scene.add(new THREE.AmbientLight(0x1a1a2e, 0.3))

  const pointLight1 = new THREE.PointLight(0x00ffff, 2, 100)
  pointLight1.position.set(-30, 20, -30)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xff00ff, 2, 100)
  pointLight2.position.set(30, 20, 30)
  scene.add(pointLight2)

  const spotLight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 6, 0.5)
  spotLight.position.set(0, 50, 0)
  spotLight.castShadow = true
  scene.add(spotLight)

  createEnvironment()
  createParticles()
  animate()
}

const createEnvironment = () => {
  // 科技地面
  const floorGeo = new THREE.PlaneGeometry(120, 100, 60, 50)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d1a,
    roughness: 0.2,
    metalness: 0.8,
    wireframe: false
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // 网格线
  const grid = new THREE.GridHelper(120, 60, 0x00ffff, 0x1a1a2e)
  grid.position.y = 0.05
  scene.add(grid)

  // 科技货架
  createCyberRacks()

  // 传送带
  createCyberConveyor()

  // 车辆
  createCyberVehicle()

  // 发光标识
  createCyberMarkers()
}

const createCyberRacks = () => {
  const neonColors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00]

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const group = new THREE.Group()
      const w = 8, h = 10, d = 4
      const color = neonColors[(row + col) % neonColors.length]

      // 框架
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.3,
        metalness: 0.8,
        emissive: color,
        emissiveIntensity: 0.1
      })

      // 立柱
      const colGeo = new THREE.BoxGeometry(0.3, h, 0.3)
      ;[[-w/2 + 0.15, -d/2 + 0.15], [w/2 - 0.15, -d/2 + 0.15], [-w/2 + 0.15, d/2 - 0.15], [w/2 - 0.15, d/2 - 0.15]].forEach(([x, z]) => {
        const col = new THREE.Mesh(colGeo, frameMat)
        col.position.set(x, h / 2, z)
        group.add(col)
      })

      // 发光横梁
      const beamMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.2
      })
      const beamGeo = new THREE.BoxGeometry(w, 0.15, 0.1)
      ;[0, 5, 10].forEach(y => {
        const beam = new THREE.Mesh(beamGeo, beamMat)
        beam.position.set(0, y, d/2 - 0.1)
        group.add(beam)
        const beam2 = beam.clone()
        beam2.position.z = -d/2 + 0.1
        group.add(beam2)
      })

      // 发光货物
      const cargoGeo = new THREE.BoxGeometry(1.5, 1.8, 1.2)
      for (let level = 0; level < 2; level++) {
        const count = Math.floor(Math.random() * 3) + 1
        for (let i = 0; i < count; i++) {
          const cargo = new THREE.Mesh(
            cargoGeo,
            new THREE.MeshStandardMaterial({
              color: color,
              emissive: color,
              emissiveIntensity: 0.4,
              transparent: true,
              opacity: 0.8
            })
          )
          cargo.position.set(-w/2 + 1.2 + i * 2, 1.3 + level * 4.5, 0)
          group.add(cargo)
        }
      }

      group.position.set(-30 + col * 15, 0, -20 + row * 14)
      scene.add(group)
    }
  }
}

const createCyberConveyor = () => {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    emissive: 0x00ffff,
    emissiveIntensity: 0.2,
    roughness: 0.3,
    metalness: 0.7
  })

  // 主体
  const belt = new THREE.Mesh(new THREE.BoxGeometry(50, 0.5, 2), mat)
  belt.position.set(0, 0.5, 0)
  scene.add(belt)

  // 发光边框
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1
  })

  const edgeGeo = new THREE.BoxGeometry(50, 0.1, 0.1)
  const edge1 = new THREE.Mesh(edgeGeo, edgeMat)
  edge1.position.set(0, 0.76, 1)
  scene.add(edge1)
  const edge2 = edge1.clone()
  edge2.position.z = -1
  scene.add(edge2)

  // 货物
  const cargoGeo = new THREE.BoxGeometry(1.5, 0.8, 1)
  const cargoMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 0.5
  })
  for (let i = 0; i < 6; i++) {
    const cargo = new THREE.Mesh(cargoGeo, cargoMat)
    cargo.position.set(-22 + i * 9, 1.1, 0)
    scene.add(cargo)
  }
}

const createCyberVehicle = () => {
  vehicle = new THREE.Group()

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    emissive: 0x00ffff,
    emissiveIntensity: 0.3,
    roughness: 0.2,
    metalness: 0.8
  })

  // 车身
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 3.5), mat)
  body.position.y = 1.2
  vehicle.add(body)

  // 发光边框
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1
  })

  const glowGeo = new THREE.BoxGeometry(2.6, 0.1, 3.6)
  const glow1 = new THREE.Mesh(glowGeo, glowMat)
  glow1.position.y = 2
  vehicle.add(glow1)

  // 轮子
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16)
  ;[[-1.2, 0, 1.2], [1.2, 0, 1.2], [-1.2, 0, -1.2], [1.2, 0, -1.2]].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 }))
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, 0.4, z)
    vehicle.add(wheel)
  })

  vehicle.position.set(-25, 0, -8)
  scene.add(vehicle)
}

const createCyberMarkers = () => {
  const createSign = (text: string, x: number, z: number, color: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // 发光背景
    ctx.fillStyle = '#0d0d1a'
    ctx.fillRect(0, 0, 256, 64)

    // 边框
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`
    ctx.lineWidth = 3
    ctx.strokeRect(2, 2, 252, 60)

    // 发光文字
    ctx.shadowColor = `#${color.toString(16).padStart(6, '0')}`
    ctx.shadowBlur = 20
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    ctx.font = 'bold 32px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(text, 128, 44)

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 2.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide })
    )
    sign.rotation.x = -Math.PI / 2
    sign.position.set(x, 0.05, z)
    scene.add(sign)
  }

  createSign('A-ZONE', -18, -32, 0x00ffff)
  createSign('B-ZONE', 25, -20, 0xff00ff)
  createSign('C-ZONE', 25, 12, 0xffff00)
}

const createParticles = () => {
  const geometry = new THREE.BufferGeometry()
  const count = 500
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 100
    positions[i + 1] = Math.random() * 50
    positions[i + 2] = (Math.random() - 0.5) * 80
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.3,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

let vehicleSpeed = 0.15

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (animating.value) {
    if (vehicle) {
      vehicle.position.x += vehicleSpeed
      vehicle.rotation.y = vehicleSpeed > 0 ? 0 : Math.PI

      if (vehicle.position.x > 30) vehicleSpeed = -0.15
      if (vehicle.position.x < -30) vehicleSpeed = 0.15
    }

    if (particles) {
      particles.rotation.y += 0.001
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

const toggleAnimation = () => {
  animating.value = !animating.value
  controls.autoRotate = animating.value
}

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
  background: #0a0a12;
  min-height: 100vh;

  .demo-header {
    text-align: center;
    margin-bottom: 24px;
    color: #00ffff;

    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      text-shadow: 0 0 20px #00ffff;
    }
    p { color: #888; }
  }

  .viewer-card {
    background: rgba(10, 10, 18, 0.9) !important;
    border: 1px solid #00ffff !important;

    :deep(.el-card__header) {
      background: transparent;
      border-bottom: 1px solid rgba(0, 255, 255, 0.3);
      color: #00ffff;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .three-container {
      height: 450px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.2);
    }
  }

  .stats-row {
    margin-top: 20px;

    .cyber-card {
      background: rgba(10, 10, 18, 0.9) !important;
      border: 1px solid #00ffff !important;

      .cyber-stat {
        padding: 16px;
        text-align: center;
        position: relative;

        .cyber-label {
          display: block;
          font-size: 12px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }

        .cyber-value {
          font-size: 32px;
          font-weight: bold;
          color: #00ffff;
          font-family: 'Courier New', monospace;
          text-shadow: 0 0 10px #00ffff;

          .unit {
            font-size: 14px;
            color: #888;
          }
        }

        .cyber-line {
          position: absolute;
          bottom: 0;
          left: 20%;
          right: 20%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00ffff, transparent);
        }
      }
    }
  }

  .feature-list {
    margin-top: 24px;
    padding: 20px;
    background: rgba(10, 10, 18, 0.9);
    border-radius: 8px;
    border: 1px solid rgba(255, 0, 255, 0.3);

    h3 { color: #ff00ff; margin-bottom: 12px; }

    ul {
      list-style: none;
      padding: 0;
      li {
        color: #888;
        padding: 8px 0;
        padding-left: 24px;
        position: relative;
        &::before {
          content: '>';
          position: absolute;
          left: 0;
          color: #ff00ff;
          font-family: monospace;
        }
      }
    }
  }
}
</style>
