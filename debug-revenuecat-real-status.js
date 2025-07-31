// Check actual RevenueCat status for user 53
import fetch from 'node-fetch';

async function checkRevenueCatStatus() {
  console.log('🔍 Checking RevenueCat Dashboard for user 53...');
  
  try {
    // Check RevenueCat API directly
    const response = await fetch('https://api.revenuecat.com/v1/subscribers/53', {
      headers: {
        'Authorization': 'Bearer sk_test_vQBMwCTuxfijAYwSxkULOGOpfGPjINmN',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ RevenueCat API Response:');
      console.log('- Subscriber exists:', !!data.subscriber);
      console.log('- Entitlements:', Object.keys(data.subscriber?.entitlements || {}));
      console.log('- Non-subscription purchases:', data.subscriber?.non_subscriptions || []);
      console.log('- Original app user ID:', data.subscriber?.original_app_user_id);
    } else {
      console.log('❌ RevenueCat API Error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error checking RevenueCat:', error.message);
  }
}

checkRevenueCatStatus();