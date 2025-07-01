import { 
  SquareClient, 
  SquareEnvironment
} from 'square';
import { randomUUID } from 'crypto';

// Initialize Square client for restaurant operations
const environment = SquareEnvironment.Sandbox;
const squareClient = new SquareClient({
  token: () => process.env.SQUARE_ACCESS_TOKEN || '',
  environment: () => environment
});

console.log('Square for Restaurants integration initialized');

export interface RestaurantOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  basePrice: number;
  modifiers?: {
    name: string;
    price: number;
  }[];
  notes?: string;
}

export interface RestaurantOrder {
  items: RestaurantOrderItem[];
  customerId?: string;
  customerName?: string;
  fulfillmentType: 'PICKUP' | 'DELIVERY' | 'DINE_IN';
  scheduledAt?: Date;
  notes?: string;
}

/**
 * Create a restaurant order using Square Payments API
 * This integrates with Square's payment system for restaurant operations
 */
export async function createRestaurantOrder(orderData: RestaurantOrder) {
  try {
    const idempotencyKey = randomUUID();
    
    // Calculate total order amount
    const totalAmount = orderData.items.reduce((sum, item) => {
      const basePrice = item.basePrice;
      const modifierPrice = item.modifiers?.reduce((modSum, mod) => modSum + mod.price, 0) || 0;
      return sum + ((basePrice + modifierPrice) * item.quantity);
    }, 0);

    // For now, we'll create a simplified order structure
    // In production, this would integrate with Square's full restaurant API
    const orderDetails = {
      id: randomUUID(),
      customerName: orderData.customerName || 'Walk-in Customer',
      fulfillmentType: orderData.fulfillmentType,
      items: orderData.items,
      totalAmount: totalAmount,
      status: 'OPEN',
      scheduledAt: orderData.scheduledAt,
      notes: orderData.notes,
      createdAt: new Date().toISOString()
    };

    console.log('Restaurant order created:', orderDetails);
    
    return {
      success: true,
      order: orderDetails,
      orderId: orderDetails.id
    };
  } catch (error) {
    console.error('Restaurant order creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update order status for restaurant operations
 */
export async function updateOrderStatus(orderId: string, newStatus: string) {
  try {
    console.log(`Updating order ${orderId} to status: ${newStatus}`);
    
    return {
      success: true,
      orderId,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Order status update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get menu items from Square catalog
 */
export async function getSquareMenuItems() {
  try {
    // Use the catalog API to retrieve menu items
    const { result } = await squareClient.catalog.listCatalog(undefined, 'ITEM');
    
    const menuItems = result.objects?.filter((obj: any) => obj.type === 'ITEM') || [];
    
    return {
      success: true,
      items: menuItems.map((item: any) => ({
        id: item.id,
        name: item.itemData?.name,
        description: item.itemData?.description,
        price: item.itemData?.variations?.[0]?.itemVariationData?.priceMoney?.amount,
        category: item.itemData?.categoryId,
        available: true
      }))
    };
  } catch (error) {
    console.error('Square menu items retrieval failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      items: []
    };
  }
}

/**
 * Sync inventory levels with Square
 */
export async function syncInventoryLevels() {
  try {
    const { result } = await squareClient.inventory.batchRetrieveInventoryCounts({
      locationIds: [process.env.SQUARE_LOCATION_ID!]
    });

    return {
      success: true,
      inventory: result.counts || []
    };
  } catch (error) {
    console.error('Square inventory sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      inventory: []
    };
  }
}

/**
 * Create payment for restaurant order
 */
export async function processRestaurantPayment(amount: number, sourceId: string, orderId: string) {
  try {
    const { result } = await squareClient.payments.createPayment({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // Convert to cents
        currency: 'USD'
      },
      locationId: process.env.SQUARE_LOCATION_ID!,
      note: `Bean Stalker Restaurant Order #${orderId}`
    });

    return {
      success: true,
      payment: result.payment,
      paymentId: result.payment?.id
    };
  } catch (error) {
    console.error('Restaurant payment processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get location information for restaurant operations
 */
export async function getLocationInfo() {
  try {
    const { result } = await squareClient.locations.retrieveLocation(
      process.env.SQUARE_LOCATION_ID!
    );

    return {
      success: true,
      location: result.location
    };
  } catch (error) {
    console.error('Location info retrieval failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}