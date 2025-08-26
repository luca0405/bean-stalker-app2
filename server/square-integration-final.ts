/**
 * FINAL Square Integration - Complete bidirectional sync system
 * Handles all Square operations with proper error handling and logging
 */

import { storage } from './storage';
import { squareConfig, getSquareEnvironment } from './square-config';

// Use dynamic Square configuration that respects production credentials
const SQUARE_CONFIG = {
  locationId: squareConfig.locationId,
  applicationId: squareConfig.applicationId,
  accessToken: squareConfig.accessToken,
  webhookSignatureKey: squareConfig.webhookSignatureKey
};

// Dynamic API base URL based on environment
const SQUARE_API_BASE = getSquareEnvironment() === 'production' 
  ? 'https://connect.squareup.com/v2' 
  : 'https://connect.squareupsandbox.com/v2';

interface SquareOrderResult {
  success: boolean;
  squareOrderId?: string;
  error?: string;
}

/**
 * Create a Square order from Bean Stalker order data
 */
export async function createSquareOrder(orderId: number): Promise<SquareOrderResult> {
  try {
    console.log(`🔄 Creating Square order for Bean Stalker order #${orderId}`);
    
    // Get order and user data
    const order = await storage.getOrderById(orderId);
    if (!order) {
      return { success: false, error: `Order #${orderId} not found` };
    }

    const user = await storage.getUser(order.userId);
    if (!user) {
      return { success: false, error: `User for order #${orderId} not found` };
    }

    // Parse order items
    let orderItems: any[] = [];
    try {
      orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
    } catch {
      orderItems = [];
    }

    if (orderItems.length === 0) {
      return { success: false, error: `No items found in order #${orderId}` };
    }

    // Create Square line items with zero price (credit-based orders)
    const lineItems = orderItems.map((item: any, index: number) => ({
      uid: `bs-item-${orderId}-${index}`,
      name: `${item.name}${item.size ? ` (${item.size})` : ''}${item.flavor ? ` - ${item.flavor}` : ''} [PAID BY CREDITS: $${(item.price || 0).toFixed(2)}]`,
      quantity: String(item.quantity || 1),
      item_type: 'ITEM',
      base_price_money: {
        amount: 0, // Zero amount since paid by credits
        currency: 'AUD'
      }
    }));

    // Create Square order
    const squareOrderData = {
      reference_id: `bs-order-${orderId}`,
      location_id: SQUARE_CONFIG.locationId,
      line_items: lineItems,
      fulfillments: [{
        uid: `bs-fulfillment-${orderId}`,
        type: 'PICKUP',
        state: 'PROPOSED',
        pickup_details: {
          recipient: {
            display_name: user.username || 'Bean Stalker Customer'
          },
          schedule_type: 'ASAP',
          note: `Bean Stalker order #${orderId}`
        }
      }]
    };

    // Submit to Square Orders API
    const orderResponse = await fetch(`${SQUARE_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUARE_CONFIG.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13'
      },
      body: JSON.stringify({ order: squareOrderData })
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error(`Square Orders API error: ${orderResponse.status} - ${errorText}`);
      return { success: false, error: `Square API error: ${orderResponse.status}` };
    }

    const orderResult = await orderResponse.json();
    const squareOrderId = orderResult.order?.id;

    if (!squareOrderId) {
      return { success: false, error: 'No Square order ID returned' };
    }

    // For Bean Stalker: Zero-amount orders appear immediately in Square POS
    console.log(`✅ Square order created: ${squareOrderId} for Bean Stalker order #${orderId} (zero-amount, credit-based)`);
    return { success: true, squareOrderId };

  } catch (error) {
    console.error(`❌ Failed to create Square order for #${orderId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create payment for Square order (makes it visible in dashboard)
 */
async function createSquarePayment(squareOrderId: string, beanOrderId: number, amount: number, customerName: string) {
  try {
    // Use CASH payment for Bean Stalker credit-based orders (already paid by credits)  
    const paymentData = {
      source_id: 'CASH',
      idempotency_key: `bs-pay-${beanOrderId}-${Date.now()}`.substring(0, 45),
      amount_money: {
        amount: Math.round(amount * 100),
        currency: 'AUD'
      },
      order_id: squareOrderId,
      location_id: SQUARE_CONFIG.locationId,
      note: `Bean Stalker app credits - Order #${beanOrderId} by ${customerName}`,
      cash_details: {
        buyer_supplied_money: {
          amount: Math.round(amount * 100),
          currency: 'AUD'
        }
      }
    };

    const paymentResponse = await fetch(`${SQUARE_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUARE_CONFIG.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13'
      },
      body: JSON.stringify(paymentData)
    });

    if (paymentResponse.ok) {
      const result = await paymentResponse.json();
      console.log(`💳 Payment created: ${result.payment?.id} for Square order ${squareOrderId}`);
    } else {
      const errorText = await paymentResponse.text();
      console.log(`⚠️ Payment failed for Square order ${squareOrderId}: ${errorText}`);
    }
  } catch (error) {
    console.error('Error creating zero-amount payment:', error);
  }
}

// Payment creation removed for credit-based orders
// Zero-amount orders appear directly in Square POS without payment processing

/**
 * Handle Square webhook for bidirectional sync
 */
export async function handleSquareWebhook(webhookData: any): Promise<{ success: boolean; ordersUpdated: number }> {
  try {
    console.log(`🔔 Processing Square webhook: ${webhookData.event_type || webhookData.type}`);
    
    const eventType = webhookData.event_type || webhookData.type || 'unknown';
    
    // Process order and fulfillment events
    if (!eventType.includes('order') && !eventType.includes('fulfillment')) {
      return { success: true, ordersUpdated: 0 };
    }

    const squareOrder = webhookData.data?.object || webhookData.object;
    if (!squareOrder) {
      return { success: true, ordersUpdated: 0 };
    }

    // Handle fulfillment update events
    if (eventType.includes('fulfillment')) {
      console.log('🔄 Processing fulfillment update webhook');
      console.log('📨 Webhook data structure:', JSON.stringify(webhookData, null, 2));
      
      // Extract fulfillment data from the correct webhook structure
      const orderFulfillmentUpdated = squareOrder?.order_fulfillment_updated;
      const fulfillmentUpdates = orderFulfillmentUpdated?.fulfillment_update;
      
      console.log('📋 Fulfillment updates:', fulfillmentUpdates);
      
      if (fulfillmentUpdates && Array.isArray(fulfillmentUpdates)) {
        // Process each fulfillment update
        let updatedOrders = 0;
        
        for (const update of fulfillmentUpdates) {
          const fulfillmentState = update.new_state;
          const fulfillmentId = update.fulfillment_uid;
          
          console.log('📋 Fulfillment state:', fulfillmentState);
          console.log('🔗 Fulfillment ID:', fulfillmentId);
          
          if (fulfillmentId && fulfillmentId.includes('bs-fulfillment-')) {
            // Map fulfillment state to Bean Stalker status
            let newStatus = 'processing';
            if (fulfillmentState === 'PREPARED' || fulfillmentState === 'READY') {
              newStatus = 'ready';
            } else if (fulfillmentState === 'COMPLETED') {
              newStatus = 'completed';
            } else if (fulfillmentState === 'CANCELED') {
              newStatus = 'cancelled';
            }
            
            const match = fulfillmentId.match(/bs-fulfillment-(\d+)/);
            if (match) {
              const beanOrderId = parseInt(match[1], 10);
              console.log('🔗 Extracted Bean Stalker order ID from fulfillment:', beanOrderId);
              
              // Get and update the order
              const beanOrder = await storage.getOrderById(beanOrderId);
              if (beanOrder) {
                if (beanOrder.status !== newStatus) {
                  await storage.updateOrderStatus(beanOrderId, newStatus);
                  
                  // Send notification to customer
                  const { sendOrderStatusNotification } = await import('./push-notifications');
                  await sendOrderStatusNotification(beanOrder.userId, beanOrderId, newStatus);
                  
                  console.log(`📱 Order #${beanOrderId} status updated via fulfillment: ${beanOrder.status} → ${newStatus}`);
                  updatedOrders++;
                } else {
                  console.log(`📋 Order #${beanOrderId} status unchanged: ${beanOrder.status}`);
                }
              } else {
                console.log(`❌ Bean Stalker order #${beanOrderId} not found`);
              }
            }
          }
        }
        
        return { success: true, ordersUpdated: updatedOrders };
      }
    }

    // Extract Bean Stalker order ID
    const beanOrderId = extractBeanStalkerOrderId(squareOrder);
    console.log('🔍 Order ID extraction result:', beanOrderId);
    if (!beanOrderId) {
      console.log('❌ No Bean Stalker order ID found in Square webhook data');
      console.log('🔍 Square order structure:', JSON.stringify({
        reference_id: squareOrder.reference_id,
        fulfillments: squareOrder.fulfillments?.map((f: any) => ({
          pickup_details: f.pickup_details,
          pickupDetails: f.pickupDetails
        })),
        line_items: squareOrder.line_items?.map((li: any) => ({ note: li.note }))
      }, null, 2));
      return { success: true, ordersUpdated: 0 };
    }

    // Get current Bean Stalker order
    const beanOrder = await storage.getOrderById(beanOrderId);
    if (!beanOrder) {
      console.log(`Bean Stalker order #${beanOrderId} not found`);
      return { success: true, ordersUpdated: 0 };
    }

    // Map Square state to Bean Stalker status
    const squareState = squareOrder.state || 'OPEN';
    const newStatus = mapSquareStateToBeanStalker(squareState);
    
    // Update order status if changed
    if (beanOrder.status !== newStatus) {
      await storage.updateOrderStatus(beanOrderId, newStatus);
      
      // Send notification to customer
      const { sendOrderStatusNotification } = await import('./push-notifications');
      await sendOrderStatusNotification(beanOrder.userId, beanOrderId, newStatus);
      
      console.log(`📱 Order #${beanOrderId} status updated: ${beanOrder.status} → ${newStatus}`);
      return { success: true, ordersUpdated: 1 };
    }

    return { success: true, ordersUpdated: 0 };
  } catch (error) {
    console.error('Square webhook processing failed:', error);
    return { success: false, ordersUpdated: 0 };
  }
}

