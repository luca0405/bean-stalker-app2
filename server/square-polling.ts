import { storage } from './storage';

/**
 * Square Order Status Polling System
 * 
 * This system polls Square API every 30 seconds to check for order status changes
 * that may have been missed due to webhook delivery issues.
 */
export class SquareOrderPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private readonly POLL_INTERVAL = 15000; // 15 seconds
  private readonly MAX_ORDERS_TO_CHECK = 10; // Check last 10 active orders

  /**
   * Start polling for order status changes
   */
  public startPolling(): void {
    if (this.isPolling) {
      console.log('⚠️ Square polling already active');
      return;
    }

    this.isPolling = true;
    console.log('🔄 Starting Square order status polling (every 15 seconds)');
    
    // Poll immediately then set interval
    this.pollOrderStatuses();
    this.intervalId = setInterval(() => {
      this.pollOrderStatuses();
    }, this.POLL_INTERVAL);
  }

  /**
   * Stop polling for order status changes
   */
  public stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    console.log('⏹️ Square order status polling stopped');
  }

  /**
   * Poll Square API for order status changes
   * Uses dynamic import to avoid build-time import issues
   */
  private async pollOrderStatuses(): Promise<void> {
    try {
      console.log('🔍 Polling Square for order status changes...');
      
      // Get active Bean Stalker orders (not completed or cancelled)
      const activeOrders = await storage.getActiveOrders();
      console.log(`📋 Checking ${activeOrders.length} active orders`);

      if (activeOrders.length === 0) {
        console.log(`✅ Square polling completed: no active orders to check`);
        return;
      }

      let updatedCount = 0;
      
      // Use HTTP requests directly to avoid SDK import issues
      const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN_PROD;
      const squareApiBase = 'https://connect.squareup.com/v2';
      
      if (!squareAccessToken) {
        console.log('⚠️ Square access token not available for polling - webhook-only mode');
        return;
      }
      
      for (const beanOrder of activeOrders.slice(0, this.MAX_ORDERS_TO_CHECK)) {
        try {
          // Get Square order by Bean Stalker order reference
          const squareOrderId = `bean_stalker_${beanOrder.id}`;
          const response = await fetch(`${squareApiBase}/orders/${squareOrderId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${squareAccessToken}`,
              'Content-Type': 'application/json',
              'Square-Version': '2024-10-17'
            }
          });
          
          if (response.ok) {
            const responseData = await response.json();
            const squareOrder = responseData.order;
            
            // Check if fulfillments exist and get the latest state
            let squareFulfillmentState = null;
            if (squareOrder && squareOrder.fulfillments && squareOrder.fulfillments.length > 0) {
              // Find the fulfillment that matches our pattern
              const bsFulfillment = squareOrder.fulfillments.find((f: any) => 
                f.uid?.includes(`bs-fulfillment-${beanOrder.id}`)
              );
              
              if (bsFulfillment) {
                squareFulfillmentState = bsFulfillment.state;
              } else {
                // Fallback to first fulfillment if no matching pattern
                squareFulfillmentState = squareOrder.fulfillments[0].state;
              }
            }
            
            // Map Square fulfillment state to Bean Stalker status
            let expectedBeanStatus = 'processing';
            if (squareFulfillmentState === 'PREPARED' || squareFulfillmentState === 'READY') {
              expectedBeanStatus = 'ready';
            } else if (squareFulfillmentState === 'COMPLETED') {
              expectedBeanStatus = 'completed';
            } else if (squareFulfillmentState === 'CANCELED') {
              expectedBeanStatus = 'cancelled';
            }
            
            // Update if status has changed
            if (beanOrder.status !== expectedBeanStatus) {
              await storage.updateOrderStatus(beanOrder.id, expectedBeanStatus);
              
              // Send notification to customer
              const { sendOrderStatusNotification } = await import('./push-notifications');
              await sendOrderStatusNotification(beanOrder.userId, beanOrder.id, expectedBeanStatus);
              
              console.log(`🔄 Order #${beanOrder.id} status synced via polling: ${beanOrder.status} → ${expectedBeanStatus}`);
              updatedCount++;
            }
          }
        } catch (orderError) {
          // Skip individual order errors (order might not exist in Square)
          console.log(`⚠️ Could not check Square order for Bean Stalker #${beanOrder.id}`);
        }
      }
      
      if (updatedCount > 0) {
        console.log(`✅ Square polling completed: ${updatedCount} orders updated`);
      } else {
        console.log(`✅ Square polling completed: all orders in sync`);
      }
      
    } catch (error) {
      console.error('❌ Error during Square polling:', error);
    }
  }



  /**
   * Get polling status
   */
  public getStatus(): { isActive: boolean, interval: number } {
    return {
      isActive: this.isPolling,
      interval: this.POLL_INTERVAL
    };
  }
}

// Export singleton instance
export const squarePoller = new SquareOrderPoller();