// Complete Order #79 with correct version number
import fetch from 'node-fetch';

async function completeOrderWithCorrectVersion() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN_PROD;
  const orderId = 'ZqXvKGUui4h4QkOjr8hWnktczXOZY';
  
  console.log('🔄 Getting current order version...');
  
  try {
    // First, get the current order to find the correct version
    const getResponse = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-06-04'
      }
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.log('❌ Failed to get order:', errorText);
      return;
    }

    const orderData = await getResponse.json();
    const currentVersion = orderData.order?.version;
    console.log('✅ Current order version:', currentVersion);

    // Now complete the order with the correct version
    console.log('🔄 Completing order with version', currentVersion);
    
    const completeResponse = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-04'
      },
      body: JSON.stringify({
        order: {
          version: currentVersion,
          state: 'COMPLETED'
        }
      })
    });

    if (completeResponse.ok) {
      const result = await completeResponse.json();
      console.log('✅ Order #79 completed successfully!');
      console.log('New state:', result.order?.state);
      console.log('Order is now visible in Square Orders dashboard under completed orders');
    } else {
      const errorText = await completeResponse.text();
      console.log('❌ Failed to complete order:', errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

completeOrderWithCorrectVersion();