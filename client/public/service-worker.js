// Service Worker for Bean Stalker Coffee Shop PWA

const CACHE_NAME = 'beanstalker-cache-v6'; // Updated cache version to force service worker refresh
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/images/icon.svg',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/apple-touch-icon.png',
  '/images/badge.svg',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return the fallback page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return null;
          });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received', event);

  // Enhanced platform detection for special handling
  const userAgent = self.navigator.userAgent.toLowerCase();
  const isWindows = userAgent.includes('windows');
  const isEdge = userAgent.includes('edg');
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isMacOS = userAgent.includes('macintosh');
  const isIOSOrMacOS = isIOS || isMacOS;
  
  // Enhanced platform detection logging
  console.log('Browser environment:', { 
    userAgent: userAgent.substring(0, 50), 
    isWindows, 
    isEdge, 
    isChrome,
    isIOS,
    isMacOS,
    isIOSOrMacOS,
    isSafari
  });

  // Log details about the push event
  let rawData = '{}';
  if (event.data) {
    try {
      rawData = event.data.text();
      console.log('Push event data:', rawData);
      console.log('Data type:', typeof rawData);
      
      // Enhanced platform-specific logging
      if (isWindows) {
        console.log('Windows browser detected, raw data length:', rawData.length);
        console.log('First 100 characters:', rawData.substring(0, 100));
      }
      else if (isIOS) {
        console.log('iOS device detected, raw data length:', rawData.length);
        console.log('First 100 characters:', rawData.substring(0, 100));
      }
      else if (isMacOS) {
        console.log('macOS device detected, raw data length:', rawData.length);
        console.log('First 100 characters:', rawData.substring(0, 100));
      }
      
      // Log more details about iOS/MacOS platform data handling
      if (isIOSOrMacOS) {
        console.log('iOS/macOS special handling activated');
        // Try to parse JSON even if it doesn't pass the simple check
        try {
          const iosData = JSON.parse(rawData);
          console.log('iOS/macOS: Successfully parsed data:', iosData);
        } catch (e) {
          console.log('iOS/macOS: Failed to parse JSON:', e.message);
        }
      }
      
      console.log('Is valid JSON:', isProbablyJSON(rawData));
    } catch (e) {
      console.error('Could not get push event text data:', e);
      rawData = '{}';
    }
  } else {
    console.warn('Push event has no data');
  }

  // Default notification data
  let notificationData = {
    title: 'Bean Stalker Coffee',
    body: 'New notification',
    icon: '/coffee-icon.png', // Use coffee icon for better branding
    badge: '/coffee-icon-small.png',
    data: {}
  };
  
  // Handle different data formats
  try {
    if (rawData) {
      // Handle JSON format
      if (isProbablyJSON(rawData)) {
        notificationData = JSON.parse(rawData);
        console.log('Parsed JSON notification data:', notificationData);
        
        // Check if notification has a user ID (all notifications should have this now)
        if (notificationData && notificationData.data && notificationData.data.userId) {
          console.log('Notification with user ID detected:', notificationData.data.userId);
          
          // We'll handle this in the message event after confirming user ID
          // Exit early and let client code check if this notification is for this user
          return clients.matchAll().then(clients => {
            if (clients.length > 0) {
              // Ask the first client for the current user ID
              clients[0].postMessage({
                type: 'CHECK_USER_ID_FOR_NOTIFICATION',
                data: notificationData
              });
            } else {
              console.log('No active clients found to check user ID');
            }
          });
        }
      } 
      // Handle raw text format (in case it's not JSON)
      else {
        console.log('Non-JSON data detected, using as plain text');
        notificationData = {
          title: 'Bean Stalker Coffee',
          body: rawData.trim(),
          icon: '/coffee-icon.png',
          badge: '/coffee-icon-small.png'
        };
      }
    }
  } catch (error) {
    console.error('Service Worker: Error processing push data', error);
  }

  // Always include required properties
  const title = notificationData.title || 'Bean Stalker Coffee';
  
  // Extract and process potential embedded data from message/body if standard data is missing
  let extractedData = {};
  if (typeof notificationData.body === 'string' && !notificationData.data && notificationData.body.includes('Order #')) {
    // Try to extract order data from message text using regexp
    const orderMatch = notificationData.body.match(/Order #(\d+)/);
    const statusMatch = notificationData.body.match(/is now (\w+)/);
    
    if (orderMatch && statusMatch) {
      extractedData = {
        orderId: parseInt(orderMatch[1], 10),
        status: statusMatch[1],
        url: '/orders'
      };
      console.log('Extracted data from notification body:', extractedData);
    }
  }
  
  // Build notification options
  const options = {
    body: notificationData.body || notificationData.message || 'New notification from Bean Stalker Coffee',
    icon: notificationData.icon || '/coffee-icon.png', // Use coffee icon for better branding
    badge: notificationData.badge || '/coffee-icon-small.png',
    tag: notificationData.tag || 'beanstalker-notification',
    data: notificationData.data || extractedData || {},
    requireInteraction: false, // Changed to false to ensure it works on all platforms
    vibrate: [100, 50, 100],
    renotify: true // Force notification even if one with same tag exists
  };
  
  // Keep notification options simple for all platforms
  console.log('Simplifying notification options for cross-platform compatibility');
  
  // Clear any potentially problematic options
  delete options.image;
  delete options.actions;
  
  // Ensure we have the minimum required properties in our data field
  if (!options.data.url) {
    options.data.url = '/profile';
  }
  
  // Make a super simple notification to improve compatibility
  options.silent = false; // Ensure notification makes sound
  options.requireInteraction = false;
  
  // Make sure tag is always unique to avoid notification replacement issues
  options.tag = options.tag + '-' + Date.now();
  
  // Use coffee icon for better branding 
  options.icon = '/coffee-icon.png';

  console.log('Processing notification with:', { title, options: JSON.stringify(options) });
  
  // Helper function to check if a string is likely to be JSON
  function isProbablyJSON(str) {
    if (typeof str !== 'string') return false;
    str = str.trim();
    return (str.startsWith('{') && str.endsWith('}')) || 
           (str.startsWith('[') && str.endsWith(']'));
  }

  // Instead of showing notification directly, send it to the clients
  // so they can check if it's intended for the current user
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clients => {
        // If there are no clients, we need to show the notification anyway
        // but we'll store it in the waiting notifications list
        if (clients.length === 0) {
          console.log('No clients available, storing notification for later check');
          // We'll rely on page visibility checks to show notifications
          return;
        }
      
        // Otherwise, send this to all clients for user verification
        console.log('Sending notification to clients for user verification');
        const messageData = {
          type: 'VERIFY_NOTIFICATION_USER',
          title,
          body: options.body,
          options: options,
          notificationData: notificationData,
          timestamp: Date.now()
        };
        
        // Send to all clients - only the active client will show it
        // if the user ID matches
        clients.forEach(client => {
          client.postMessage(messageData);
        });
      })
      .catch(error => {
        console.error('Error processing notification:', error);
      })
  );
});

