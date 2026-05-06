<template>
  <div class="login-page" :class="'theme-' + theme" :style="themeVars">
    <!-- 主题切换按钮（在 bg-layer 之外，确保 z-index 正确） -->
    <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换亮色' : '切换暗色'">
      <svg v-if="isDark" width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- 动态背景纹理层 -->
    <div class="bg-layer">
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-orb orb-3"></div>
      <div class="bg-grid"></div>
    </div>

    <!-- 主容器 -->
    <div class="login-wrapper">
      <!-- 左侧品牌区 -->
      <div class="login-brand">
        <div class="brand-shimmer"></div>
        <div class="brand-content">
          <div class="brand-logo" @click="router.push('/')">
            <span class="brand-text">平面库配货</span>
            <span class="brand-sub">Flatstore</span>
          </div>

          <div class="brand-slogan">
            <h1>智能仓储<br/>高效配货</h1>
            <p>基于 AI 与 3D 可视化的现代仓库管理系统</p>
          </div>

          <div class="brand-features">
            <div class="feature-item"><span>智能库存管理</span></div>
            <div class="feature-item"><span>高效配货流程</span></div>
            <div class="feature-item"><span>AI 图像识别</span></div>
            <div class="feature-item"><span>3D 仓库可视化</span></div>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="login-form-container">
        <div class="form-layer">
          <div class="form-card">
            <div class="form-header">
              <h2>欢迎回来</h2>
              <p>登录您的账户继续操作</p>
              <div class="header-line"></div>
            </div>

            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              class="login-form"
              @submit.prevent="handleLogin"
            >
              <el-form-item prop="username" class="form-group">
                <label class="form-label">用户名</label>
                <el-input
                  v-model="form.username"
                  placeholder="请输入用户名"
                  size="large"
                  autocomplete="username"
                  class="custom-input"
                />
              </el-form-item>

              <el-form-item prop="password" class="form-group">
                <label class="form-label">密码</label>
                <el-input
                  v-model="form.password"
                  type="password"
                  placeholder="请输入密码"
                  size="large"
                  autocomplete="current-password"
                  show-password
                  class="custom-input"
                  @keyup.enter="handleLogin"
                />
              </el-form-item>

              <el-form-item class="form-group">
                <el-button
                  type="primary"
                  size="large"
                  class="login-btn"
                  :loading="authStore.loading"
                  @click="handleLogin"
                >
                  <span v-if="!authStore.loading">登 录</span>
                </el-button>
              </el-form-item>

              <div class="form-footer">
                <div class="footer-divider"></div>
                <p class="register-link">
                  还没有账户？
                  <el-link type="primary" @click="showRegister = true" :underline="false">立即注册</el-link>
                </p>
                <p class="default-account">
                  默认账户：<code>admin</code> / <code>admin123</code>
                </p>
              </div>
            </el-form>
          </div>
        </div>
      </div>
    </div>

    <!-- 注册对话框 -->
    <el-dialog
      v-model="showRegister"
      title="注册新账户"
      width="480px"
      destroy-on-close
      class="register-dialog"
    >
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        @submit.prevent="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRegister = false">取消</el-button>
        <el-button
          type="primary"
          :loading="authStore.loading"
          @click="handleRegister"
        >
          注册
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

// 独立主题管理 — 默认亮色
const theme = ref<'light' | 'dark'>('light')
const isDark = computed(() => theme.value === 'dark')

