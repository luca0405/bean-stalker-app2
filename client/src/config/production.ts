// Production-ready configuration constants
export const PRODUCTION_CONFIG = {
  // App metadata for production
  app: {
    displayName: 'Bean Stalker',
    version: '1.3.0',
    environment: 'production',
    bundleId: 'com.beanstalker.member',
  },

  // Clean user interface
  ui: {
    showDebugComponents: false,
    showDiagnostics: false,
    enableAnimations: true,
    theme: 'professional',
  },

  // Performance optimizations
  performance: {
    enableLogging: false,
    enableMetrics: true,
    cacheTimeout: 300000, // 5 minutes
  },

  // Feature toggles for production
  features: {
    // Core features - always enabled
    orders: true,
    payments: true,
    notifications: true,
    profile: true,
    favorites: true,
    
    // Testing features - controlled by environment
    iapDiagnostics: true, // Keep enabled for sandbox testing
    squareIntegration: true,
    pushNotifications: true,
    
    // Debug features - disabled in production
    debugMode: false,
    consoleLogging: false,
    testingUtilities: false,
  },

  // API endpoints for production
  endpoints: {
    api: 'https://member.beanstalker.com.au',
    square: 'https://connect.squareup.com',
    revenuecat: 'https://api.revenuecat.com',
  },

  // Security settings
  security: {
    enableCSP: true,
    httpsOnly: true,
    secureHeaders: true,
  }
} as const;