/**
 * Extract Bean Stalker order ID from Square order data
 */
function extractBeanStalkerOrderId(squareOrder: any): number | null {
  try {
    // Check pickup note
    const pickupNote = squareOrder.fulfillments?.[0]?.pickup_details?.note || 
                       squareOrder.fulfillments?.[0]?.pickupDetails?.note;
    if (pickupNote) {
      const match = pickupNote.match(/Bean Stalker order #(\d+)/i);
      if (match) return parseInt(match[1], 10);
    }

    // Check reference ID
    const refId = squareOrder.reference_id;
    if (refId) {
      const match = refId.match(/bs-order-(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    return null;
  } catch (error) {
    console.error('Error extracting Bean Stalker order ID:', error);
    return null;
  }
}

/**
 * Map Square order state to Bean Stalker status
 */
function mapSquareStateToBeanStalker(squareState: string): string {
  const stateMap: { [key: string]: string } = {
    'OPEN': 'processing',
    'IN_PROGRESS': 'preparing',
    'READY': 'ready',
    'COMPLETED': 'completed',
    'CANCELED': 'cancelled'
  };
  
  return stateMap[squareState.toUpperCase()] || 'processing';
}

/**
 * Get Square configuration
 */
export function getSquareConfig() {
  return SQUARE_CONFIG;
}

/**
 * Sync all pending Bean Stalker orders to Square
 */
export async function syncAllOrdersToSquare(): Promise<{ success: boolean; synced: number; errors: string[] }> {
  try {
    const orders = await storage.getAllOrders();
    const errors: string[] = [];
    let synced = 0;

    for (const order of orders) {
      if (order.status !== 'cancelled') {
        const result = await createSquareOrder(order.id);
        if (result.success) {
          synced++;
        } else {
          errors.push(`Order #${order.id}: ${result.error}`);
        }
      }
    }

    console.log(`📊 Bulk sync completed: ${synced}/${orders.length} orders synced`);
    return { success: true, synced, errors };
  } catch (error) {
    console.error('Bulk sync failed:', error);
    return { success: false, synced: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
}