// Message handler - process messages from client
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received from client', event.data);
  
  // Handle SKIP_WAITING message for updates
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Skip waiting command received, activating new service worker');
    self.skipWaiting();
    return;
  }
  
  // Get user-agent for platform-specific handling
  const userAgent = self.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isMacOS = userAgent.includes('macintosh');
  const isIOSOrMacOS = isIOS || isMacOS;
  
  // Handle notification user ID check - works for all notifications, not just tests
  if (event.data.type === 'USER_ID_FOR_TEST_NOTIFICATION') {
    const { userId, notificationData } = event.data;
    console.log(`Received user ID ${userId} for notification check`);
    
    // More detailed logging for iOS debugging
    if (isIOSOrMacOS) {
      console.log('iOS/macOS device detected in message handler');
      console.log('Full notification data:', JSON.stringify(notificationData));
      console.log('User ID type:', typeof userId);
      
      // For iOS/macOS, cast the userId to string for comparison to avoid type mismatch
      const strUserId = String(userId);
      const targetUserId = notificationData?.data?.userId ? String(notificationData.data.userId) : null;
      
      if (targetUserId) {
        console.log(`iOS/macOS: Comparing user IDs - current:${strUserId}, target:${targetUserId}, match:${strUserId === targetUserId}`);
      }
    }
    
    // Check if this notification is intended for this user
    // Use loose equality (==) instead of strict (===) to handle string/number type differences
    const userIdMatches = notificationData?.data?.userId == userId;
    
    if (notificationData && notificationData.data && notificationData.data.userId && userIdMatches) {
      console.log('User ID matches, showing notification');
      
      // Determine if it's a test or normal notification
      const isTest = notificationData.data.isTestNotification === true;
      const notificationType = isTest ? 'test' : 'standard';
      
      // Add platform-specific indicator for debugging
      const platformPrefix = isIOSOrMacOS ? 'iOS/macOS: ' : '';
      
      // Show the notification
      // Play notification sound
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.7;
        audio.play().catch(err => {
          console.log('Could not play notification sound:', err);
        });
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }

      self.registration.showNotification(
        `${platformPrefix}${notificationData.title || 'Bean Stalker Coffee'}`, 
        {
          body: notificationData.body || `${notificationType} notification`,
          icon: '/coffee-icon.png',
          badge: '/coffee-icon-small.png',
          tag: `${notificationType}-${Date.now()}`,
          data: {
            ...notificationData.data,
            timestamp: Date.now(),
            platform: isIOS ? 'ios' : (isMacOS ? 'macos' : 'other')
          },
          requireInteraction: false,
          silent: false
        }
      ).then(() => {
        console.log(`Successfully displayed ${notificationType} notification to user ${userId}`);
      }).catch(error => {
        console.error(`Error showing ${notificationType} notification:`, error);
      });
    } else {
      console.log('User ID mismatch or missing, not showing notification');
      if (notificationData && notificationData.data && notificationData.data.userId) {
        console.log(`Notification was intended for user ${notificationData.data.userId} but current user is ${userId}`);
      }
    }
  }
  
  // Handle showing deferred notifications when app becomes visible
  if (event.data.type === 'APP_VISIBLE') {
    const { userId } = event.data;
    console.log(`App is now visible for user ${userId}, checking for deferred notifications`);
    
    // For future implementation: retrieve and show any deferred notifications
  }
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received', {
    tag: event.notification.tag,
    action: event.action,
    data: event.notification.data
  });
  
  // Close the notification
  event.notification.close();

  // Handle action clicks (if any)
  let url = '/';
  const data = event.notification.data || {};
  
  // If it's an order notification, go to the orders page
  if (data.orderId) {
    url = '/orders';
    console.log(`Order notification clicked for order #${data.orderId}`);
  } else if (data.url) {
    // Otherwise use the provided URL
    url = data.url;
  }
  
  // Custom handling for action buttons
  if (event.action === 'view' && data.orderId) {
    url = `/orders?highlight=${data.orderId}`;
  }

  console.log(`Navigating to ${url}`);
  
  // When notification is clicked, send a message to the main app
  const notifyClients = async () => {
    const allClients = await clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({
        type: 'NOTIFICATION_CLICKED',
        url: url,
        data: data,
        action: event.action,
        tag: event.notification.tag,
        timestamp: Date.now()
      });
    }
  };

  // Focus on existing window if available, otherwise open new one
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // First notify all clients about the click
        notifyClients();
        
        // Then focus or open a window
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            client.focus();
            // Also navigate the client
            return client.navigate(url).catch(() => {
              // If navigation fails (e.g., on older browsers), fallback to openWindow
              return clients.openWindow(url);
            });
          }
        }
        
        // If no existing windows can be focused, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});