<template>
  <div class="demo-selector">
    <div class="hero">
      <h1>🏭 3D 仓库可视化 Demo 选择</h1>
      <p>选择适合你的场景的可视化方案</p>
    </div>

    <el-row :gutter="24" class="demo-grid">
      <el-col :span="12">
        <el-card shadow="hover" class="demo-card" @click="goToDemo('industrial')">
          <template #header>
            <div class="demo-header">
              <span class="demo-num">01</span>
              <span class="demo-title">工业写实风格</span>
            </div>
          </template>
          <div class="demo-preview industrial">
            <div class="preview-scene">
              <div class="building"></div>
              <div class="rack"></div>
              <div class="rack"></div>
              <div class="conveyor"></div>
              <div class="vehicle"></div>
            </div>
          </div>
          <div class="demo-info">
            <p>逼真的工业材质和灯光效果，适合生产监控场景</p>
            <div class="demo-tags">
              <el-tag size="small">Three.js</el-tag>
              <el-tag size="small" type="success">工业风</el-tag>
              <el-tag size="small" type="info">生产监控</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover" class="demo-card" @click="goToDemo('modern')">
          <template #header>
            <div class="demo-header">
              <span class="demo-num">02</span>
              <span class="demo-title">简约现代风格</span>
            </div>
          </template>
          <div class="demo-preview modern">
            <div class="preview-scene">
              <div class="rack-simple"></div>
              <div class="rack-simple"></div>
              <div class="belt-simple"></div>
              <div class="vehicle-simple"></div>
            </div>
          </div>
          <div class="demo-info">
            <p>轻量简洁的几何造型，适合 Dashboard 集成</p>
            <div class="demo-tags">
              <el-tag size="small">Three.js</el-tag>
              <el-tag size="small" type="warning">简约风</el-tag>
              <el-tag size="small" type="info">Dashboard</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover" class="demo-card" @click="goToDemo('cyberpunk')">
          <template #header>
            <div class="demo-header">
              <span class="demo-num">03</span>
              <span class="demo-title">科幻未来风格</span>
            </div>
          </template>
          <div class="demo-preview cyberpunk">
            <div class="preview-scene">
              <div class="grid-neon"></div>
              <div class="rack-neon"></div>
              <div class="rack-neon"></div>
              <div class="particle"></div>
              <div class="glow-line"></div>
            </div>
          </div>
          <div class="demo-info">
            <p>赛博朋克霓虹效果，适合展厅和大屏展示</p>
            <div class="demo-tags">
              <el-tag size="small">Three.js</el-tag>
              <el-tag size="small" type="danger">科幻风</el-tag>
              <el-tag size="small" type="info">大屏展示</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover" class="demo-card" @click="goToDemo('rts')">
          <template #header>
            <div class="demo-header">
              <span class="demo-num">04</span>
              <span class="demo-title">RTS 游戏风格</span>
            </div>
          </template>
          <div class="demo-preview rts">
            <div class="preview-scene">
              <div class="map-tile"></div>
              <div class="base-rts"></div>
              <div class="unit"></div>
              <div class="unit"></div>
              <div class="road"></div>
            </div>
          </div>
          <div class="demo-info">
            <p>俯视等轴测视角，类似即时战略游戏，适合指挥监控</p>
            <div class="demo-tags">
              <el-tag size="small">Three.js</el-tag>
              <el-tag size="small">游戏风</el-tag>
              <el-tag size="small" type="info">指挥中心</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="tech-info">
      <h3>技术说明</h3>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="渲染引擎">Three.js + WebGL</el-descriptions-item>
        <el-descriptions-item label="相机控制">OrbitControls</el-descriptions-item>
        <el-descriptions-item label="光照系统">PBR + 实时阴影</el-descriptions-item>
        <el-descriptions-item label="动画">requestAnimationFrame</el-descriptions-item>
        <el-descriptions-item label="响应式">窗口自适应</el-descriptions-item>
        <el-descriptions-item label="性能优化">几何体复用 + LOD</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToDemo = (type: string) => {
  const routes: Record<string, string> = {
    industrial: '/demo-industrial',
    modern: '/demo-modern',
    cyberpunk: '/demo-cyberpunk',
    rts: '/demo-rts',
  }
  router.push(routes[type])
}
</script>

