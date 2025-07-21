// Complete Square Order #79 with proper payment processing
import fetch from 'node-fetch';

async function completeOrder79() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN_PROD;
  const orderId = 'ZqXvKGUui4h4QkOjr8hWnktczXOZY';
  const locationId = 'LW166BYW0A6E0';
  
  console.log('🔄 Processing payment for Order #79 to enable completion...');
  
  try {
    // First, create a CASH payment for the order
    const paymentData = {
      source_id: 'CASH',
      idempotency_key: `bs-complete-79-${Date.now()}`.substring(0, 45),
      amount_money: {
        amount: 450, // $4.50 AUD in cents
        currency: 'AUD'
      },
      order_id: orderId,
      location_id: locationId,
      note: 'Bean Stalker app credits payment - completed for dashboard visibility',
      cash_details: {
        buyer_tendered_money: {
          amount: 450,
          currency: 'AUD'
        },
        buyer_supplied_money: {
          amount: 450,
          currency: 'AUD'
        }
      }
    };

    const paymentResponse = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-04'
      },
      body: JSON.stringify(paymentData)
    });

    if (!paymentResponse.ok) {
      const paymentError = await paymentResponse.text();
      console.log('❌ Payment failed:', paymentError);
      return;
    }

    const paymentResult = await paymentResponse.json();
    console.log('✅ Payment created:', paymentResult.payment?.id);

    // Now complete the order
    console.log('🔄 Completing order state...');
    
    const completeResponse = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-04'
      },
      body: JSON.stringify({
        order: {
          version: 1,
          state: 'COMPLETED'
        }
      })
    });

    if (completeResponse.ok) {
      const result = await completeResponse.json();
      console.log('✅ Order #79 completed successfully!');
      console.log('New state:', result.order?.state);
      console.log('Order should now be visible in Square Orders dashboard');
    } else {
      const errorText = await completeResponse.text();
      console.log('❌ Failed to complete order:', errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

completeOrder79();