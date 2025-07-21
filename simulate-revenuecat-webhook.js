// Simulate a proper RevenueCat webhook for testing
import fetch from 'node-fetch';

async function simulateRevenueCatWebhook() {
  console.log('🧪 Simulating RevenueCat webhook for credit25 purchase...');
  
  const webhookPayload = {
    event: {
      type: 'INITIAL_PURCHASE',
      product_id: 'com.beanstalker.credit25',
      app_user_id: '32', // Your user ID
      transaction_id: 'test_transaction_' + Date.now(),
      purchased_at: new Date().toISOString()
    }
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/revenuecat/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook simulation successful:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook simulation failed:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simulateRevenueCatWebhook();