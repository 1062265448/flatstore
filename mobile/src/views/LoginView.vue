<template>
  <div class="login-page">
    <div class="login-content">
      <div class="login-header">
        <div class="brand-label">FLATSTORE</div>
        <h1 class="brand-title">平面库配货</h1>
        <p class="brand-sub">库存管理 · 智能识别 · 配货追踪</p>
      </div>

      <div class="login-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            autocomplete="username"
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            autocomplete="current-password"
            @keyup.enter="handleSubmit"
          />
        </div>

        <button class="btn-primary" :disabled="loading" @click="handleSubmit">
          <span v-if="loading" class="spinner" style="border-top-color: white;"></span>
          登录
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const authStore = useAuthStore()
const { success, danger } = useToast()

const loading = ref(false)
const form = reactive({ username: '', password: '' })

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    danger('请填写用户名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.login({ username: form.username, password: form.password })
    success('登录成功')
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '登录失败'
    danger(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  padding: 40px 24px;
  padding-top: calc(40px + var(--safe-top));
}
.login-content {
  width: 100%;
  max-width: 360px;
}
.login-header {
  text-align: center;
  margin-bottom: 48px;
}
.brand-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-tertiary);
  font-weight: 500;
  margin-bottom: 8px;
}
.brand-title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.5px;
  color: var(--text);
}
.brand-sub {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-top: 6px;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-input {
  height: 48px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 16px;
  font-size: 15px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: var(--accent);
}
.form-input::placeholder {
  color: var(--text-tertiary);
}
.btn-primary {
  height: 50px;
  background: var(--text);
  color: white;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  transition: all 0.2s;
}
.btn-primary:active {
  transform: scale(0.98);
}
.btn-primary:disabled {
  opacity: 0.5;
}
</style>
