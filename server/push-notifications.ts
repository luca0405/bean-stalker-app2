import webpush from 'web-push';
import { storage } from './storage';
import { PushSubscription } from '@shared/schema';
import crypto from 'crypto';

// Configure web-push with newly generated VAPID keys
// These keys are generated using the web-push generate-vapid-keys command
// The private key should be kept secure and not exposed to clients
const vapidKeys = {
  publicKey: 'BLeQMZeMxGSl0T1YGtCufXPz6aKE8c7ItAwJ5bAavW8FSz0d-Czw5wR-nvGVIhhjkRPs2vok9MzViHINmzdCdCQ',
  privateKey: 'kiLWqPdQTIW9Zf2W3tL4OwSX8d32dZOla-c8erPufaA'
};

// Export the VAPID public key for client-side use
export function getVapidPublicKey() {
  return vapidKeys.publicKey;
};

// Debug: Log a hash of the private key to verify it's consistent across server restarts
// This is useful to confirm we're using the same key consistently
console.log('VAPID private key hash:', crypto.createHash('sha256').update(vapidKeys.privateKey).digest('hex').substring(0, 8));

// Set the proper contact email for VAPID
// This email is required for the VAPID protocol and should be valid
webpush.setVapidDetails(
  'mailto:support@beanstalker.com', // This should be a real contact email for your application
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Configure advanced options for web-push (if available)
// Only set GCM API key if it exists (for Firebase Cloud Messaging/Android)
if (process.env.GCM_API_KEY) {
  webpush.setGCMAPIKey(process.env.GCM_API_KEY);
  console.log('Using GCM API key for Firebase Cloud Messaging');
} else {
  console.log('No GCM API key found. Firebase Cloud Messaging may not work optimally for older Android devices.');
}

// Log that push notification service is initialized
console.log('Push notification service initialized with VAPID keys. Public key:', 
  vapidKeys.publicKey.substring(0, 10) + '...');

/**
 * Send a push notification to a specific user
 * @param userId The ID of the user to send the notification to
 * @param payload The notification payload to send
 */
export async function sendPushNotificationToUser(userId: number, payload: any): Promise<void> {
  try {
    console.log(`Attempting to send notification to user ${userId}`);
    
    const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
    
    if (!subscriptions.length) {
      console.log(`No push subscriptions found for user ${userId}. User hasn't enabled notifications.`);
      return;
    }
    
    console.log(`Found ${subscriptions.length} push subscriptions for user ${userId}`);
    
    // Ensure payload has userId to verify notification recipient
    const enrichedPayload = {
      ...payload,
      data: {
        ...(payload.data || {}),
        userId: userId,
        timestamp: new Date().toISOString()
      }
    };
    
    // Make sure the tag is unique for this notification
    if (!enrichedPayload.tag) {
      enrichedPayload.tag = `notification-${Date.now()}`;
    }
    
    // Send notification to all user's devices with enriched payload
    const results = await Promise.allSettled(
      subscriptions.map(subscription => sendPushNotification(subscription, enrichedPayload))
    );
    
    // Count success and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Push notification results for user ${userId}: ${successful} successful, ${failed} failed`);
    
    // Log any failed attempts
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send push notification to subscription ${index}:`, result.reason);
      }
    });
    
  } catch (error) {
    console.error('Error sending push notification to user:', error);
    // Don't throw the error, just log it - we don't want notification failures to break the app
  }
}

/**
 * Send a push notification to a specific subscription
 * @param subscription The push subscription to send to
 * @param payload The notification payload
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: any
): Promise<webpush.SendResult> {
  try {
    console.log('Attempting to send push notification to subscription:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      userId: subscription.userId
    });
    
    // Create a properly formatted web push subscription object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };
    
    // Detect browser/platform type based on endpoint
    const isWNS = subscription.endpoint.includes('windows.com') || subscription.endpoint.includes('microsoft');
    const isApple = subscription.endpoint.includes('apple') || subscription.endpoint.includes('icloud');
    const isFirebase = subscription.endpoint.includes('fcm') || subscription.endpoint.includes('firebase');
    
    console.log('Endpoint analysis:', { 
      isWNS, 
      isApple, 
      isFirebase, 
      endpointStart: subscription.endpoint.substring(0, 30) 
    });
    
    // Use a universal minimal payload format for all platforms
    console.log('Using simplified universal payload format for cross-platform compatibility');
    
    // Create a simple, minimal payload structure
    let simplePayload: any = {
      title: String(payload.title || 'Bean Stalker Coffee'),
      body: String(payload.body || payload.message || 'You have a new notification'),
      tag: 'beanstalker-notification-' + Date.now(), // Add timestamp to make tag unique
    };
    
    // Add minimal data for context - critical for click handling
    simplePayload.data = {};
    
    // Only copy essential primitive values needed for notification handling
    if (payload.data) {
      // CRITICAL: Preserve the userId for notification targeting
      if (payload.data.userId) simplePayload.data.userId = Number(payload.data.userId);
      
      // Copy other important data fields
      if (payload.data.orderId) simplePayload.data.orderId = Number(payload.data.orderId);
      if (payload.data.status) simplePayload.data.status = String(payload.data.status);
      if (payload.data.url) simplePayload.data.url = String(payload.data.url);
      if (payload.data.testId) simplePayload.data.testId = payload.data.testId;
      if (payload.data.isTestNotification) simplePayload.data.isTestNotification = payload.data.isTestNotification;
      if (payload.data.timestamp) simplePayload.data.timestamp = payload.data.timestamp;
      
      // Default URL if missing
      if (!simplePayload.data.url) {
        simplePayload.data.url = '/orders';
      }
      
      console.log('Preserving userId in notification payload:', payload.data.userId);
    }
    
    // Create a specially formatted message for order status updates
    if (payload.data && payload.data.orderId) {
      // Add emoji based on status
      let emoji = '';
      let statusText = payload.data.status || 'updated';
      
      if (statusText === 'processing') {
        emoji = '☕ ';
        statusText = 'being prepared';
      } else if (statusText === 'completed') {
        emoji = '✅ ';
        statusText = 'ready for pickup';
      } else if (statusText === 'cancelled') {
        emoji = '❌ ';
        statusText = 'cancelled';
      } else if (statusText === 'test') {
        emoji = '🔔 ';
        statusText = 'test';
      }
      
      // Create a clear, direct title and message
      simplePayload.title = `${emoji}Order #${payload.data.orderId} Update`;
      simplePayload.body = `Your order is now ${statusText}`;
    }
    
    // For test notifications, ensure they have a distinctive format
    if (payload.data && payload.data.testId) {
      simplePayload.title = '🔔 Test Notification';
      // Include the timestamp to make each test unique
      const timestamp = new Date().toLocaleTimeString();
      simplePayload.body = `This is a test notification (${timestamp})`;
    }
    
    // Replace the original payload with the simplified one
    payload = simplePayload;
    
    console.log('Simplified universal payload:', JSON.stringify(payload, null, 2));
    
    console.log('Notification payload:', JSON.stringify(payload));
    console.log('Using formatted subscription with keys present:', 
      !!pushSubscription.keys.p256dh && !!pushSubscription.keys.auth);
    
    // Set options based on platform type
    const options: webpush.RequestOptions = {
      TTL: 60 * 60 // 1 hour TTL (default)
    };
    
    // Add platform-specific headers and format
    if (isWNS) {
      console.log('Windows Notification Service detected - using raw format');
      
      // For Windows, use allowed WNS format based on error message
      // "Allowed X-WNS-TYPE are wns/raw, wns/badge and empty"
      options.headers = {
        ...options.headers,
        'X-WNS-Type': 'wns/raw',
        'Content-Type': 'application/octet-stream',
        'X-WNS-Cache-Policy': 'cache'
      };
      
      // Convert payload to Windows raw format (JSON)
      const title = payload.title || 'Bean Stalker';
      const message = payload.body || payload.message || '';
      
      // Create simple JSON payload for Windows
      const rawPayload = JSON.stringify({
        title: title,
        message: message,
        type: 'toast',
        // Include order data if available
        orderId: payload.orderId || payload.data?.orderId,
        status: payload.status || payload.data?.status,
        url: payload.url || payload.data?.url
      });
      
      // Return the raw payload for Windows
      console.log('Using Windows raw JSON format payload');
      return await webpush.sendNotification(
        pushSubscription,
        rawPayload,
        options
      );
      
    } else if (isFirebase) {
      // Firebase Cloud Messaging options
      options.headers = {
        ...options.headers,
        'Urgency': 'high'
      };
    }
    
    console.log('Sending push with options:', {
      platform: isWNS ? 'Windows' : isApple ? 'Apple' : isFirebase ? 'Firebase' : 'Standard',
      ttl: options.TTL,
      headers: options.headers || {}
    });
    
    // Send the notification with retry logic for certain platforms
    let result;
    try {
      // Regular JSON payload for non-Windows platforms
      result = await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload),
        options
      );
    } catch (error: any) {
      // Special retry for Windows platforms with a different payload format
      if (isWNS && (error.statusCode === 400 || error.statusCode === 401)) {
        console.log('Initial Windows push failed, attempting with ultra-minimal raw payload');
        console.log('Windows auth error details:', error.headers ? JSON.stringify(error.headers) : 'No headers');
        
        // Check if the error is related to the VAPID key not matching
        const isVapidMismatch = error.headers && 
          (error.headers['x-wns-error-description'] || error.headers['X-WNS-ERROR-DESCRIPTION']) && 
          (error.headers['x-wns-error-description'] || error.headers['X-WNS-ERROR-DESCRIPTION']).includes('public key');
        
        if (isVapidMismatch) {
          console.log('VAPID key mismatch detected, removing subscription');
          // Remove the subscription as it's using an outdated key
          await storage.deletePushSubscription(subscription.endpoint);
          throw new Error('VAPID key mismatch, subscription removed');
        }
        
        // Try with an ultra-minimal raw payload for WNS
        // This is a last resort for Windows devices that are very strict
        let messageText = typeof payload.body === 'string' ? payload.body : 
                         typeof payload.message === 'string' ? payload.message : 
                         'New notification';
                         
        // For order status notifications, create a clearer message format
        if (payload.data && payload.data.orderId && payload.data.status) {
          messageText = `Order #${payload.data.orderId} is now ${payload.data.status}`;
        }
        
        const rawPayload = JSON.stringify({
          msg: messageText,
          title: payload.title || 'Bean Stalker',
          data: payload.data || {},  // Include the data property for context
          type: 'toast'
        });
        
        // Change headers to use raw format with text/plain content type
        options.headers = {
          'X-WNS-Type': 'wns/raw',
          'Content-Type': 'text/plain', 
          'X-WNS-Cache-Policy': 'cache'
        };
        
        try {
          // Try the ultra-minimal approach
          result = await webpush.sendNotification(
            pushSubscription,
            rawPayload,
            options
          );
        } catch (error2: any) {
          console.error('Even minimal raw payload failed for Windows:', error2.message);
          // If that fails, try the empty/badge approach
          if (error2.statusCode === 400 || error2.statusCode === 401) {
            console.log('Trying last-resort badge notification for Windows');
            
            // Last resort is to send a badge notification with nearly no content
            options.headers = {
              'X-WNS-Type': 'wns/badge',
              'Content-Type': 'text/xml'
            };
            
            // Badge notification format per Microsoft docs
            const badgePayload = `<badge value="alert"/>`;
            
            result = await webpush.sendNotification(
              pushSubscription,
              badgePayload,
              options
            );
          } else {
            throw error2;
          }
        }
      } else {
        throw error; // Re-throw if not a Windows-specific error or retry didn't help
      }
    }
    
    console.log('Push notification sent successfully with status:', result.statusCode);
    return result;
  } catch (error: any) {
    console.error('Error sending push notification:', {
      statusCode: error.statusCode,
      message: error.message,
      body: error.body,
      stack: error.stack,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      headers: JSON.stringify(error.headers || {})
    });
    
    // If the subscription is no longer valid (error.statusCode === 410), remove it
    if (error.statusCode === 410) {
      console.log('Subscription is no longer valid, removing it from the database:', subscription.endpoint);
      await storage.deletePushSubscription(subscription.endpoint);
    }
    
    // Handle specific error cases by platform type
    if (error.statusCode === 401 || error.statusCode === 403) {
      console.log('Detected authorization error');
      
      // Handle Windows Notification Service authentication errors
      if (error.headers && (error.headers['x-wns-error-description'] || error.headers['X-WNS-ERROR-DESCRIPTION'])) {
        const wnsError = error.headers['x-wns-error-description'] || error.headers['X-WNS-ERROR-DESCRIPTION'];
        console.error(`Windows Notification Service error: ${wnsError}`);
        
        if (typeof wnsError === 'string') {
          if (wnsError.includes('JWT Authentication Failed') || wnsError.includes('authentication')) {
            console.error('WNS JWT authentication failed - VAPID keys may be invalid or expired');
            // For WNS authentication issues, we'll remove the subscription as it's likely unrecoverable
            await storage.deletePushSubscription(subscription.endpoint);
          } else if (wnsError.includes('The cloud service is not authorized') || wnsError.includes('authorization')) {
            console.error('WNS authorization error - VAPID configuration issue');
          } else if (wnsError.includes('Device Unreachable')) {
            console.error('WNS device unreachable - removing subscription');
            await storage.deletePushSubscription(subscription.endpoint);
          } else if (wnsError.includes('Channel Expired')) {
            console.error('WNS channel expired - removing subscription');
            await storage.deletePushSubscription(subscription.endpoint);
          }
        }
      } else if (subscription.endpoint.includes('windows.com') || subscription.endpoint.includes('microsoft')) {
        // Generic Windows error with no detailed description
        console.error('Windows Notification Service error without details - authorization issue');
        console.error('This may indicate incompatible VAPID keys or Windows-specific configuration issues');
      } else {
        // General authorization errors for other platforms
        console.error('Push notification authorization failed - check VAPID keys and configuration');
      }
    } else if (error.statusCode === 404) {
      console.error('Push endpoint not found - subscription may be invalid');
      await storage.deletePushSubscription(subscription.endpoint);
    } else if (error.statusCode === 410) {
      console.error('Push subscription has been unsubscribed or expired');
      await storage.deletePushSubscription(subscription.endpoint);
    } else if (error.statusCode === 400) {
      console.error('Bad request error - payload may be invalid or too large');
      // Don't automatically delete the subscription for 400 errors
      // as they might be temporary or fixable payload issues
    } else if (error.statusCode >= 500) {
      console.error('Push service server error, will retry later:', error.statusCode);
    } else {
      // Check for Windows notification "dropped" status, which is common and not an actual error
      if (error.headers && 
          ((error.headers['x-wns-status'] && 
            String(error.headers['x-wns-status']).toLowerCase() === 'dropped') || 
           (error.headers['x-wns-notificationstatus'] && 
            String(error.headers['x-wns-notificationstatus']).toLowerCase() === 'dropped'))) {
        
        console.log('Windows notification marked as "dropped" - this is expected behavior for some Windows devices');
        // Don't throw for Windows "dropped" errors, as these are common and not actual failures
        return {
          statusCode: 202, // Accepted, but not delivered (custom status)
          body: 'Windows notification marked as dropped (expected behavior)',
          headers: error.headers
        };
      } else {
        console.error(`Unhandled push notification error with status code ${error.statusCode}`);
      }
    }
    
    throw error;
  }
}

