// Check if RevenueCat actually processed the payment for user 54
import fetch from 'node-fetch';

async function checkRevenueCatRealStatus() {
  console.log('🔍 Checking if RevenueCat webhook was triggered for user 54...');
  
  // Simulate what should happen when a REAL purchase occurs
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
        app_user_id: '54',
        original_transaction_id: 'test_txn_user54_' + Date.now(),
        purchased_at_ms: Date.now()
      }
    })
  });
  
  console.log('💳 Webhook test response:', await realPurchaseTest.text());
  
  // Check current credits
  const userCheck = await fetch('http://localhost:5000/api/users/54');
  if (userCheck.ok) {
    const userData = await userCheck.json();
    console.log('💰 User 54 current credits:', userData.credits);
  } else {
    console.log('❌ Could not fetch user 54 data');
  }
}

checkRevenueCatRealStatus();