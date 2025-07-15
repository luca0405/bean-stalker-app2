/**
 * Send individual Bean Stalker orders to Square Kitchen Display immediately
 */

import { storage } from './storage';
import { getSquareLocationId, getSquareAccessToken } from './square-config';

/**
 * Send a specific order to Square immediately after it's created
 */
export async function sendSingleOrderToSquare(orderId: number): Promise<{
  success: boolean;
  squareOrderId?: string;
  error?: string;
}> {
  try {
    console.log(`🔄 Sending individual order #${orderId} to Square...`);
    
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return {
        success: false,
        error: `Order #${orderId} not found`
      };
    }

    const user = await storage.getUser(order.userId);
    if (!user) {
      return {
        success: false,
        error: `User for order #${orderId} not found`
      };
    }

    const customerName = user.username || 'Bean Stalker Customer';

    // Parse order items
    let orderItems: any[] = [];
    try {
      orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
    } catch (parseError) {
      console.error(`Failed to parse items for order #${orderId}:`, parseError);
      orderItems = [];
    }

    // Create line items for Square order
    const lineItems = orderItems.map((item: any, index: number) => ({
      uid: `bs-item-${orderId}-${index}`,
      name: `${item.name}${item.size ? ` (${item.size})` : ''}${item.flavor ? ` - ${item.flavor}` : ''}`,
      quantity: item.quantity?.toString() || '1',
      item_type: 'ITEM',
      base_price_money: {
        amount: Math.round((item.price || 0) * 100),
        currency: 'AUD'
      }
    }));

    // Create Square order data using forced configuration
    const locationId = getSquareLocationId();
    const accessToken = getSquareAccessToken();
    console.log(`🔍 Debug: Using FORCED location_id: ${locationId}`);
    const squareOrderData = {
      reference_id: `bs-order-${orderId}`,
      location_id: locationId,
      line_items: lineItems,
      fulfillments: [{
        uid: `bs-fulfillment-${orderId}`,
        type: 'PICKUP',
        state: 'PROPOSED',
        pickup_details: {
          recipient: {
            display_name: customerName
          },
          schedule_type: 'ASAP',
          note: `Bean Stalker order #${orderId}`
        }
      }]
    };

    // Create order in Square
    const orderResponse = await fetch('https://connect.squareupsandbox.com/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13'
      },
      body: JSON.stringify({
        order: squareOrderData
      })
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      return {
        success: false,
        error: `Square API error: ${orderResponse.status} - ${errorData}`
      };
    }

    const orderResult = await orderResponse.json();
    const squareOrderId = orderResult.order?.id;

    // Create payment for the order (representing credit payment)
    console.log(`🔍 Debug: Creating payment for FORCED location_id: ${locationId}`);
    const paymentData = {
      source_id: 'cnon:card-nonce-ok', // Sandbox test nonce
      idempotency_key: `bs-pay-${orderId}-${Date.now()}`.substring(0, 45),
      amount_money: {
        amount: Math.round((order.total || 0) * 100),
        currency: 'AUD'
      },
      order_id: squareOrderId,
      location_id: locationId,
      note: `Bean Stalker app credits payment for order #${orderId} by ${customerName}`
    };

    const paymentResponse = await fetch('https://connect.squareupsandbox.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13'
      },
      body: JSON.stringify(paymentData)
    });

    if (paymentResponse.ok) {
      const paymentResult = await paymentResponse.json();
      console.log(`✅ Created Square order ${squareOrderId} with payment ${paymentResult.payment?.id} for Bean Stalker order #${orderId}`);
    } else {
      const paymentError = await paymentResponse.text();
      console.log(`⚠️ Created Square order ${squareOrderId} for Bean Stalker order #${orderId} but payment failed: ${paymentError}`);
    }

    return {
      success: true,
      squareOrderId
    };

  } catch (error) {
    console.error(`Failed to send order #${orderId} to Square:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}