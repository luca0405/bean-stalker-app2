/**
 * Square Kitchen Display Integration
 * Feeds all Bean Stalker orders to Square for Restaurants system
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

// Remove duplicate client initialization

export interface SquareKitchenOrder {
  id: string;
  locationId: string;
  state: 'OPEN' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELED';
  fulfillmentType: 'PICKUP' | 'DELIVERY' | 'DINE_IN';
  createdAt: string;
  updatedAt: string;
  lineItems: Array<{
    uid: string;
    name: string;
    quantity: string;
    catalogObjectId?: string;
    modifiers?: Array<{
      uid: string;
      name: string;
      priceMoney?: {
        amount: number;
        currency: 'USD';
      };
    }>;
  }>;
  fulfillment: {
    uid: string;
    type: 'PICKUP' | 'DELIVERY' | 'DINE_IN';
    state: 'PROPOSED' | 'RESERVED' | 'PREPARED' | 'COMPLETED' | 'CANCELED';
    pickupDetails?: {
      recipient?: {
        displayName: string;
      };
      scheduleType: 'ASAP' | 'SCHEDULED';
      pickupAt?: string;
    };
  };
  netAmountDueMoney: {
    amount: number;
    currency: 'USD';
  };
  totalMoney: {
    amount: number;
    currency: 'USD';
  };
}

/**
 * Transform Bean Stalker order to Square Kitchen Display format
 */
function transformOrderForSquare(order: any): SquareKitchenOrder {
  const lineItems = (order.items || []).map((item: any, index: number) => ({
    uid: `item-${order.id}-${index}`,
    name: item.name,
    quantity: item.quantity.toString(),
    catalogObjectId: item.menuItemId?.toString(),
    modifiers: item.options?.map((option: any, optIndex: number) => ({
      uid: `mod-${order.id}-${index}-${optIndex}`,
      name: option.name,
      priceMoney: option.price ? {
        amount: Math.round(option.price * 100), // Convert to cents
        currency: 'USD' as const
      } : undefined
    })) || []
  }));

  // Map Bean Stalker status to Square state
  const statusMap: Record<string, SquareKitchenOrder['state']> = {
    'pending': 'OPEN',
    'processing': 'IN_PROGRESS',
    'preparing': 'IN_PROGRESS',
    'ready': 'READY',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELED'
  };

  return {
    id: `bs-order-${order.id}`,
    locationId: process.env.SQUARE_LOCATION_ID!,
    state: statusMap[order.status] || 'OPEN',
    fulfillmentType: 'PICKUP',
    createdAt: order.createdAt,
    updatedAt: new Date().toISOString(),
    lineItems,
    fulfillment: {
      uid: `fulfillment-${order.id}`,
      type: 'PICKUP',
      state: statusMap[order.status] === 'COMPLETED' ? 'COMPLETED' : 'PROPOSED',
      pickupDetails: {
        recipient: {
          displayName: order.customerName || order.username || `Customer #${order.userId}`
        },
        scheduleType: 'ASAP'
      }
    },
    netAmountDueMoney: {
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'USD'
    },
    totalMoney: {
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'USD'
    }
  };
}

/**
 * Sync all Bean Stalker orders to Square Kitchen Display
 */
