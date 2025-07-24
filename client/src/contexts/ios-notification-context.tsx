import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useNativeNotifications } from '@/hooks/use-native-notifications';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

// This context provides an alternative notification system for iOS Safari
// since it doesn't support the Web Push API

type OrderStatusUpdate = {
  orderId: number;
  status: string;
  updatedAt: string;
};

type IOSNotificationContextType = {
  enabled: boolean;
  enableNotifications: () => void;
  disableNotifications: () => void;
  lastChecked: Date | null;
  isInitializing?: boolean; // Flag indicating whether first-load initialization is in progress
};

const IOSNotificationContext = createContext<IOSNotificationContextType>({
  enabled: false,
  enableNotifications: () => {},
  disableNotifications: () => {},
  lastChecked: null,
  isInitializing: false
});

// Enhanced browser detection helpers
const isIOS = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check if userAgent exists and is a string before calling toLowerCase
  if (!navigator.userAgent || typeof navigator.userAgent !== 'string') {
    console.warn('navigator.userAgent is not available or not a string');
    return false;
  }
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Detect iOS devices (iPhone, iPad, iPod) and modern iPads that report as MacIntel
  const isiOSByUA = /ipad|iphone|ipod/.test(ua);
  const isiOSByPlatform = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isiOSBySafari = ua.includes('safari') && !ua.includes('chrome') && 
                        (ua.includes('apple') || ua.includes('ios'));
  
  const result = isiOSByUA || isiOSByPlatform || isiOSBySafari;
  
  if (result) {
    console.log('iOS device detected via:', {
      userAgent: isiOSByUA,
      platform: isiOSByPlatform,
      safari: isiOSBySafari
    });
  }
  
  return result;
};

// Check if browser is Safari (including iOS Safari)
const isSafari = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check if userAgent exists and is a string before calling toLowerCase
  if (!navigator.userAgent || typeof navigator.userAgent !== 'string') {
    console.warn('navigator.userAgent is not available for Safari detection');
    return false;
  }
  
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome');
};

// Check if push notifications are natively supported
const isPushNotificationSupported = () => {
  if (typeof window === 'undefined') return false;
  
  const supported = 'Notification' in window && 
                    'serviceWorker' in navigator && 
                    'PushManager' in window;
  
  if (!supported && isIOS()) {
    console.log('Push notifications not supported on this iOS device');
  }
  
  return supported;
};

// Check if we need to use in-app notifications
const shouldUseInAppNotifications = () => {
  // Always use in-app notifications for iOS
  if (isIOS()) return true;
  
  // Also use in-app notifications if push notifications aren't supported
  if (!isPushNotificationSupported()) return true;
  
  return false;
};

// Create the provider component for context
export function IOSNotificationProvider({ children }: { children: ReactNode }) {
  const service = useIOSNotificationService();
  
  return (
    <IOSNotificationContext.Provider value={service}>
      {children}
    </IOSNotificationContext.Provider>
  );
}

// Hook to use the iOS notification service from context
export function useIOSNotifications() {
  // Expose the context values
  const context = useContext(IOSNotificationContext);
  
  if (!context) {
    throw new Error('useIOSNotifications must be used within an IOSNotificationProvider');
  }
  
  return context;
}