/**
 * Send an order status notification to a user
 * @param userId The ID of the user who placed the order
 * @param orderId The ID of the order
 * @param status The new status of the order
 */
export async function sendOrderStatusNotification(
  userId: number,
  orderId: number,
  status: string
): Promise<void> {
  // Prepare notification content based on status
  let title = 'Order Update';
  let body = `Order #${orderId} status has been updated to: ${status}`;
  let icon = '/images/icon.svg';
  
  // Customize message based on status
  switch (status) {
    case 'processing':
      title = 'Order Being Prepared';
      body = `Great news! Your order #${orderId} is now being prepared.`;
      break;
    case 'completed':
      title = 'Order Ready for Pickup';
      body = `Your order #${orderId} is ready! Come pick it up while it's hot!`;
      break;
    case 'cancelled':
      title = 'Order Cancelled';
      body = `We're sorry, but your order #${orderId} has been cancelled.`;
      break;
  }
  
  // HYBRID NOTIFICATION SYSTEM:
  // 1. Send web push notification (for web users and when app is active)
  try {
    await sendPushNotificationToUser(userId, {
      title,
      body,
      message: body, // Add message property for browsers that prefer it
      icon,
      badge: '/images/badge.svg',
      tag: `order-${orderId}-${Date.now()}`, // Ensure notification is unique
      vibrate: [100, 50, 100], // Add vibration pattern for mobile devices
      requireInteraction: true, // Makes notification stay until user interacts with it
      actions: [
        {
          action: 'view',
          title: 'View Order'
        }
      ],
      data: {
        orderId,
        status,
        timestamp: new Date().toISOString(),
        url: '/orders' // URL to open when notification is clicked
      }
    });
    console.log(`📨 Web push notification sent to user #${userId} for order #${orderId}`);
  } catch (error) {
    console.error(`❌ Failed to send web push notification to user #${userId}:`, error);
  }
  
  // 2. For native apps, notifications will be handled by foreground detection
  console.log(`📱 Native background notification system will handle status changes for user #${userId}`);
  
  // Note: Native mobile apps will detect order status changes when they come back to foreground
  // and show local notifications using Capacitor LocalNotifications
}

