// Complete Order #79 by updating fulfillment and order state
import fetch from 'node-fetch';

async function completeOrderAndFulfillment() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN_PROD;
  const orderId = 'ZqXvKGUui4h4QkOjr8hWnktczXOZY';
  
  console.log('🔄 Getting current order details...');
  
  try {
    // Get the current order to find fulfillment details
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
    const fulfillments = orderData.order?.fulfillments || [];
    
    console.log('✅ Current order version:', currentVersion);
    console.log('📦 Fulfillments found:', fulfillments.length);

    // Update fulfillments to COMPLETED state
    const updatedFulfillments = fulfillments.map(fulfillment => ({
      ...fulfillment,
      state: 'COMPLETED'
    }));

    // Complete the order with updated fulfillments
    console.log('🔄 Completing order and fulfillments...');
    
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
          state: 'COMPLETED',
          fulfillments: updatedFulfillments
        }
      })
    });

    if (completeResponse.ok) {
      const result = await completeResponse.json();
      console.log('✅ Order #79 completed successfully!');
      console.log('New state:', result.order?.state);
      console.log('🎉 Order is now visible in Square Orders dashboard under completed orders');
      console.log('');
      console.log('📍 Check your Square dashboard:');
      console.log('• Location: Bean Stalker');
      console.log('• Section: Orders → Completed');
      console.log('• Reference: bs-order-79');
    } else {
      const errorText = await completeResponse.text();
      console.log('❌ Failed to complete order:', errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

completeOrderAndFulfillment();