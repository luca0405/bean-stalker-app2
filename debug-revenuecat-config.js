// Debug RevenueCat configuration and webhook status
import fetch from 'node-fetch';

async function debugRevenueCatConfig() {
  console.log('🔍 Debugging RevenueCat Configuration...');
  
  // Check webhook endpoint availability
  console.log('\n📡 Testing webhook endpoint:');
  console.log('   URL: https://member.beanstalker.com.au/api/revenuecat/webhook');
  
  try {
    const response = await fetch('https://member.beanstalker.com.au/api/revenuecat/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'connectivity' })
    });
    
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      console.log('   ✅ Webhook endpoint is accessible from external sources');
    } else {
      console.log('   ❌ Webhook endpoint returned error');
    }
  } catch (error) {
    console.log(`   ❌ Webhook endpoint not accessible: ${error.message}`);
  }
  
  // Check RevenueCat debug endpoint
  console.log('\n🔧 RevenueCat Integration Status:');
  try {
    const debugResponse = await fetch('http://localhost:5000/api/debug/revenuecat');
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('   Configuration:', JSON.stringify(debugData, null, 2));
    }
  } catch (error) {
    console.log(`   ❌ Debug endpoint error: ${error.message}`);
  }
  
  // Check recent user transactions for IAP
  console.log('\n💰 Recent IAP Transactions:');
  try {
    const transResponse = await fetch('http://localhost:5000/api/debug/user-transactions/32');
    if (transResponse.ok) {
      const transactions = await transResponse.json();
      const recentIAP = transactions
        .filter(t => t.type.includes('iap') || t.type.includes('membership'))
        .slice(-5);
      
      if (recentIAP.length > 0) {
        console.log(`   Found ${recentIAP.length} recent IAP transactions:`);
        recentIAP.forEach((t, i) => {
          console.log(`   ${i + 1}. ${t.description} - $${t.amount} (${new Date(t.createdAt).toLocaleString()})`);
        });
      } else {
        console.log('   ❌ No IAP transactions found in database');
      }
    }
  } catch (error) {
    console.log(`   ❌ Transaction check error: ${error.message}`);
  }
  
  console.log('\n📋 Troubleshooting Steps:');
  console.log('1. Verify RevenueCat webhook URL is configured correctly');
  console.log('2. Check RevenueCat dashboard → App Settings → Webhooks');
  console.log('3. Ensure sandbox environment is properly configured');
  console.log('4. Verify App User ID mapping (should be "32" for iamninz)');
  console.log('5. Check RevenueCat logs for delivery failures');
}

debugRevenueCatConfig();