# APK 构建指南（Windows 办公电脑）

> 在自己的 Windows 电脑上构建 Android APK，用于车间真机安装使用。

---

## 前提

- Windows 10/11
- 磁盘空闲 ≥ 5GB
- 已安装 Node.js ≥ 18

---

## 1. 安装 Android Studio

1. 下载：https://developer.android.com/studio
2. 安装时勾选 **Android SDK** 和 **Android Virtual Device**（默认已勾）
3. 安装完成后打开 Android Studio
4. 首次启动 → 选择 "Standard" 安装类型
5. 等待 SDK 下载完成（可能需要5-15分钟）

---

## 2. 配置 SDK

打开 Android Studio → 右上角 SDK Manager（或 File → Settings → Appearance → System Settings → Android SDK）

确认安装以下组件：

| 组件 | 说明 |
|------|------|
| Android SDK Platform 34 | API 34 平台 |
| Android SDK Build-Tools | 最新版 |
| Android SDK Command-line Tools | 命令行工具 |

---

## 3. 修改 API 地址

编辑 `mobile/src/api/request.ts`：

```typescript
const PROD_API_URL = 'http://62.234.92.126/api'

const BASE_URL = Capacitor.isNativePlatform()
  ? PROD_API_URL        // APK 直连服务器
  : PROD_API_URL         // 浏览器调试也用服务器
```

> ⚠️ 如果服务器 IP 变了，只改 `PROD_API_URL` 即可。

---

## 4. 构建 APK

打开终端（PowerShell 或 CMD），进入项目目录：

```bash
cd D:\Flatstore\mobile

# 安装依赖（首次）
npm install

# 构建前端
npm run build

# 同步到 Android 项目
npx cap sync android

# 用 Android Studio 打开
npx cap open android
```

---

## 5. 生成 APK 文件

Android Studio 打开项目后：

1. 等待右下角 Gradle sync 完成（首次可能需要5-10分钟下载依赖）
2. 菜单栏：**Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. 等待2-3分钟
4. 右下角弹出 "APK(s) generated successfully" → 点 **locate**
5. 文件管理器打开，`app-debug.apk` 就是安装包

---

## 6. 安装到手机

**方式一：USB 传文件**
1. 用数据线连接手机和电脑
2. 复制 `app-debug.apk` 到手机
3. 手机上打开文件管理器 → 点 APK 安装
4. 如果提示「禁止安装未知来源应用」→ 设置中允许

**方式二：微信/QQ 发送**
1. 把 APK 文件发到手机微信「文件传输助手」
2. 手机上点开 → 安装

---

## 7. 签名发布版（可选）

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
