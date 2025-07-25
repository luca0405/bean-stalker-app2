// Environment configuration for production-ready app with sandbox IAP
export const APP_CONFIG = {
  // Production app settings
  isProduction: import.meta.env.PROD,
  apiUrl: import.meta.env.PROD ? 'https://member.beanstalker.com.au' : 'http://localhost:5000',
  
  // IAP Configuration - Force sandbox for testing regardless of environment
  iap: {
    // Always use sandbox for IAP testing even in production
    forceSandboxMode: true,
    apiKey: import.meta.env.VITE_REVENUECAT_API_KEY || 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
    appUserIdMapping: true, // Maps to Bean Stalker user ID
  },
  
  // App metadata
  app: {
    name: 'Bean Stalker',
    version: '1.0.0',
    bundleId: 'com.beanstalker.member',
  },
  
  // Feature flags for production
  features: {
    enableDebugMode: false, // Disable debug UI in production
    enableConsoleLogging: import.meta.env.DEV, // Only log in development
    enableIAPDiagnostics: true, // Keep IAP diagnostics for sandbox testing
    enableSquareIntegration: true,
    enablePushNotifications: true,
  },
  
  // Square configuration (production)
  square: {
    environment: 'production', // Use production Square for real orders
    locationId: 'LW166BYW0A6E0', // Real Bean Stalker location
  }
};