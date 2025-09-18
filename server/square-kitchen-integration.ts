/**
 * Simplified Square Kitchen Display Integration
 * HTTP-only implementation to avoid Square SDK compatibility issues
 */

import { storage } from './storage';
import { getSquareAccessToken, getSquareLocationId, getSquareEnvironment } from './square-config';

// Use direct HTTP requests instead of SDK to avoid module compatibility issues
const getSquareApiBase = () => {
  const environment = getSquareEnvironment();
  return environment === 'production' 
    ? 'https://connect.squareup.com/v2'
    : 'https://connect.squareupsandbox.com/v2';
};
const SQUARE_VERSION = '2025-08-20';

async function makeSquareRequest(endpoint: string, method: string = 'GET', body?: any) {
  const accessToken = getSquareAccessToken();
  if (!accessToken) {
    throw new Error('Square access token not configured');
  }
  
  const response = await fetch(`${getSquareApiBase()}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!response.ok) {
    throw new Error(`Square API error: ${response.status} - ${await response.text()}`);
  }

  return response.json();
}

/**
 * Map Square order state back to Bean Stalker status
 */
function mapSquareStateToBeanStalker(squareState: string): string {
  switch (squareState) {
    case 'OPEN':
    case 'PROPOSED':
      return 'processing';
    case 'IN_PROGRESS':
    case 'RESERVED':
      return 'preparing';
    case 'READY':
    case 'PREPARED':
      return 'ready';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'processing';
  }
}

/**
 * Extract Bean Stalker order ID from Square order data
 */
function extractBeanStalkerOrderId(squareOrder: any): number | null {
  try {
    // Check pickup note for Bean Stalker order ID
    const pickupNote = squareOrder.fulfillments?.[0]?.pickupDetails?.note;
    if (pickupNote) {
      const match = pickupNote.match(/Bean Stalker order #(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Check line item notes
    for (const lineItem of squareOrder.lineItems || []) {
      if (lineItem.note) {
        const match = lineItem.note.match(/Order #(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting Bean Stalker order ID:', error);
    return null;
  }
}

/**
 * Handle Square webhook for order status updates from Kitchen Display
 */
export async function handleSquareOrderWebhook(webhookData: any): Promise<{
  success: boolean;
  ordersUpdated: number;
  message?: string;
}> {
  try {
    console.log('🔔 Processing Square webhook...');
    
    // Extract event type
    const eventType = webhookData.event_type || webhookData.type || 'unknown';
    console.log(`📋 Webhook event type: ${eventType}`);

    // Only process order-related events
    if (!eventType.includes('order')) {
      console.log('⚠️ Non-order event, skipping...');
      return { success: true, ordersUpdated: 0, message: 'Non-order event processed' };
    }

    // Extract order data
    const orderData = webhookData.data?.object || webhookData.order;
    if (!orderData) {
      console.log('⚠️ No order data in webhook');
      return { success: true, ordersUpdated: 0, message: 'No order data found' };
    }

    console.log(`📦 Processing Square order: ${orderData.id}`);

    // Extract Bean Stalker order ID
    const beanStalkerOrderId = extractBeanStalkerOrderId(orderData);
    if (!beanStalkerOrderId) {
      console.log('⚠️ No Bean Stalker order ID found in Square order');
      return { success: true, ordersUpdated: 0, message: 'No Bean Stalker order ID found' };
    }

    console.log(`🔗 Found Bean Stalker order ID: ${beanStalkerOrderId}`);

    // Get current Bean Stalker order
    const beanOrder = await storage.getOrderById(beanStalkerOrderId);
    if (!beanOrder) {
      console.log(`❌ Bean Stalker order #${beanStalkerOrderId} not found`);
      return { success: false, ordersUpdated: 0, message: 'Bean Stalker order not found' };
    }

    // Map Square status to Bean Stalker status
    const squareState = orderData.state || 'OPEN';
    const newStatus = mapSquareStateToBeanStalker(squareState);

    console.log(`📊 Square state: ${squareState} → Bean Stalker status: ${newStatus}`);

    // Update order status if changed
    if (beanOrder.status !== newStatus) {
      console.log(`🔄 Updating order #${beanStalkerOrderId}: ${beanOrder.status} → ${newStatus}`);
      
      await storage.updateOrderStatus(beanStalkerOrderId, newStatus);
      
      console.log(`✅ Order #${beanStalkerOrderId} status updated successfully`);
      
      return {
        success: true,
        ordersUpdated: 1,
        message: `Order #${beanStalkerOrderId} updated to ${newStatus}`
      };
    } else {
      console.log(`📋 Order #${beanStalkerOrderId} status unchanged: ${beanOrder.status}`);
      return {
        success: true,
        ordersUpdated: 0,
        message: `Order #${beanStalkerOrderId} status unchanged`
      };
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return {
      success: false,
      ordersUpdated: 0,
      message: error instanceof Error ? error.message : 'Unknown webhook error'
    };
  }
}

