// Fallback IAP configuration for when environment variables fail
// This ensures RevenueCat always has access to the API key

// Hardcoded fallback for critical production deployment
// This is a temporary solution while investigating environment variable propagation
const FALLBACK_REVENUECAT_CONFIG = {
  // Use environment variable first, then fallback
  getApiKey: (): string | null => {
    // Primary: Environment variable
    const envKey = import.meta.env.VITE_REVENUECAT_API_KEY;
    if (envKey && envKey.length > 20) {
      console.log('✅ Using environment VITE_REVENUECAT_API_KEY');
      return envKey;
    }
    
    // Secondary: Check for critical production deployment scenario
    console.warn('⚠️ Environment VITE_REVENUECAT_API_KEY not available');
    console.warn('⚠️ API Key length:', envKey?.length || 0);
    console.warn('⚠️ This usually indicates a build configuration issue');
    
    // Emergency production API key for testing iOS functionality
    // This bypasses environment variable issues during GitHub Actions builds
    console.warn('🚨 Using hardcoded RevenueCat API key as fallback');
    console.warn('This is a temporary solution for testing iOS IAP functionality');
    return 'appl_owLmakOcTeYJOJoxJgScSQZtUQA'; // Your iOS RevenueCat API key from .env
  },
  
  // Log diagnostic information
  diagnose: () => {
    const env = import.meta.env;
    console.log('🔍 RevenueCat Config Diagnosis:');
    console.log('Environment mode:', env.MODE);
    console.log('VITE_REVENUECAT_API_KEY present:', !!env.VITE_REVENUECAT_API_KEY);
    console.log('VITE_REVENUECAT_API_KEY length:', env.VITE_REVENUECAT_API_KEY?.length || 0);
    console.log('All VITE_ vars:', Object.keys(env).filter(k => k.startsWith('VITE_')));
    
    return {
      envMode: env.MODE,
      hasApiKey: !!env.VITE_REVENUECAT_API_KEY,
      keyLength: env.VITE_REVENUECAT_API_KEY?.length || 0,
      allViteVars: Object.keys(env).filter(k => k.startsWith('VITE_')),
    };
  }
};

export { FALLBACK_REVENUECAT_CONFIG };