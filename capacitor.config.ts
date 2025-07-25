import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beanstalker.member',
  appName: 'Bean Stalker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow all external navigation for mobile networking
    allowNavigation: [
      'https://member.beanstalker.com.au',
      'https://*.beanstalker.com.au',
      'https://httpbin.org',
      'https://*'
    ],
    // Enhanced network configuration for mobile
    cleartext: true,
    hostname: 'localhost'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 0,
      backgroundColor: "#166534",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
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
    CapacitorHttp: {
      enabled: true,
    },
  },
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false
  },
};

export default config;