// CSS 变量 — 亮色默认值
const themeDefaults = {
  '--bg-grad': 'linear-gradient(135deg, #ffffff 0%, #f0f0ff 25%, #faf5ff 50%, #eef2ff 75%, #f5f3ff 100%)',
  '--bg-grid-color': 'rgba(99, 102, 241, 0.04)',
  '--orb1-color': 'radial-gradient(circle, rgba(129, 140, 248, 0.2) 0%, transparent 70%)',
  '--orb2-color': 'radial-gradient(circle, rgba(167, 139, 250, 0.18) 0%, transparent 70%)',
  '--orb3-color': 'radial-gradient(circle, rgba(196, 181, 253, 0.15) 0%, transparent 70%)',
  '--wrapper-shadow': '0 20px 60px rgba(99, 102, 241, 0.1), 0 4px 16px rgba(0, 0, 0, 0.06)',
  '--wrapper-border': 'rgba(255, 255, 255, 0.6)',
  '--brand-bg': 'linear-gradient(160deg, #818cf8 0%, #6366f1 30%, #7c3aed 60%, #a78bfa 100%)',
  '--brand-shimmer': 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
  '--brand-title': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
  '--brand-feature-bg': 'rgba(255, 255, 255, 0.15)',
  '--brand-feature-border': 'rgba(255, 255, 255, 0.2)',
  '--brand-feature-hover-bg': 'rgba(255, 255, 255, 0.25)',
  '--brand-feature-hover-border': 'rgba(255, 255, 255, 0.35)',
  '--brand-feature-text': '#1e1b4b',
  '--form-bg': 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
  '--card-bg': 'rgba(255, 255, 255, 0.85)',
  '--card-border': 'rgba(99, 102, 241, 0.08)',
  '--card-shadow': '0 8px 32px rgba(99, 102, 241, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
  '--form-title': '#0f172a',
  '--form-subtitle': '#64748b',
  '--form-label': '#334155',
  '--input-bg': 'transparent',
  '--input-border': 'rgba(148, 163, 184, 0.25)',
  '--input-hover-border': 'rgba(99, 102, 241, 0.3)',
  '--input-hover-bg': 'rgba(241, 245, 249, 0.3)',
  '--input-text': '#0f172a',
  '--input-placeholder': '#94a3b8',
  '--toggle-border': 'rgba(99, 102, 241, 0.15)',
  '--toggle-bg': 'rgba(255, 255, 255, 0.8)',
  '--toggle-color': '#6366f1',
  '--toggle-hover-bg': 'white',
  '--toggle-hover-color': '#4f46e5',
  '--toggle-shadow': '0 2px 12px rgba(99, 102, 241, 0.1)',
  '--toggle-hover-shadow': '0 4px 20px rgba(99, 102, 241, 0.15)',
  '--footer-divider': 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.08), transparent)',
  '--register-color': '#64748b',
  '--register-link': '#4f46e5',
  '--default-bg': 'rgba(99, 102, 241, 0.03)',
  '--default-border': 'rgba(99, 102, 241, 0.06)',
  '--default-text': '#64748b',
  '--default-code-bg': 'rgba(99, 102, 241, 0.05)',
  '--default-code-text': '#334155',
}

// 暗色覆盖值
const themeDark = {
  '--bg-grad': 'linear-gradient(135deg, #0f0c29 0%, #1a1a3e 30%, #24243e 60%, #1a1a2e 100%)',
  '--bg-grid-color': 'rgba(255,255,255,0.02)',
  '--orb1-color': 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%)',
  '--orb2-color': 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)',
  '--orb3-color': 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
  '--wrapper-shadow': '0 25px 80px rgba(0, 0, 0, 0.4), 0 8px 30px rgba(0, 0, 0, 0.2)',
  '--wrapper-border': 'rgba(255, 255, 255, 0.08)',
  '--brand-bg': 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #3730a3 70%, #4338ca 100%)',
  '--brand-shimmer': 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)',
  '--brand-title': 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 50%, #a5b4fc 100%)',
  '--brand-feature-bg': 'rgba(255, 255, 255, 0.04)',
  '--brand-feature-border': 'rgba(255, 255, 255, 0.06)',
  '--brand-feature-hover-bg': 'rgba(255, 255, 255, 0.08)',
  '--brand-feature-hover-border': 'rgba(255, 255, 255, 0.12)',
  '--brand-feature-text': 'white',
  '--form-bg': 'linear-gradient(180deg, #0d0d1a 0%, #111827 50%, #0f0c29 100%)',
  '--card-bg': 'transparent',
  '--card-border': 'rgba(255, 255, 255, 0.06)',
  '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.15)',
  '--form-title': '#f1f5f9',
  '--form-subtitle': '#64748b',
  '--form-label': '#94a3b8',
  '--input-bg': 'transparent',
  '--input-border': 'rgba(255, 255, 255, 0.08)',
  '--input-hover-border': 'rgba(255, 255, 255, 0.15)',
  '--input-hover-bg': 'transparent',
  '--input-text': '#e2e8f0',
  '--input-placeholder': '#475569',
  '--toggle-border': 'rgba(255, 255, 255, 0.1)',
  '--toggle-bg': 'rgba(255, 255, 255, 0.08)',
  '--toggle-color': 'rgba(255, 255, 255, 0.7)',
  '--toggle-hover-bg': 'rgba(255, 255, 255, 0.15)',
  '--toggle-hover-color': 'white',
  '--toggle-shadow': 'none',
  '--toggle-hover-shadow': 'none',
  '--footer-divider': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
  '--register-color': '#64748b',
  '--register-link': '#818cf8',
  '--default-bg': 'rgba(255, 255, 255, 0.03)',
  '--default-border': 'rgba(255, 255, 255, 0.05)',
  '--default-text': '#475569',
  '--default-code-bg': 'rgba(255, 255, 255, 0.06)',
  '--default-code-text': '#64748b',
}

