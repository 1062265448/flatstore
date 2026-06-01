# APK 构建指南

> 使用 Capacitor 将前端打包为 Android APK

---

## 1. 环境要求

| 工具 | 版本要求 |
|------|----------|
| Node.js | >= 18 |
| Android Studio | Hedgehog (2023.1.1) 或更新 |
| JDK | 17+（Android Studio 自带） |
| Gradle | 8.x（Android Studio 自动管理） |

---

## 2. 初始化（首次）

```bash
# 1. 安装 Capacitor CLI
npm install -g @capacitor/cli

# 2. 进入 mobile 目录
cd D:\Flatstore\mobile

# 3. 安装依赖
npm install

# 4. 构建前端
npm run build

# 5. 初始化 Android 项目
npx cap add android

# 6. 安装 Capacitor 插件（如果缺失）
npm install @capacitor/camera
npm install @capacitor/splash-screen
npm install @capacitor/status-bar

# 7. 同步
npx cap sync android
```

---

## 3. 构建 APK

用 Android Studio 打开项目后：

1. 等待右下角 Gradle sync 完成（首次可能需要5-10分钟下载依赖）
2. 菜单栏：**Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. 等待2-3分钟
4. 右下角弹出 "APK(s) generated successfully" → 点 **locate**
5. 文件管理器打开，`app-debug.apk` 就是安装包

---

## 4. 安装到手机

**方式一：USB 传文件**
1. 用数据线连接手机和电脑
2. 复制 `app-debug.apk` 到手机
3. 手机上打开文件管理器 → 点 APK 安装
4. 如果提示「禁止安装未知来源应用」→ 设置中允许

**方式二：微信/QQ 发送**
1. 把 APK 文件发到手机微信「文件传输助手」
2. 手机上点开 → 安装

---

## 5. 签名发布版（可选）

Debug 版可以直接安装。如果要发布到应用商店或分发给更多人：

```bash
# 生成签名密钥（只需一次）
keytool -genkey -v \
  -keystore flatstore-release.keystore \
  -alias flatstore \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

然后在 Android Studio → Build → Generate Signed Bundle/APK → 选 APK → 填密钥信息

---

## 更新 APK

每次代码更新后需要重新构建：

```bash
cd D:\Flatstore\mobile
git pull
npm run build
npx cap sync android
# 再用 Android Studio Build APK
```

---

## 常见问题

### Gradle sync 失败
- 检查网络（Gradle 需要从外网下载，可能需要代理）
- File → Settings → Build → Build Tools → Gradle → 使用 "Gradle wrapper"

### 手机安装后闪退
```bash
# 查看日志
adb logcat | grep -i flatstore
```

### 手机连不上服务器
- 确认手机和服务器在同一网络（或服务器有公网IP）
- 确认 `mobile/src/api/request.ts` 中 IP 地址正确
- 确认服务器防火墙已开放 80 端口

---

*构建格式：Capacitor 7 + Android 13 (API 33+)*