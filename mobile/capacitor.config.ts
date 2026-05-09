import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flatstore.mobile',
  appName: '平面库配货',
  webDir: 'dist',
  server: {
    // 开发模式：取消注释指向 Vite 地址即可
    // url: 'http://192.168.10.152:5180',
    // cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FAFAFA',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FAFAFA',
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
  },
};

export default config;
