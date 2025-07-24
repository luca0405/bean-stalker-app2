// Environment debugging utility for mobile apps
export function debugEnvironment() {
  const env = import.meta.env;
  
  console.log('🔍 Environment Debug Info:');
  console.log('Mode:', env.MODE);
  console.log('Dev:', env.DEV);
  console.log('Prod:', env.PROD);
  
  // Check RevenueCat API key
  const rcKey = env.VITE_REVENUECAT_API_KEY;
  console.log('RevenueCat API Key Present:', !!rcKey);
  console.log('RevenueCat API Key Length:', rcKey?.length || 0);
  console.log('RevenueCat API Key Prefix:', rcKey?.substring(0, 12) + '...' || 'missing');
  
  // List all VITE_ environment variables
  const viteVars = Object.keys(env).filter(key => key.startsWith('VITE_'));
  console.log('All VITE_ variables:', viteVars);
  
  // Check for common issues
  if (!rcKey) {
    console.error('❌ VITE_REVENUECAT_API_KEY is missing!');
    console.error('This usually means:');
    console.error('1. Environment variable not set in build environment');
    console.error('2. Variable name mismatch (check exact spelling)');
    console.error('3. Build process not exporting environment variables');
  } else if (rcKey.length < 30) {
    console.warn('⚠️ RevenueCat API key seems too short');
  } else {
    console.log('✅ RevenueCat API key appears valid');
  }
  
  return {
    hasRevenueCatKey: !!rcKey,
    keyLength: rcKey?.length || 0,
    allViteVars: viteVars,
    mode: env.MODE,
  };
}