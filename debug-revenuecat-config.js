// Debug RevenueCat configuration to see what products are actually available
import fetch from 'node-fetch';

async function debugRevenueCatConfig() {
  console.log('🔍 Checking what products RevenueCat actually has vs what app expects...');
  
  console.log('📊 From dashboard screenshot:');
  console.log('- Customer ID 54 has REAL transactions');
  console.log('- Products seen: $25 Credit, $50 Credit, Beanstalker Membership');
  console.log('- All purchases show real revenue amounts');
  console.log('- This means RevenueCat IS processing real transactions');
  
  console.log('');
  console.log('🔍 App expects:');
  console.log('- com.beanstalker.membership69 (for $69 membership)');
  console.log('- com.beanstalker.credits25, credits50, credits100');
  
  console.log('');
  console.log('❓ Issue: App may be looking for wrong product IDs');
  console.log('❓ Or: App Store Connect products not matching RevenueCat configuration');
  
  // Test what happens if we trigger webhook for the products that actually exist
  console.log('');
  console.log('🧪 Testing webhook with products that actually exist in dashboard...');
  
  // Test with the membership product that actually exists
  const membershipTest = await fetch('http://localhost:5000/api/revenuecat/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer bean-stalker-webhook-2025'
    },
    body: JSON.stringify({
      api_version: "1.0",
      event: {
        type: 'INITIAL_PURCHASE',
        product_id: 'beanstalker_membership', // Try the product name from dashboard
        app_user_id: '54',
        original_transaction_id: 'dashboard_txn_' + Date.now(),
        purchased_at_ms: Date.now()
      }
    })
  });
  
  console.log('💳 Membership webhook response:', await membershipTest.text());
}

debugRevenueCatConfig();