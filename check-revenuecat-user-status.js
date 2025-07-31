// Check RevenueCat dashboard status manually
import fetch from 'node-fetch';

async function checkRevenueCatUserStatus() {
  console.log('🔍 Checking RevenueCat webhook endpoint...');
  
  // Test webhook to see if it works
  const webhookTest = await fetch('http://localhost:5000/api/revenuecat/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer bean-stalker-webhook-2025'
    },
    body: JSON.stringify({
      api_version: "1.0",
      event: {
        type: 'TEST',
        app_user_id: '53'
      }
    })
  });
  
  console.log('📨 Webhook test response:', await webhookTest.text());
  
  // Check what happens with a real purchase simulation
  const realPurchaseTest = await fetch('http://localhost:5000/api/revenuecat/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer bean-stalker-webhook-2025'
    },
    body: JSON.stringify({
      api_version: "1.0",
      event: {
        type: 'INITIAL_PURCHASE',
        product_id: 'com.beanstalker.membership69',
        app_user_id: '53',
        original_transaction_id: 'test_txn_' + Date.now(),
        purchased_at_ms: Date.now()
      }
    })
  });
  
  console.log('💳 Real purchase test response:', await realPurchaseTest.text());
}

checkRevenueCatUserStatus();