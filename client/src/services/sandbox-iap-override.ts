// Sandbox IAP Override for iOS Testing
// Forces sandbox mode regardless of build configuration

export const SANDBOX_IAP_CONFIG = {
  // Force sandbox mode for iOS testing
  forceSandboxMode: true,
  
  // Override environment detection
  isSandboxBuild: () => {
    // Check for forced sandbox mode or development environment
    return import.meta.env.VITE_FORCE_SANDBOX === 'true' || import.meta.env.DEV || !import.meta.env.PROD;
  },
  
  // Get proper RevenueCat configuration for sandbox
  getRevenueCatConfig: () => {
    const apiKey = 'appl_owLmakOcTeYJOJoxJgScSQZtUQA';
    
    console.log('🏗️ Sandbox Override: Forcing sandbox configuration');
    console.log('🏗️ API Key confirmed:', apiKey.substring(0, 12) + '...');
    console.log('🏗️ Sandbox mode: ENABLED (forced)');
    console.log('🏗️ User ID: 32 (hardcoded for testing)');
    
    return {
      apiKey,
      appUserID: '32',
      observerMode: false,
      userDefaultsSuiteName: undefined,
      usesStoreKit2IfAvailable: true,
      shouldShowInAppMessagesAutomatically: true,
      // entitlementVerificationMode: 'informational',
    };
  },
  
  // Debug environment info
  debugEnvironment: () => {
    const env = import.meta.env;
    return {
      mode: env.MODE,
      dev: env.DEV,
      prod: env.PROD,
      sandboxForced: true,
      reason: 'iOS TestFlight sandbox testing',
      apiKeySource: 'hardcoded fallback',
    };
  }
};