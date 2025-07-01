/**
 * Real Square Orders API Integration
 * Actually sends Bean Stalker orders to Square sandbox account
 */

import { storage } from './storage';

/**
 * Create actual Square orders using the Square Orders API
 */
export async function sendOrdersToSquare(): Promise<{
  success: boolean;
  created: number;
  errors: string[];
}> {
  try {
    console.log('🔄 Starting real Square Orders API sync...');
    
    // Get recent orders from Bean Stalker
    const orders = await storage.getRecentOrders(10); // Start with 10 most recent
    console.log(`📋 Found ${orders.length} orders to send to Square`);
    
    let created = 0;
    const errors: string[] = [];
    
    for (const order of orders) {
      try {
        // Get user details for customer name
        const user = await storage.getUser(order.userId);
        const customerName = user?.username || `Customer #${order.userId}`;
        
        // Prepare Square order data
        const squareOrderData = {
          reference_id: `bs-order-${order.id}`,
          source: {
            name: "Bean Stalker Coffee Shop"
          },
          location_id: process.env.SQUARE_LOCATION_ID!,
          line_items: (order.items as any[])?.map((item, index) => ({
            uid: `item-${order.id}-${index}`,
            name: item.name || 'Coffee Item',
            quantity: item.quantity?.toString() || '1',
            item_type: 'ITEM',
            base_price_money: {
              amount: Math.round((item.price || 0) * 100), // Convert to cents
              currency: 'AUD'
            }
          })) || [],
          fulfillments: [{
            uid: `fulfillment-${order.id}`,
            type: 'PICKUP',
            state: 'PROPOSED',
            pickup_details: {
              recipient: {
                display_name: customerName
              },
              schedule_type: 'ASAP',
              note: `Bean Stalker order #${order.id}`
            }
          }]
        };
        
        // Create order in Square
        const orderResponse = await fetch('https://connect.squareupsandbox.com/v2/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': '2023-12-13'
          },
          body: JSON.stringify({
            order: squareOrderData
          })
        });
        
        if (orderResponse.ok) {
          const orderResult = await orderResponse.json();
          const squareOrderId = orderResult.order?.id;
          
          // Mark order as completed using credit payment - Square will show this as external payment
          const paymentData = {
            source_id: 'cnon:card-nonce-ok', // Sandbox test nonce (will be marked as credit payment in note)
            idempotency_key: `bs-pay-${order.id}-${Date.now()}`.substring(0, 45),
            amount_money: {
              amount: Math.round((order.total || 0) * 100),
              currency: 'AUD'
            },
            order_id: squareOrderId,
            location_id: process.env.SQUARE_LOCATION_ID,
            note: `PAID WITH BEAN STALKER APP CREDITS - Customer: ${customerName || 'Customer'} - Original payment method: Store Credit Balance`
          };

          const paymentResponse = await fetch('https://connect.squareupsandbox.com/v2/payments', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'Square-Version': '2023-12-13'
            },
            body: JSON.stringify(paymentData)
          });

          if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            console.log(`✅ Created Square order ${squareOrderId} with payment ${paymentResult.payment?.id} for Bean Stalker order #${order.id}`);
            created++;
          } else {
            const paymentError = await paymentResponse.text();
            console.log(`⚠️ Created Square order ${squareOrderId} for Bean Stalker order #${order.id} but payment failed: ${paymentError}`);
            created++;
          }
        } else {
          const errorData = await orderResponse.text();
          const errorMsg = `Square API error for order #${order.id}: ${orderResponse.status} - ${errorData}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
        
      } catch (orderError) {
        const errorMsg = `Failed to process order #${order.id}: ${orderError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`🎉 Successfully created ${created}/${orders.length} orders in Square sandbox`);
    
    return {
      success: true,
      created,
      errors
    };
    
  } catch (error) {
    console.error('Square Orders sync failed:', error);
    return {
      success: false,
      created: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Get orders from Square sandbox to verify they were created
 */
export async function getSquareOrders(): Promise<any[]> {
  try {
    const response = await fetch(`https://connect.squareupsandbox.com/v2/orders/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13'
      },
      body: JSON.stringify({
        location_ids: [process.env.SQUARE_LOCATION_ID],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
              }
            }
          },
          sort: {
            sort_field: 'CREATED_AT',
            sort_order: 'DESC'
          }
        },
        limit: 100
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.orders || [];
    } else {
      console.error('Failed to fetch Square orders:', await response.text());
      return [];
    }
  } catch (error) {
    console.error('Error fetching Square orders:', error);
    return [];
  }
}