const themeVars = computed(() => ({
  ...themeDefaults,
  ...(theme.value === 'dark' ? themeDark : {}),
}))

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('login-theme', theme.value)
}

onMounted(() => {
  const saved = localStorage.getItem('login-theme')
  if (saved === 'dark') {
    theme.value = 'dark'
  }
  // 无偏好时默认亮色
})

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度为6-30个字符', trigger: 'blur' },
  ],
}

const showRegister = ref(false)
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
})

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度为6-30个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

const handleLogin = async () => {
  try {
    await formRef.value?.validate()
    await authStore.login(form)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error: any) {
    if (error?.response?.status === 401) {
      ElMessage.error('用户名或密码错误')
    } else if (error.message) {
      ElMessage.error(error.message)
    }
  }
}

const handleRegister = async () => {
  try {
    await registerFormRef.value?.validate()
    await authStore.register({
      username: registerForm.username,
      password: registerForm.password,
    })
    ElMessage.success('注册成功，已自动登录')
    showRegister.value = false
  } catch (error: any) {
    if (error?.response?.status === 400 && error?.response?.data?.message?.includes('已存在')) {
      ElMessage.error('用户名已存在')
    } else if (error.message) {
      ElMessage.error(error.message)
    }
  }
}
</script>

<style scoped lang="scss">
// ==================== 页面整体 ====================
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 20px;
}

// ==================== 动态背景层 ====================
.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: var(--bg-grad);

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--bg-grid-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--bg-grid-color) 1px, transparent 1px);
    background-size: 60px 60px;
  }
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: orbFloat 20s ease-in-out infinite;

  &.orb-1 {
    width: 500px;
    height: 500px;
    background: var(--orb1-color);
    top: -10%;
    left: -5%;
  }
  &.orb-2 {
    width: 400px;
    height: 400px;
    background: var(--orb2-color);
    bottom: -10%;
    right: 10%;
    animation-delay: -7s;
    animation-duration: 25s;
  }
  &.orb-3 {
    width: 300px;
    height: 300px;
    background: var(--orb3-color);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -14s;
    animation-duration: 30s;
  }
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -40px) scale(1.1); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(40px, 30px) scale(1.05); }
}

// ==================== 主容器 ====================
.login-wrapper {
  display: flex;
  max-width: 1100px;
  width: 100%;
  min-height: 640px;
  border-radius: 28px;
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-shadow: var(--wrapper-shadow);
  border: 1px solid var(--wrapper-border);
}

// ==================== 左侧品牌区 ====================
.login-brand {
  flex: 1.1;
  position: relative;
  padding: 56px 48px;
  background: var(--brand-bg);
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .brand-shimmer {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: var(--brand-shimmer);
    animation: shimmer 8s ease-in-out infinite;
    pointer-events: none;
  }

  .brand-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }

  .brand-logo {
    display: flex;
    align-items: baseline;
    gap: 10px;
    cursor: pointer;
    transition: opacity 0.3s ease;
    margin-bottom: 48px;
    &:hover { opacity: 0.85; }

    .brand-text {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.5;
      margin-left: auto;
    }
  }

  .brand-slogan {
    margin-bottom: 48px;
    h1 {
      font-size: 40px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 16px;
      letter-spacing: -1px;
      background: var(--brand-title);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      font-size: 15px;
      opacity: 0.65;
      line-height: 1.6;
    }
  }

  .brand-features {
    display: flex;
    flex-direction: column;
    gap: 14px;

    .feature-item {
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.75;
      transition: all 0.3s ease;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--brand-feature-bg);
      border: 1px solid var(--brand-feature-border);
      &:hover {
        opacity: 1;
        background: var(--brand-feature-hover-bg);
        border-color: var(--brand-feature-hover-border);
        transform: translateX(4px);
      }
      color: var(--brand-feature-text);
    }
  }
}

@keyframes shimmer {
  0%, 100% { transform: translate(-30%, -30%) rotate(45deg); }
  50% { transform: translate(10%, 10%) rotate(45deg); }
}