// Standalone hook that can be used without a provider
export function useIOSNotificationService() {
  const { notifySuccess, notifyError } = useNativeNotifications();
  const { user } = useAuth();
  
  // Check if we're on iOS and log the result
  const [isIOSDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      const result = isIOS();
      console.log('iOS device detection on init:', result);
      return result;
    }
    return false;
  });
  
  // Track if this is the first time loading after login to prevent showing notifications immediately
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Log initialization state for debugging
  useEffect(() => {
    console.log(`iOS notification service initialization state: ${isFirstLoad ? 'initializing' : 'ready'}`);
  }, [isFirstLoad]);
  
  // Store the last known order statuses to detect changes more reliably
  const [lastKnownOrderStatuses, setLastKnownOrderStatuses] = useState<Record<number, string>>({});
  
  // Always default to enabled for iOS devices
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check if the value exists in localStorage
      const storedValue = localStorage.getItem('use-alternative-notifications');
      
      // Force on for iOS, otherwise use stored preference or default to on
      const shouldEnable = isIOSDevice ? true : (storedValue !== null ? storedValue === 'true' : true);
      console.log('In-app notifications enabled:', shouldEnable, 'iOS:', isIOSDevice);
      return shouldEnable;
    }
    return true; // Default to true for SSR
  });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [lastSeenOrderUpdate, setLastSeenOrderUpdate] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('last-seen-order-update');
    }
    return null;
  });

  // Save preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('use-alternative-notifications', enabled.toString());
    }
  }, [enabled]);

  // Poll for order updates if notifications are enabled and user is logged in
  useEffect(() => {
    // Skip if user is not logged in or notifications are disabled
    if (!enabled || !user) return;
    
    // Force enable in-app notifications for iOS
    const isIOSDevice = isIOS();
    console.log('Device is iOS:', isIOSDevice);
    console.log('Starting in-app notification polling for orders');
    
    // Set up polling with interval
    const checkForOrderUpdates = async () => {
      try {
        console.log('Checking for order updates via in-app notifications');
        
        // TEMPORARILY DISABLED - excessive API requests causing performance issues
        // const response = await apiRequest('GET', `/api/orders`);
        // const orders = await response.json();
        const orders = []; // Empty array to prevent polling
        
        if (!orders || orders.length === 0) {
          // No orders to process, but still mark first load as complete
          if (isFirstLoad) {
            console.log('No orders found on first load, marking initialization complete');
            setIsFirstLoad(false);
          }
          return;
        }
        
        // Sort orders by updatedAt
        const sortedOrders = [...orders].sort((a, b) => {
          return new Date(b.updatedAt || b.createdAt).getTime() - 
                new Date(a.updatedAt || a.createdAt).getTime();
        });
        
        // Check for any new or updated orders
        console.log(`Found ${sortedOrders.length} orders to check:`);
        sortedOrders.forEach((order, idx) => {
          console.log(`Order #${idx+1}: id=${order.id}, status=${order.status}, userId=${order.userId}`);
        });
        
        // Only process orders for the current user
        const userOrders = sortedOrders.filter(order => order.userId === user?.id);
        console.log(`Found ${userOrders.length} orders for current user (id: ${user?.id})`);
        
        // First run after logging in - just initialize
        if (isFirstLoad) {
          console.log('First load of orders after login, initializing order cache without notifications');
          
          // Build initial order status map
          const initialStatuses: Record<number, string> = {};
          
          // Mark all current orders as seen without showing notifications
          userOrders.forEach(order => {
            const updateTime = order.updatedAt || order.createdAt;
            const orderKey = `order-${order.id}-${updateTime}`;
            localStorage.setItem(orderKey, 'seen');
            
            // Store the initial status
            initialStatuses[order.id] = order.status;
            
            if (updateTime) {
              setLastSeenOrderUpdate(updateTime);
              localStorage.setItem('last-seen-order-update', updateTime);
            }
          });
          
          // Store initial statuses for future comparison
          setLastKnownOrderStatuses(initialStatuses);
          console.log('Initial order statuses:', initialStatuses);
          
          // Mark initialization complete
          setIsFirstLoad(false);
          return;
        }
        
        // Create a current status map to compare with last known statuses
        const currentStatuses: Record<number, string> = {};
        userOrders.forEach(order => {
          currentStatuses[order.id] = order.status;
        });
        
        // Check for status changes by comparing with last known statuses
        const statusChanges = userOrders.filter(order => {
          return lastKnownOrderStatuses[order.id] !== undefined && 
                 lastKnownOrderStatuses[order.id] !== order.status;
        });
        
        if (statusChanges.length > 0) {
          console.log('Detected status changes:', statusChanges.map(o => ({
            id: o.id,
            oldStatus: lastKnownOrderStatuses[o.id],
            newStatus: o.status
          })));
        }
          
        // Process each user order
        for (const order of userOrders) {
          const updateTime = order.updatedAt || order.createdAt;
          const orderKey = `order-${order.id}-${updateTime}`;
          
          // Two ways to detect updates:
          // 1. Status changed from previous known status
          const statusChanged = lastKnownOrderStatuses[order.id] !== undefined && 
                               lastKnownOrderStatuses[order.id] !== order.status;
                               
          // 2. We haven't seen this specific update before
          const notSeenBefore = !localStorage.getItem(orderKey);
          
          if (statusChanged || notSeenBefore) {
            console.log(`Showing in-app notification for order #${order.id} update to ${order.status}`);
            if (statusChanged) {
              console.log(`Status changed from ${lastKnownOrderStatuses[order.id]} to ${order.status}`);
            }
            
            // Show a notification for the new status
            let statusMessage = `Your order is now ${order.status.toLowerCase()}`;
            
            // Add more user-friendly messages for common statuses
            if (order.status.toLowerCase() === 'completed') {
              statusMessage = 'Your order is ready for pickup!';
            } else if (order.status.toLowerCase() === 'processing') {
              statusMessage = 'Your order is being prepared.';
            } else if (order.status.toLowerCase() === 'cancelled') {
              statusMessage = 'Your order has been cancelled.';
            }
            
            // Use coffee icon for notification
            const coffeeIcon = '☕ ';
            
            // Play notification sound for iOS devices
            if (isIOSDevice && typeof window !== 'undefined') {
              try {
                // Create and play notification sound
                const audio = new Audio('/notification-sound.mp3');
                audio.volume = 0.7; // Set volume to 70%
                audio.play().catch(err => {
                  // Autoplay might be blocked, log the error but continue
                  console.log('Could not play notification sound:', err);
                });
              } catch (error) {
                console.error('Error playing notification sound:', error);
              }
            }
            
            // Make iOS notifications more prominent and long-lasting
            notifySuccess(`${coffeeIcon}Order #${order.id} Update`, statusMessage);
            
            // Log the notification for debugging
            console.log(`In-app notification shown for order #${order.id}:`, {
              status: order.status,
              message: statusMessage,
              device: isIOSDevice ? 'iOS' : 'other',
              time: new Date().toISOString()
            });
            
            // Mark this specific update as seen
            localStorage.setItem(orderKey, 'seen');
            
            // Also update the overall last seen update
            setLastSeenOrderUpdate(updateTime);
            localStorage.setItem('last-seen-order-update', updateTime);
            
            // We only need to show one notification at a time
            break;
          }
        }
        // Always update our known order statuses map after processing
        setLastKnownOrderStatuses(currentStatuses);
        console.log('Updated order status map:', currentStatuses);
      } catch (error) {
        console.error('Error checking for order updates:', error);
      } finally {
        setLastChecked(new Date());
      }
    };
    
    // Run once immediately
    checkForOrderUpdates();
    
    // Disable continuous polling entirely - rely on manual refresh and push notifications
    // const intervalId = setInterval(checkForOrderUpdates, 300000);
    
    // Clean up on unmount or when dependencies change  
    return () => {};
  }, [enabled, user, lastSeenOrderUpdate, isFirstLoad, lastKnownOrderStatuses]);

  const enableNotifications = () => setEnabled(true);
  const disableNotifications = () => setEnabled(false);

  return {
    enabled,
    enableNotifications,
    disableNotifications,
    lastChecked,
    isInitializing: isFirstLoad
  };
}