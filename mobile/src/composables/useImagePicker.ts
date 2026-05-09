import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/**
 * 选择图片 - Capacitor 环境使用原生相机/相册，浏览器环境使用 input[type=file]
 */
export async function pickImage(): Promise<{ file: File; previewUrl: string } | null> {
  if (Capacitor.isNativePlatform()) {
    return pickImageNative()
  }
  return pickImageBrowser()
}

async function pickImageBrowser(): Promise<{ file: File; previewUrl: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const previewUrl = URL.createObjectURL(file)
      resolve({ file, previewUrl })
    }
    input.click()
  })
}

async function pickImageNative(): Promise<{ file: File; previewUrl: string } | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // 弹出选择：拍照 or 相册
    })

    // 将 base64 dataUrl 转换为 File
    const dataUrl = photo.dataUrl!
    const mimeMatch = dataUrl.match(/^data:(.+?);base64,/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const ext = mime.split('/')[1] || 'jpeg'

    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `photo.${ext}`, { type: mime })

    return { file, previewUrl: dataUrl }
  } catch (e) {
    // 用户取消
    return null
  }
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}