// ==================== 右侧表单区 ====================
.login-form-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: var(--form-bg);

  .form-layer {
    width: 100%;
    max-width: 420px;
  }

  .form-card {
    background: var(--card-bg);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 40px;
    border: 1px solid var(--card-border);
    box-shadow: var(--card-shadow);
  }

  .form-header {
    text-align: center;
    margin-bottom: 36px;
    h2 {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--form-title);
      letter-spacing: -0.5px;
    }
    p { font-size: 14px; color: var(--form-subtitle); }
    .header-line {
      width: 40px;
      height: 3px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 2px;
      margin: 16px auto 0;
    }
  }

  .login-form {
    .form-group { margin-bottom: 24px; }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--form-label);
      margin-bottom: 8px;
      letter-spacing: 0.3px;
    }

    :deep(.custom-input) {
      .el-input__wrapper {
        background: var(--input-bg) !important;
        border: 1px solid var(--input-border) !important;
        border-radius: 12px !important;
        padding: 4px 16px !important;
        box-shadow: none !important;
        transition: all 0.3s ease !important;
        &:hover {
          border-color: var(--input-hover-border) !important;
          background: var(--input-hover-bg) !important;
        }
        &.is-focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
        .el-input__inner {
          color: var(--input-text) !important;
          font-size: 15px !important;
          padding: 12px 0 !important;
          height: auto !important;
          line-height: 1.5 !important;
          &::placeholder { color: var(--input-placeholder) !important; }
        }
        .el-input__suffix { color: var(--form-subtitle) !important; }
      }
    }

    :deep(.el-form-item__error) { color: #f87171 !important; }

    .login-btn {
      width: 100%;
      height: 50px;
      border-radius: 12px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      letter-spacing: 4px !important;
      border: none !important;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35) !important;
      transition: all 0.3s ease !important;
      &:hover {
        box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5) !important;
        transform: translateY(-1px) !important;
      }
      &:active { transform: translateY(0) !important; }
      :deep(.el-button__text) {
        color: white !important;
        letter-spacing: 4px;
      }
    }
  }

  .form-footer {
    margin-top: 32px;
    text-align: center;
    .footer-divider {
      height: 1px;
      background: var(--footer-divider);
      margin-bottom: 20px;
    }
    .register-link {
      font-size: 14px;
      color: var(--register-color);
      margin-bottom: 18px;
      :deep(.el-link) {
        color: var(--register-link) !important;
        font-weight: 600;
        &:hover { color: var(--register-link-hover) !important; }
      }
    }
    .default-account {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      color: var(--default-text);
      padding: 8px 14px;
      border-radius: 8px;
      background: var(--default-bg);
      border: 1px solid var(--default-border);
      code {
        background: var(--default-code-bg);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', 'Consolas', monospace;
        font-size: 12px;
        color: var(--default-code-text);
      }
    }
  }
}

// ==================== 注册对话框 ====================
:global(.register-dialog) {
  .el-dialog__header { padding: 24px 24px 16px !important; }
  .el-dialog__title { font-size: 20px !important; font-weight: 700 !important; color: var(--dialog-title) !important; }
  .el-dialog__body { padding: 16px 24px 24px !important; }
  .el-dialog__footer { padding: 16px 24px 24px !important; }
}

// ==================== 响应式 ====================
@media (max-width: 900px) {
  .login-wrapper {
    flex-direction: column;
    max-width: 520px;
    min-height: auto;
  }
  .login-brand {
    padding: 40px 32px;
    .brand-logo { margin-bottom: 28px; }
    .brand-slogan { margin-bottom: 28px; }
    .brand-slogan h1 { font-size: 28px; }
    .brand-sub { display: none; }
  }
  .login-form-container { padding: 40px 32px; }
}

@media (max-width: 520px) {
  .login-page { padding: 12px; }
  .login-wrapper { border-radius: 20px; }
  .login-brand { padding: 32px 24px; }
  .login-form-container {
    padding: 32px 20px;
    .form-card { padding: 28px 20px; }
  }
}

// ==================== 主题切换按钮 ====================
.theme-toggle {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--toggle-border);
  background: var(--toggle-bg);
  color: var(--toggle-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: var(--toggle-hover-bg);
    color: var(--toggle-hover-color);
    transform: rotate(15deg);
  }
}

// ==================== 亮色/暗色主题通过 CSS 变量控制 ====================
// 所有颜色已由 var() 绑定，切换时自动更新
</style>
