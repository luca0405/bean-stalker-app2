/**
 * Send individual Bean Stalker orders to Square Kitchen Display immediately
 */

import { storage } from './storage';
import { getSquareLocationId, getSquareAccessToken, getSquareEnvironment } from './square-config';

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

    // Create line items for Square order with zero price (credit-based orders)
    const lineItems = orderItems.map((item: any, index: number) => ({
      uid: `bs-item-${orderId}-${index}`,
      name: `${item.name}${item.size ? ` (${item.size})` : ''}${item.flavor ? ` - ${item.flavor}` : ''} [PAID BY CREDITS: $${(item.price || 0).toFixed(2)}]`,
      quantity: item.quantity?.toString() || '1',
      item_type: 'ITEM',
      base_price_money: {
        amount: 0, // Zero amount since paid by credits
        currency: 'AUD'
      }
    }));

    // Create Square order data using environment-aware configuration
    const locationId = getSquareLocationId();
    const accessToken = getSquareAccessToken();
    const environment = getSquareEnvironment();
    const baseUrl = environment === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    console.log(`🔍 Debug: Using ${environment} location_id: ${locationId}, API: ${baseUrl}`);
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
          schedule_type: 'SCHEDULED',
          pickup_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
          note: `Bean Stalker mobile order #${orderId} - Credit payment received`
        }
      }]
    };

    // Create order in Square
    const orderResponse = await fetch(`${baseUrl}/v2/orders`, {
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

    // Create zero-amount payment to make order fully paid and visible in POS dashboard
    try {
      const paymentData = {
        source_id: 'CASH',
        idempotency_key: `bs-zero-pay-${orderId}-${Date.now()}`.substring(0, 45),
        amount_money: {
          amount: 0,
          currency: 'AUD'
        },
        order_id: squareOrderId,
        location_id: locationId,
        note: `Bean Stalker credit payment - zero amount (already paid by credits)`,
        cash_details: {
          buyer_supplied_money: {
            amount: 0,
            currency: 'AUD'
          }
        }
      };

      const paymentResponse = await fetch(`${baseUrl}/v2/payments`, {
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
        console.log(`✅ Created Square order ${squareOrderId} with zero-amount payment ${paymentResult.payment?.id} - now visible in POS dashboard`);
      } else {
        const paymentError = await paymentResponse.text();
        console.log(`⚠️ Created Square order ${squareOrderId} but zero-amount payment failed: ${paymentError}`);
      }
    } catch (paymentError) {
      console.log(`⚠️ Created Square order ${squareOrderId} but payment processing failed - Bean Stalker order #${orderId}`);
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