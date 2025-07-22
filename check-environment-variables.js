// Check if environment variables are properly configured
console.log('=== Environment Variable Check ===');
console.log('Node.js Environment Variables:');
console.log('VITE_REVENUECAT_API_KEY:', process.env.VITE_REVENUECAT_API_KEY ? 'SET (' + process.env.VITE_REVENUECAT_API_KEY.substring(0, 8) + '...)' : 'NOT SET');

// Check import.meta.env (Vite environment variables)
console.log('\nVite Environment Variables (import.meta.env):');
console.log('This would be available in the React app frontend');

// Expected for iOS app
const expectedKey = 'appl_owLmakOcTeYJOJoxJgScSQZtUQA';
const currentKey = process.env.VITE_REVENUECAT_API_KEY;

if (currentKey === expectedKey) {
  console.log('✅ API key matches expected value');
} else {
  console.log('❌ API key mismatch');
  console.log('Expected:', expectedKey);
  console.log('Current: ', currentKey || 'NOT SET');
}

console.log('\n=== GitHub Actions Requirement ===');
console.log('For iOS build, the GitHub secret VITE_REVENUECAT_API_KEY should be:');
console.log(expectedKey);