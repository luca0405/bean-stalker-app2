import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beanstalker.member',
  appName: 'Bean Stalker',
  webDir: 'dist',
  // Use local files for iOS app instead of remote server
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#1B3C2A",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    NativeBiometric: {
      reason: "Use your biometric authentication to secure access to Bean Stalker",
      title: "Biometric Authentication",
      subtitle: "Secure login with your fingerprint or face",
      description: "Authenticate using your device's biometric authentication",
    },
  },
};

export default config;
