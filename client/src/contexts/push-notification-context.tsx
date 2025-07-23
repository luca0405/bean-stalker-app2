import { createContext, ReactNode, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useIOSNotificationService } from './ios-notification-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';

// Create a context to track and manage push notification state
interface PushNotificationContextType {
  isReady: boolean;
  notificationsEnabled: boolean;
  forceRefreshOrders: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  isReady: false,
  notificationsEnabled: false,
  forceRefreshOrders: () => {}
});

/**
 * Provider that handles push notification service worker messages 
 * and notifications across all app pages
 */
export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);
  const notificationCache = useRef<Set<string>>(new Set());
  const pollingIntervalRef = useRef<number | null>(null);
  
  // Get push notification state from our hooks
  const {
    isSupported: isPushSupported,
    isSubscribed: isPushSubscribed,
  } = usePushNotifications();
  
  // Get iOS alternative notification state
  const {
    enabled: isIOSEnabled
  } = useIOSNotificationService();
  
  // Determine if any notification method is enabled
  const notificationsEnabled = isPushSubscribed || isIOSEnabled;
  
  // Force refresh orders function that can be called from any component
  const forceRefreshOrders = useCallback(() => {
    console.log('Force refreshing orders from context');
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
  }, []);
  
  // Handle notification messages from service worker
  const handleNotificationMessage = useCallback((event: MessageEvent) => {
    // Handle service worker messages
    if (event.data) {
      console.log(`Received message from service worker:`, event.data.type);
      
      // Handle new verification message from service worker
      if (event.data.type === 'VERIFY_NOTIFICATION_USER' && user?.id) {
        console.log('Verifying user ID for notification display', user.id);
        
        const notificationData = event.data.notificationData;
        const targetUserId = notificationData?.data?.userId;
        
        console.log('Notification target user ID:', targetUserId, 'Current user ID:', user.id, 
          'Types:', typeof targetUserId, typeof user.id);
        
        // Only send back for display if this notification is intended for this user
        // Use string comparison to avoid type mismatches
        if (targetUserId && String(targetUserId) === String(user.id)) {
          console.log('User ID match confirmed, sending notification data back for display');
          
          // Send the verified notification back to service worker for display
          navigator.serviceWorker.controller?.postMessage({
            type: 'USER_ID_FOR_TEST_NOTIFICATION',
            userId: user.id,
            notificationData: notificationData
          });
        } else {
          console.log('User ID mismatch, notification not intended for this user');
          if (targetUserId) {
            console.log(`Notification was intended for user ${targetUserId} but current user is ${user.id}`);
          } else {
            console.log('Notification has no target user ID');
          }
        }
        return;
      }
      
      // Legacy check user ID verification request from service worker
      if (event.data.type === 'CHECK_USER_ID_FOR_NOTIFICATION' && user?.id) {
        console.log('Service worker is checking user ID for notification', user.id);
        
        // Send the current user ID to the service worker for verification
        navigator.serviceWorker.controller?.postMessage({
          type: 'USER_ID_FOR_TEST_NOTIFICATION',
          userId: user.id,
          notificationData: event.data.data
        });
        return;
      }
      
      // Handle standard notification events
      if (event.data.type === 'NOTIFICATION_SHOWN' || event.data.type === 'NOTIFICATION_CLICKED' || event.data.type === 'TEST_NOTIFICATION') {
        console.log(`Received ${event.data.type} message from service worker:`, event.data);
        
        // Handle test notifications
        if (event.data.type === 'TEST_NOTIFICATION' && user?.id) {
          console.log('Received test notification request, passing user ID to service worker');
          // Send the user ID to the service worker for test notification permission check
          navigator.serviceWorker.controller?.postMessage({
            type: 'USER_ID_FOR_TEST_NOTIFICATION',
            userId: user.id,
            notificationData: event.data.notificationData
          });
          return;
        }
      }
      
      // Extract order data if present
      let orderId: number | undefined = undefined;
      let orderStatus: string | undefined = undefined;
      
      if (event.data.data) {
        // Handle orderId which might be a number or string
        if (typeof event.data.data.orderId === 'number') {
          orderId = event.data.data.orderId;
        } else if (typeof event.data.data.orderId === 'string' && !isNaN(parseInt(event.data.data.orderId))) {
          orderId = parseInt(event.data.data.orderId);
        }
        
        // Extract status if available
        if (typeof event.data.data.status === 'string') {
          orderStatus = event.data.data.status;
        }
      }
      
      // For notification clicks, we just want to refresh data without showing a toast
      if (event.data.type === 'NOTIFICATION_CLICKED') {
        console.log('Notification clicked, refreshing order data');
        // Invalidate orders cache
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        
        // If we have a specific order ID, invalidate that as well
        if (orderId) {
          queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        }
        
        return; // Don't show a toast for clicks
      }
      
      // For regular notifications, process them normally
      // Generate a unique ID for this notification to avoid duplicates
      const notificationId = `${event.data.title}-${event.data.body}-${event.data.timestamp || Date.now()}`;
      
      // Add extra info to ID if orderId is present
      const uniqueId = orderId ? `${notificationId}-order-${orderId}` : notificationId;
      
      // Check if we've already processed this notification
      if (!notificationCache.current.has(uniqueId)) {
        notificationCache.current.add(uniqueId);
        
        // If cache is getting too large, trim it (keep last 50 notifications)
        if (notificationCache.current.size > 50) {
          const entries = Array.from(notificationCache.current);
          const newCache = new Set(entries.slice(entries.length - 50));
          notificationCache.current = newCache;
        }
        
        // Determine if notification is order-related
        const isOrderRelated = 
          orderId !== undefined ||
          (event.data.title && event.data.title.toLowerCase().includes('order')) || 
          (event.data.body && (
            event.data.body.toLowerCase().includes('order') || 
            event.data.body.toLowerCase().includes('ready') ||
            event.data.body.toLowerCase().includes('prepared') ||
            event.data.body.toLowerCase().includes('cancelled') ||
            event.data.body.toLowerCase().includes('completed')
          ));
        
        // Handle order-related notifications
        if (isOrderRelated) {
          // Invalidate the orders cache to trigger a refetch
          console.log('Invalidating orders cache due to order notification');
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          
          // If we have a specific order ID, fetch and invalidate that order too
          if (orderId && !isNaN(orderId)) {
            console.log(`Fetching specific order details for order #${orderId}`);
            // Invalidate the specific order cache
            queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
            
            // Fetch the specific order for more details
            fetch(`/api/orders/${orderId}`)
              .then(response => {
                if (!response.ok) {
                  throw new Error('Failed to fetch order details');
                }
                return response.json();
              })
              .then(order => {
                console.log('Successfully fetched order details:', order);
                
                // Use order status or the one from notification data
                const status = order.status || orderStatus || 'updated';
                
                // Create user-friendly status message
                let statusMessage = `Your order is now ${status.toLowerCase()}`;
                if (status.toLowerCase() === 'completed') {
                  statusMessage = 'Your order is ready for pickup!';
                } else if (status.toLowerCase() === 'cancelled') {
                  statusMessage = 'Your order has been cancelled.';
                } else if (status.toLowerCase() === 'processing') {
                  statusMessage = 'Your order is being prepared.';
                }
                
                // Show a more detailed toast notification
                toast({
                  title: `Order #${order.id} Update`,
                  description: statusMessage,
                  duration: 5000
                });
              })
              .catch(error => {
                console.error('Error fetching order details:', error);
                // Fallback to general notification if fetch fails
                toast({
                  title: event.data.title || 'Order Update',
                  description: event.data.body || 'Your order status has been updated.',
                  duration: 5000
                });
              });
          } else {
            // Show a general toast notification for order updates without specific ID
            toast({
              title: event.data.title || 'Order Update',
              description: event.data.body || 'Your order status has been updated.',
              duration: 5000
            });
          }
          
          // Start polling for a minute to ensure any updates are caught
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
          }
          
          // Poll every 30 seconds for 60 seconds to further reduce server load
          let pollCount = 0;
          pollingIntervalRef.current = window.setInterval(() => {
            if (pollCount < 2) { // 2 * 30 seconds = 60 seconds
              console.log('Polling orders (notification triggered) - 30s interval');
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              if (orderId) {
                queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
              }
              pollCount++;
            } else {
              if (pollingIntervalRef.current) {
                window.clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }, 3000);
        } else {
          // For non-order notifications, show a standard toast
          toast({
            title: event.data.title || 'Notification',
            description: event.data.body || 'You have a new notification',
            duration: 5000
          });
        }
      }
    }
  }, [toast, queryClient, user]);
  
  // Listen for service worker messages about new notifications
  useEffect(() => {
    // Only set this up if user is logged in
    if (!user) {
      setIsReady(false);
      return;
    }
    
    console.log('PushNotificationContext: Setting up service worker listener for user', user.id);
    setIsReady(true);
    
    // Handler for visibility changes to improve iOS/Safari notification delivery
    const handleVisibilityChange = () => {
      // If page becomes visible, notify the service worker about active user
      if (document.visibilityState === 'visible' && user?.id) {
        console.log('Document became visible, notifying service worker with user ID:', user.id);
        // Wait a moment for any pending operations to complete
        setTimeout(() => {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'APP_VISIBLE',
              userId: user.id,
              timestamp: Date.now()
            });
          }
        }, 200);
        
        // Also force refresh orders when app becomes visible
        forceRefreshOrders();
      }
    };
    
    // Register the service worker message listener if service workers are supported
    if ('serviceWorker' in navigator) {
      // Add the event listener
      navigator.serviceWorker.addEventListener('message', handleNotificationMessage);
      
      // Force navigator.serviceWorker.ready which ensures service worker is activated
      navigator.serviceWorker.ready.then(registration => {
        console.log('Service worker is active and ready:', registration.active?.state);
        
        // Send an initial APP_VISIBLE message when the service worker is ready
        if (user?.id && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'APP_VISIBLE',
            userId: user.id,
            timestamp: Date.now()
          });
        }
      });
      
      // Add visibility change listener
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // Cleanup on unmount
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleNotificationMessage);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, handleNotificationMessage, forceRefreshOrders]);

  return (
    <PushNotificationContext.Provider value={{ 
      isReady, 
      notificationsEnabled,
      forceRefreshOrders
    }}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext() {
  return useContext(PushNotificationContext);
}