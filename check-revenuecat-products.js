// Check what product IDs RevenueCat is actually configured with
import fetch from 'node-fetch';

async function checkRevenueCatProducts() {
  console.log('🔍 Based on your RevenueCat dashboard screenshot, here are the product details:');
  
  console.log('\n📊 ACTUAL PRODUCTS FROM DASHBOARD:');
  console.log('1. Beanstalker Membership - $43.79 AUD - ONE TIME');
  console.log('2. $25 Credit - $13.81 AUD - ONE TIME');  
  console.log('3. $50 Credit - $31.48 AUD - ONE TIME');
  console.log('4. Additional $25 Credit entries - $13.99-$14.05 AUD - ONE TIME');
  
  console.log('\n🔍 WHAT APP IS LOOKING FOR:');
  console.log('- com.beanstalker.membership69 (expected $69 membership)');
  console.log('- com.beanstalker.credits25, credits50, credits100');
  
  console.log('\n❓ DISCREPANCY ANALYSIS:');
  console.log('- Dashboard shows "Beanstalker Membership" at $43.79 (not $69)');
  console.log('- Dashboard shows "$25 Credit" at $13.81 (reasonable with Apple fees)');
  console.log('- All products are "ONE TIME" purchases (not subscriptions)');
  console.log('- Product names are display names, not technical IDs');
  
  console.log('\n🧪 Testing what actual product IDs RevenueCat uses...');
  
  // The product IDs in RevenueCat are likely the technical App Store Connect IDs
  // Let's test with common patterns
  const testProductIds = [
    'com.beanstalker.member.membership',
    'com.beanstalker.member.credits_25',
    'com.beanstalker.member.credits_50', 
    'com.beanstalker.member.credits_100',
    'membership',
    'credits_25',
    'credits_50',
    'credits_100',
    'beanstalker_membership',
    'beanstalker_credits_25'
  ];
  
  for (const productId of testProductIds) {
    console.log(`\n🧪 Testing product ID: ${productId}`);
    
    try {
      const response = await fetch('http://localhost:5000/api/revenuecat/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer bean-stalker-webhook-2025'
        },
        body: JSON.stringify({
          api_version: "1.0",
          event: {
            type: 'INITIAL_PURCHASE',
            product_id: productId,
            app_user_id: '54',
            original_transaction_id: `test_${productId}_${Date.now()}`,
            purchased_at_ms: Date.now()
          }
        })
      });
      
      const result = await response.text();
      if (result.includes('successfully')) {
        console.log(`✅ WORKS: ${productId} → ${result}`);
      } else {
        console.log(`❌ FAILS: ${productId} → ${result}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${productId} → ${error.message}`);
    }
  }
}

checkRevenueCatProducts();