<style scoped lang="scss">
.demo-selector {
  padding: 40px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;

  .hero {
    text-align: center;
    margin-bottom: 40px;

    h1 {
      font-size: 36px;
      color: #fff;
      margin-bottom: 12px;
    }

    p {
      color: #888;
      font-size: 18px;
    }
  }

  .demo-grid {
    margin-bottom: 40px;
  }

  .demo-card {
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 24px;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;

    &:hover {
      transform: translateY(-8px);
      border-color: rgba(64, 158, 255, 0.5) !important;
      box-shadow: 0 12px 40px rgba(64, 158, 255, 0.2);
    }

    :deep(.el-card__header) {
      background: transparent;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 16px 20px;
    }

    :deep(.el-card__body) {
      padding: 0;
    }

    .demo-header {
      display: flex;
      align-items: center;
      gap: 12px;

      .demo-num {
        font-size: 24px;
        font-weight: bold;
        color: #409eff;
        font-family: 'Georgia', serif;
      }

      .demo-title {
        font-size: 18px;
        color: #fff;
        font-weight: 500;
      }
    }

    .demo-preview {
      height: 200px;
      position: relative;
      overflow: hidden;

      &.industrial {
        background: linear-gradient(135deg, #1a1a2e 0%, #2d3748 100%);

        .preview-scene {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 140px;
        }

        .building {
          position: absolute;
          width: 60px;
          height: 80px;
          background: #4a5568;
          bottom: 0;
          left: 10px;
          border-radius: 2px;
        }

        .rack {
          position: absolute;
          width: 30px;
          height: 60px;
          background: linear-gradient(to right, #2d3748, #4a5568);
          bottom: 0;

          &:nth-child(2) { left: 80px; }
          &:nth-child(3) { left: 120px; height: 50px; }
        }

        .conveyor {
          position: absolute;
          width: 100px;
          height: 8px;
          background: #718096;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 2px;
        }

        .vehicle {
          position: absolute;
          width: 25px;
          height: 15px;
          background: #e53e3e;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 3px;
          animation: moveVehicle 3s ease-in-out infinite;
        }
      }

      &.modern {
        background: linear-gradient(135deg, #f7fafc 0%, #e2e8f0 100%);

        .preview-scene {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          height: 120px;
        }

        .rack-simple {
          position: absolute;
          width: 35px;
          height: 50px;
          background: #4299e1;
          bottom: 0;
          border-radius: 4px;

          &:nth-child(1) { left: 20%; }
          &:nth-child(2) { left: 50%; background: #9f7aea; }
        }

        .belt-simple {
          position: absolute;
          width: 80%;
          height: 6px;
          background: #718096;
          bottom: 25px;
          left: 10%;
          border-radius: 3px;
        }

        .vehicle-simple {
          position: absolute;
          width: 20px;
          height: 12px;
          background: #4299e1;
          bottom: 20px;
          left: 30%;
          border-radius: 3px;
          animation: moveVehicle 2.5s ease-in-out infinite;
        }
      }

      &.cyberpunk {
        background: linear-gradient(135deg, #0a0a12 0%, #1a0a2e 100%);

        .preview-scene {
          position: absolute;
          inset: 0;
        }

        .grid-neon {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .rack-neon {
          position: absolute;
          width: 25px;
          height: 55px;
          background: linear-gradient(to top, #1a1a2e, #2a1a4e);
          border: 1px solid #00ffff;
          box-shadow: 0 0 10px #00ffff, inset 0 0 10px rgba(0, 255, 255, 0.2);
          bottom: 30px;

          &:nth-child(2) { left: 35%; border-color: #ff00ff; box-shadow: 0 0 10px #ff00ff; }
          &:nth-child(3) { left: 55%; }
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #00ffff;
          border-radius: 50%;
          box-shadow: 0 0 10px #00ffff;
          animation: floatParticle 2s ease-in-out infinite;

          &:nth-child(4) { top: 30%; left: 20%; animation-delay: 0.5s; }
        }

        .glow-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ff00ff, #00ffff, transparent);
          bottom: 50px;
          animation: glowPulse 2s ease-in-out infinite;
        }
      }

      &.rts {
        background: linear-gradient(135deg, #2d5016 0%, #1a3a0a 100%);

        .preview-scene {
          position: absolute;
          inset: 0;
        }

        .map-tile {
          position: absolute;
          inset: 20px;
          background:
            repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(0,0,0,0.2) 18px, rgba(0,0,0,0.2) 20px),
            repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.2) 18px, rgba(0,0,0,0.2) 20px);
        }

        .road {
          position: absolute;
          width: 60%;
          height: 8px;
          background: #4a4a4a;
          top: 50%;
          left: 20%;
          transform: translateY(-50%);
        }

        .base-rts {
          position: absolute;
          width: 40px;
          height: 30px;
          background: #8b7355;
          border: 2px solid #5c4033;
          bottom: 40px;
          left: 20px;
        }

        .unit {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #cc0000;
          border-radius: 2px;

          &:nth-child(4) { bottom: 60px; left: 40%; animation: moveUnit 4s linear infinite; }
          &:nth-child(5) { bottom: 80px; left: 50%; animation: moveUnit 5s linear infinite reverse; }
        }
      }
    }

    .demo-info {
      padding: 16px 20px;

      p {
        color: #888;
        margin-bottom: 12px;
        font-size: 14px;
      }

      .demo-tags {
        display: flex;
        gap: 8px;
      }
    }
  }

  .tech-info {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 24px;

    h3 {
      color: #fff;
      margin-bottom: 16px;
    }

    :deep(.el-descriptions__label) {
      background: rgba(0, 0, 0, 0.3) !important;
      color: #888 !important;
    }

    :deep(.el-descriptions__content) {
      background: transparent !important;
      color: #fff !important;
    }
  }
}

@keyframes moveVehicle {
  0%, 100% { transform: translateX(-50%) translateX(-20px); }
  50% { transform: translateX(-50%) translateX(20px); }
}

@keyframes floatParticle {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(-20px); opacity: 1; }
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes moveUnit {
  0% { transform: translateX(0); }
  100% { transform: translateX(100px); }
}
</style>