/**
 * Send a notification to all admin users
 * @param payload The notification payload to send
 */
export async function sendNotificationToAdmins(payload: any): Promise<void> {
  try {
    // Get all admin users
    const adminUsers = await storage.getAdminUsers();
    console.log(`Sending notification to ${adminUsers.length} admin users`);
    
    // Send the notification to each admin
    const promises = adminUsers.map(admin => sendPushNotificationToUser(admin.id, payload));
    
    // Wait for all notifications to be sent
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error sending notification to admins:', error);
    throw error;
  }
}

/**
 * Send a notification to admins about a new order
 * @param orderId The ID of the new order
 * @param username The username of the customer who placed the order
 * @param orderTotal The total amount of the order
 */
export async function notifyAdminsAboutNewOrder(
  orderId: number, 
  username: string, 
  orderTotal: number
): Promise<void> {
  const title = 'New Order Received';
  const body = `New order #${orderId} from ${username} for ${orderTotal.toFixed(2)} credits`;
  
  await sendNotificationToAdmins({
    title,
    body,
    icon: '/images/order-icon.svg',
    badge: '/images/badge.svg',
    sound: '/sounds/order-notification.mp3', // Add sound for more attention
    tag: `admin-order-${orderId}-${Date.now()}`, // Ensure notification is unique
    data: {
      orderId,
      url: '/admin', // URL to open when notification is clicked
      timestamp: new Date().toISOString(),
      isAdminNotification: true, // Flag to identify admin notifications
      type: 'new_order'
    },
    // Add vibration pattern (mobile devices only)
    vibrate: [100, 50, 100, 50, 100],
    // Set higher importance for Android
    requireInteraction: true,
    priority: 'high'
  });
}