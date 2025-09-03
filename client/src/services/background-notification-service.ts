import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useQuery } from '@tanstack/react-query';

/**
 * Background Notification Service for Native Mobile Apps
 * 
 * Since native mobile apps can't receive web push notifications when backgrounded,
 * this service polls for order status changes when the app comes back to foreground
 * and shows local notifications for any missed updates.
 */
class BackgroundNotificationService {
  private isNative = Capacitor.isNativePlatform();
  private lastCheckedOrders: { [orderId: number]: string } = {};
  private isInitialized = false;

  async initialize() {
    if (!this.isNative || this.isInitialized) return;
    
    try {
      // Request permissions for local notifications
      const permissions = await LocalNotifications.requestPermissions();
      console.log('🔔 Background notification permissions:', permissions.display);
      
      this.isInitialized = true;
      
      // Check for missed notifications when app comes to foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('📱 App came to foreground - checking for missed notifications');
          this.checkForMissedNotifications();
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize background notifications:', error);
    }
  }

  async checkForMissedNotifications() {
    if (!this.isNative) return;
    
    try {
      // Fetch current orders to compare with last known state
      const response = await fetch('/api/orders');
      if (!response.ok) return;
      
      const currentOrders = await response.json();
      
      for (const order of currentOrders) {
        const lastKnownStatus = this.lastCheckedOrders[order.id];
        
        // If status changed and it's a meaningful change, show local notification
        if (lastKnownStatus && lastKnownStatus !== order.status) {
          await this.showLocalNotification(order);
        }
        
        // Update our tracking
        this.lastCheckedOrders[order.id] = order.status;
      }
      
    } catch (error) {
      console.error('❌ Failed to check for missed notifications:', error);
    }
  }

  private async showLocalNotification(order: any) {
    if (!this.isNative) return;
    
    let title = 'Order Update';
    let body = `Order #${order.id} status: ${order.status}`;
    
    // Customize based on status
    switch (order.status) {
      case 'processing':
        title = 'Order Being Prepared';
        body = `Great news! Your order #${order.id} is now being prepared.`;
        break;
      case 'completed':
        title = 'Order Ready for Pickup';
        body = `Your order #${order.id} is ready! Come pick it up while it's hot!`;
        break;
      case 'cancelled':
        title = 'Order Cancelled';
        body = `We're sorry, but your order #${order.id} has been cancelled.`;
        break;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(), // Unique ID
            schedule: { at: new Date(Date.now() + 100) }, // Show immediately
            sound: 'default',
            attachments: [],
            actionTypeId: '',
            extra: {
              orderId: order.id,
              status: order.status,
              type: 'order_status'
            }
          }
        ]
      });
      
      console.log(`🔔 Local notification shown for order #${order.id}: ${order.status}`);
      
    } catch (error) {
      console.error('❌ Failed to show local notification:', error);
    }
  }

  updateOrderStatus(orderId: number, status: string) {
    this.lastCheckedOrders[orderId] = status;
  }

  getTrackedOrders() {
    return { ...this.lastCheckedOrders };
  }
}

export const backgroundNotificationService = new BackgroundNotificationService();