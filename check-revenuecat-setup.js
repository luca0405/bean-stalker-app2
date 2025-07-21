// Check RevenueCat setup issues for real IAP
import fetch from 'node-fetch';

async function checkRevenueCatSetup() {
  console.log('🔍 Checking RevenueCat Setup Issues...');
  
  // Check user credits before/after
  try {
    const userResponse = await fetch('http://localhost:5000/api/debug/user/32');
    const userData = await userResponse.json();
    console.log(`\n👤 User Status: ${userData.username} (ID: ${userData.id})`);
    console.log(`💰 Current Credits: $${userData.credits}`);
  } catch (error) {
    console.log('❌ Cannot check user status');
  }
  
  console.log('\n🔧 Common RevenueCat IAP Issues:');
  console.log('1. App User ID not set correctly in RevenueCat');
  console.log('2. Webhook URL not configured in RevenueCat Dashboard');
  console.log('3. Sandbox environment mismatch');
  console.log('4. RevenueCat API key missing/incorrect');
  console.log('5. Product IDs not synced between App Store Connect and RevenueCat');
  
  console.log('\n📋 Immediate Fixes Needed:');
  console.log('✅ Fix 1: Set RevenueCat App User ID to "32" for iamninz');
  console.log('✅ Fix 2: Configure webhook URL in RevenueCat Dashboard');
  console.log('✅ Fix 3: Verify sandbox environment setup');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check RevenueCat Dashboard → Customer page for user "32"');
  console.log('2. Verify webhook URL: https://member.beanstalker.com.au/api/revenuecat/webhook');
  console.log('3. Test IAP again with proper user ID mapping');
  console.log('4. Check RevenueCat logs for webhook delivery failures');
}

checkRevenueCatSetup();