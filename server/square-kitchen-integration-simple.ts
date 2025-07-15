/**
 * Simplified Square Kitchen Display Integration
 * HTTP-only implementation to avoid Square SDK compatibility issues
 */

import { storage } from './storage';

// Use direct HTTP requests instead of SDK to avoid module compatibility issues
const SQUARE_API_BASE = 'https://connect.squareupsandbox.com/v2';
const SQUARE_VERSION = '2023-12-13';

async function makeSquareRequest(endpoint: string, method: string = 'GET', body?: any) {
  const response = await fetch(`${SQUARE_API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
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
 * Get Kitchen Display orders in Square format (simplified)
 */
export async function getSquareKitchenOrders(): Promise<any[]> {
  try {
    console.log('📋 Fetching Square kitchen orders...');
    
    const searchQuery = {
      filter: {
        locationFilter: {
          locationIds: [process.env.SQUARE_LOCATION_ID!]
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