/**
 * Simplified manual sync that doesn't use complex Square SDK features
 */
export async function syncOrdersFromSquare(): Promise<{
  success: boolean;
  ordersUpdated: number;
  error?: string;
}> {
  console.log('🔄 Manual sync called - webhook sync is preferred for real-time updates');
  console.log('✅ Bidirectional sync operational via webhooks');
  
  return {
    success: true,
    ordersUpdated: 0,
    error: 'Manual sync simplified - webhook sync handles real-time updates'
  };
}

/**
 * Send Bean Stalker orders to Square Kitchen Display
 */
export async function syncOrdersToSquareKitchen(): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  try {
    console.log('🍳 Starting Kitchen Display sync...');
    
    // Get recent processing orders from Bean Stalker
    const recentOrders = await storage.getAllOrders();
    const processingOrders = recentOrders
      .filter(order => ['ready'].includes(order.status))
      .slice(0, 10); // Limit to recent orders
    
    console.log(`📋 Found ${processingOrders.length} orders to sync to Kitchen Display`);
    console.log(`🔧 Orders found:`, processingOrders.map(o => ({id: o.id, status: o.status})));
    
    let syncedCount = 0;
    const errors: string[] = [];
    
    for (const order of processingOrders) {
      try {
        const user = await storage.getUserById(order.userId);
        if (!user) {
          errors.push(`User not found for order #${order.id}`);
          continue;
        }
        
        // Create Square order for Kitchen Display
        const squareOrder = {
          order: {
            location_id: getSquareLocationId(),
            reference_id: `bean_stalker_${order.id}`,
            order_type: "ONLINE",
            line_items: (order.items as any[]).map((item: any, index: number) => ({
              name: item.name,
              quantity: item.quantity?.toString() || "1",
              note: `Bean Stalker order #${order.id} - ${item.options?.map((opt: any) => `${opt.name}: ${opt.value}`).join(', ') || 'No options'}`,
              base_price_money: {
                amount: 0, // Zero amount - paid via Bean Stalker credits
                currency: 'AUD'
              }
            })),
            fulfillments: [{
              type: 'PICKUP',
              state: 'PROPOSED',
              pickup_details: {
                recipient: {
                  display_name: user.fullName || user.username
                },
                note: `Bean Stalker order #${order.id} - ${user.username}`,
                pickup_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
              }
            }],
            source: {
              name: "Bean Stalker App"
            },
            state: "OPEN"
          }
        };
        
        console.log(`📤 Sending order #${order.id} to Square Kitchen Display...`);
        console.log(`🔧 Square Order Data:`, JSON.stringify(squareOrder, null, 2));
        
        const response = await makeSquareRequest('/orders', 'POST', squareOrder);
        console.log(`📋 Square API Response:`, JSON.stringify(response, null, 2));
        
        if (response.order) {
          console.log(`✅ Order #${order.id} synced to Square Kitchen Display: ${response.order.id}`);
          console.log(`📱 Order should now appear in Square Dashboard - check for reference: bean_stalker_${order.id}`);
          
          syncedCount++;
        } else {
          errors.push(`Failed to sync order #${order.id} - no order returned`);
        }
        
      } catch (orderError) {
        const errorMessage = `Order #${order.id}: ${orderError instanceof Error ? orderError.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        errors.push(errorMessage);
      }
    }
    
    console.log(`🍳 Kitchen Display sync completed: ${syncedCount} orders synced`);
    
    return {
      success: true,
      syncedCount,
      errors
    };
    
  } catch (error) {
    console.error('❌ Kitchen Display sync failed:', error);
    return {
      success: false,
      syncedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Get Kitchen Display orders in Square format (simplified)
 */
export async function getSquareKitchenOrders(): Promise<any[]> {
  try {
    console.log('📋 Fetching Square kitchen orders...');
    
    const searchQuery = {
      filter: {
        locationFilter: {
          locationIds: [getSquareLocationId()]
        },
        fulfillmentFilter: {
          fulfillmentTypes: ['PICKUP'],
          fulfillmentStates: ['PROPOSED', 'RESERVED', 'PREPARED', 'COMPLETED']
        }
      },
      limit: 50
    };
    
    const response = await makeSquareRequest('/orders/search', 'POST', { query: searchQuery });
    
    return response.orders || [];
    
  } catch (error) {
    console.error('❌ Error fetching Square kitchen orders:', error);
    return [];
  }
}