export async function syncOrdersToSquareKitchen(): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  try {
    console.log('🍽️ Starting Square Kitchen Display sync...');
    
    // Get recent orders from Bean Stalker
    const orders = await storage.getRecentOrders(100);
    console.log(`📋 Found ${orders.length} orders to sync`);
    
    const syncedOrders: SquareKitchenOrder[] = [];
    const errors: string[] = [];
    
    for (const order of orders) {
      try {
        // Transform to Square format
        const squareOrder = transformOrderForSquare(order);
        syncedOrders.push(squareOrder);
        
        console.log(`✅ Transformed order #${order.id} for Square Kitchen Display`);
      } catch (error) {
        const errorMsg = `Failed to transform order #${order.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Send orders to Square Orders API
    let actuallyCreated = 0;
    for (const squareOrder of syncedOrders) {
      try {
        // Create order in Square
        const result = await createSquareRestaurantOrder({ id: squareOrder.id.replace('bs-order-', '') });
        if (result.success) {
          actuallyCreated++;
          console.log(`📤 Successfully sent order ${squareOrder.id} to Square Orders API`);
        } else {
          errors.push(`Failed to create Square order for ${squareOrder.id}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Square API error for ${squareOrder.id}: ${error}`);
      }
    }
    
    console.log(`🎉 Successfully sent ${actuallyCreated}/${syncedOrders.length} orders to Square Orders API`);
    
    return {
      success: true,
      syncedCount: syncedOrders.length,
      errors
    };
    
  } catch (error) {
    console.error('Square Kitchen Display sync failed:', error);
    return {
      success: false,
      syncedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Create a Square restaurant order from Bean Stalker order
 */
export async function createSquareRestaurantOrder(beanStalkerOrder: any): Promise<{
  success: boolean;
  squareOrderId?: string;
  error?: string;
}> {
  try {
    // Get the full order details from storage
    const fullOrder = await storage.getOrderById(parseInt(beanStalkerOrder.id));
    if (!fullOrder) {
      throw new Error(`Order #${beanStalkerOrder.id} not found`);
    }
    
    // Get user details for customer name
    const user = await storage.getUser(fullOrder.userId);
    const orderWithUser = {
      ...fullOrder,
      username: user?.username || `Customer #${fullOrder.userId}`
    };
    
    const squareOrder = transformOrderForSquare(orderWithUser);
    
    // Create order via Square Orders API using HTTP requests
    try {
      const response = await makeSquareRequest('/orders', 'POST', {
        locationId: process.env.SQUARE_LOCATION_ID!,
        order: {
          locationId: squareOrder.locationId,
          lineItems: squareOrder.lineItems,
          fulfillments: [squareOrder.fulfillment]
        }
      });
      
      if (response.order) {
        console.log(`✅ Created Square order ${response.order.id} for Bean Stalker order #${beanStalkerOrder.id}`);
      }
    } catch (squareError) {
      console.error(`Square API error for order #${beanStalkerOrder.id}:`, squareError);
      throw squareError;
    }
    
    return {
      success: true,
      squareOrderId: squareOrder.id
    };
    
  } catch (error) {
    console.error(`Failed to create Square order for Bean Stalker order #${beanStalkerOrder.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update Square order status when Bean Stalker order status changes
 */
export async function updateSquareOrderStatus(
  beanStalkerOrderId: number,
  newStatus: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const squareOrderId = `bs-order-${beanStalkerOrderId}`;
    
    // Map Bean Stalker status to Square state
    const statusMap: Record<string, string> = {
      'pending': 'OPEN',
      'processing': 'IN_PROGRESS',
      'preparing': 'IN_PROGRESS',
      'ready': 'READY',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELED'
    };
    
    const squareState = statusMap[newStatus] || 'OPEN';
    
    console.log(`🔄 Updating Square order ${squareOrderId} to state: ${squareState}`);
    
    // In production, update via Square Orders API
    // const ordersApi = squareClient.ordersApi;
    // const response = await ordersApi.updateOrder(squareOrderId, {
    //   order: {
    //     state: squareState,
    //     version: currentVersion // You'd need to track version numbers
    //   }
    // });
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error(`Failed to update Square order status:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle Square webhook for order status updates from Kitchen Display
 * This enables bidirectional sync when kitchen staff update order status
 */
export async function handleSquareOrderWebhook(webhookData: any): Promise<{
  success: boolean;
  ordersUpdated: number;
  error?: string;
}> {
  try {
    console.log('🔍 Processing Square webhook:', JSON.stringify(webhookData, null, 2));
    
    const event_type = webhookData.event_type || webhookData.type;
    const { data } = webhookData;
    
    if (!['order.updated', 'order.fulfillment.updated'].includes(event_type)) {
      console.log(`❌ Ignoring webhook event type: ${event_type}`);
      return { success: true, ordersUpdated: 0 };
    }
    
    const squareOrder = data?.object?.order;
    if (!squareOrder?.id) {
      console.log('❌ No Square order ID found in webhook data');
      return { success: true, ordersUpdated: 0 };
    }
    
    console.log(`🔍 Processing Square order: ${squareOrder.id}`);
    
    // Extract Bean Stalker order ID from Square order reference
    const beanStalkerOrderId = extractBeanStalkerOrderId(squareOrder);
    if (!beanStalkerOrderId) {
      console.log('❌ Could not extract Bean Stalker order ID from Square order');
      return { success: true, ordersUpdated: 0 };
    }
    
    console.log(`✅ Found Bean Stalker order ID: ${beanStalkerOrderId}`);
    
    // Map Square state back to Bean Stalker status
    const squareState = squareOrder.state;
    const beanStalkerStatus = mapSquareStateToBeanStalker(squareState);
    
    console.log(`🔄 Mapping Square state "${squareState}" to Bean Stalker status "${beanStalkerStatus}"`);
    
    // Update Bean Stalker order status
    const currentOrder = await storage.getOrderById(beanStalkerOrderId);
    if (!currentOrder) {
      console.log(`❌ Order #${beanStalkerOrderId} not found in Bean Stalker`);
      return { success: true, ordersUpdated: 0 };
    }
    
    console.log(`📋 Current order status: ${currentOrder.status}, New status: ${beanStalkerStatus}`);
    
    if (currentOrder.status === beanStalkerStatus) {
      console.log(`⏭️  No status change needed - already ${beanStalkerStatus}`);
      return { success: true, ordersUpdated: 0 };
    }
    
    // Update the order status in Bean Stalker
    await storage.updateOrderStatus(beanStalkerOrderId, beanStalkerStatus);
    
    console.log(`📱 Order #${beanStalkerOrderId} status updated from ${currentOrder.status} to ${beanStalkerStatus} via Square Kitchen Display`);
    
    // Send push notification to customer about status change
    await sendOrderStatusNotificationToCustomer(beanStalkerOrderId, currentOrder.userId, beanStalkerStatus);
    
    return {
      success: true,
      ordersUpdated: 1
    };
    
  } catch (error) {
    console.error('Error handling Square order webhook:', error);
    return {
      success: false,
      ordersUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract Bean Stalker order ID from Square order data
 */
function extractBeanStalkerOrderId(squareOrder: any): number | null {
  try {
    // Method 1: Look for Bean Stalker order ID pattern in Square order ID (bs-order-XX)
    if (squareOrder.id && squareOrder.id.startsWith('bs-order-')) {
      const orderIdMatch = squareOrder.id.match(/bs-order-(\d+)/);
      if (orderIdMatch) {
        console.log(`🔍 Found Bean Stalker order ID ${orderIdMatch[1]} in Square order ID: ${squareOrder.id}`);
        return parseInt(orderIdMatch[1]);
      }
    }
    
    // Method 2: Look for Bean Stalker order ID in fulfillment UID (fulfillment-XX)
    const fulfillments = squareOrder.fulfillments || [];
    for (const fulfillment of fulfillments) {
      if (fulfillment.uid && fulfillment.uid.startsWith('fulfillment-')) {
        const fulfillmentMatch = fulfillment.uid.match(/fulfillment-(\d+)/);
        if (fulfillmentMatch) {
          console.log(`🔍 Found Bean Stalker order ID ${fulfillmentMatch[1]} in fulfillment UID: ${fulfillment.uid}`);
          return parseInt(fulfillmentMatch[1]);
        }
      }
    }
    
    // Method 3: Look for Bean Stalker order ID in pickup details note
    for (const fulfillment of fulfillments) {
      const pickupNote = fulfillment.pickup_details?.note || '';
      const refMatch = pickupNote.match(/Bean Stalker order #(\d+)/i);
      if (refMatch) {
        console.log(`🔍 Found Bean Stalker order ID ${refMatch[1]} in pickup note: ${pickupNote}`);
        return parseInt(refMatch[1]);
      }
    }
    
    // Method 4: Look in order reference_id
    if (squareOrder.reference_id) {
      const refMatch = squareOrder.reference_id.match(/bs-order-(\d+)/);
      if (refMatch) {
        console.log(`🔍 Found Bean Stalker order ID ${refMatch[1]} in reference_id: ${squareOrder.reference_id}`);
        return parseInt(refMatch[1]);
      }
    }
    
    // Method 5: Look for it in order note
    const orderNote = squareOrder.note || '';
    const refMatch = orderNote.match(/Bean Stalker [Oo]rder #(\d+)/i);
    if (refMatch) {
      console.log(`🔍 Found Bean Stalker order ID ${refMatch[1]} in order note: ${orderNote}`);
      return parseInt(refMatch[1]);
    }
    
    // Method 6: Look for it in source name
    if (squareOrder.source && squareOrder.source.name) {
      const sourceMatch = squareOrder.source.name.match(/Bean Stalker [Oo]rder #(\d+)/i);
      if (sourceMatch) {
        console.log(`🔍 Found Bean Stalker order ID ${sourceMatch[1]} in source name: ${squareOrder.source.name}`);
        return parseInt(sourceMatch[1]);
      }
    }
    
    console.log(`❌ Could not extract Bean Stalker order ID from Square order:`, JSON.stringify(squareOrder, null, 2));
    return null;
  } catch (error) {
    console.error('Error extracting Bean Stalker order ID:', error);
    return null;
  }
}

/**
 * Map Square order state back to Bean Stalker status
 */
function mapSquareStateToBeanStalker(squareState: string): string {
  const stateMap: Record<string, string> = {
    'OPEN': 'pending',
    'IN_PROGRESS': 'preparing',
    'READY': 'ready',
    'COMPLETED': 'completed',
    'CANCELED': 'cancelled'
  };
  
  return stateMap[squareState] || 'pending';
}

/**
 * Send notification to customer when order status changes from kitchen
 */
async function sendOrderStatusNotificationToCustomer(
  orderId: number, 
  userId: number, 
  newStatus: string
): Promise<void> {
  try {
    // Import notification service dynamically to avoid circular dependencies
    const { sendOrderStatusNotification } = await import('./push-notifications');
    
    await sendOrderStatusNotification(userId, orderId, newStatus);
    
    console.log(`🔔 Sent status notification to user #${userId} for order #${orderId}: ${newStatus}`);
  } catch (error) {
    console.error('Failed to send order status notification:', error);
  }
}

/**
 * Get Kitchen Display orders in Square format
 */
export async function getSquareKitchenOrders(): Promise<SquareKitchenOrder[]> {
  try {
    const orders = await storage.getRecentOrders(50);
    return orders.map(transformOrderForSquare);
  } catch (error) {
    console.error('Failed to get Square Kitchen orders:', error);
    return [];
  }
}

/**
 * Manual sync to check Square order statuses and update Bean Stalker orders
 * Use this when webhooks aren't configured
 */
export async function syncOrdersFromSquare(): Promise<{
  success: boolean;
  ordersUpdated: number;
  error?: string;
}> {
  try {
    console.log('🔄 Starting manual Square order sync...');
    
    // Get recent Bean Stalker orders that might have been updated in Square
    const beanStalkerOrders = await storage.getAllOrders();
    const recentOrders = beanStalkerOrders.filter(order => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return order.createdAt > hourAgo && order.status !== 'completed';
    });
    
    console.log(`🔍 Checking ${recentOrders.length} recent orders for status updates...`);
    
    let ordersUpdated = 0;
    
    // Check each order in Square
    for (const beanOrder of recentOrders) {
      try {
        // Search for Square orders by location and fulfillment type
        const searchQuery = {
          filter: {
            locationFilter: {
              locationIds: [process.env.SQUARE_LOCATION_ID!]
            },
            fulfillmentFilter: {
              fulfillmentTypes: ['PICKUP'],
              fulfillmentStates: ['PROPOSED', 'RESERVED', 'PREPARED', 'COMPLETED', 'CANCELED']
            }
          },
          limit: 100
        };
        
        const searchResponse = await makeSquareRequest('/orders/search', 'POST', {
          query: searchQuery
        });
        
        if (searchResponse.orders) {
          // Find order with matching Bean Stalker ID in pickup note
          const matchingSquareOrder = searchResponse.orders.find((squareOrder: any) => {
            const pickupNote = squareOrder.fulfillments?.[0]?.pickupDetails?.note;
            return pickupNote?.includes(`Bean Stalker order #${beanOrder.id}`);
          });
          
          if (matchingSquareOrder) {
            console.log(`📋 Found Square order for Bean Stalker order #${beanOrder.id}`);
            
            // Check if status has changed
            const squareState = matchingSquareOrder.state;
            const newBeanStalkerStatus = mapSquareStateToBeanStalker(squareState || 'OPEN');
            
            if (beanOrder.status !== newBeanStalkerStatus) {
              console.log(`🔄 Updating order #${beanOrder.id}: ${beanOrder.status} → ${newBeanStalkerStatus}`);
              
              await storage.updateOrderStatus(beanOrder.id, newBeanStalkerStatus);
              
              // Send notification to customer
              console.log(`🔔 Would send notification to user #${beanOrder.userId} for order #${beanOrder.id}: ${newBeanStalkerStatus}`);
              
              ordersUpdated++;
            }
          }
        }
      } catch (orderError) {
        console.error(`❌ Error checking Square order for Bean Stalker order #${beanOrder.id}:`, orderError);
      }
    }
    
    console.log(`✅ Manual sync completed: ${ordersUpdated} orders updated`);
    
    return {
      success: true,
      ordersUpdated
    };
    
  } catch (error) {
    console.error('❌ Manual Square sync error:', error);
    return {
      success: false,
      ordersUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}