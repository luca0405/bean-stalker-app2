import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  isPending: boolean;
  isPermissionDenied: boolean;
}

interface PushNotificationActions {
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

// Helper function to convert base64 string to Uint8Array
// (needed for the applicationServerKey)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Add padding to the base64 string
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Decode the base64 string
  const rawData = window.atob(base64);
  
  // Create a Uint8Array of the appropriate length
  const outputArray = new Uint8Array(rawData.length);

  // Fill the array with the values
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

export function usePushNotifications(): PushNotificationState & PushNotificationActions {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    subscription: null,
    isPending: false,
    isPermissionDenied: false,
  });

  // Mutation for subscribing to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async (subscription: PushSubscription) => {
      // Get the keys as array buffers
      const p256dhBuffer = subscription.getKey('p256dh') as ArrayBuffer;
      const authBuffer = subscription.getKey('auth') as ArrayBuffer;
      
      // Convert ArrayBuffer to base64 string using a safer approach
      const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhBuffer))));
      const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authBuffer))));
      
      const res = await apiRequest('POST', '/api/push/subscribe', {
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Push Notifications Enabled',
        description: 'You will now receive order status updates.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to enable push notifications.',
        variant: 'destructive',
      });
      // Clean up the subscription if saving failed
      if (state.subscription && 'pushManager' in navigator.serviceWorker) {
        state.subscription.unsubscribe();
      }
    },
  });

  // Mutation for unsubscribing from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const res = await apiRequest('DELETE', '/api/push/unsubscribe', { endpoint });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Push Notifications Disabled',
        description: 'You will no longer receive order status updates.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Unsubscribe Failed',
        description: error.message || 'Failed to disable push notifications.',
        variant: 'destructive',
      });
    },
  });

  // Check if push notifications are supported and user's subscription status
  useEffect(() => {
    // Must be logged in to use push notifications
    if (!user) return;

    // Check if push notifications are supported
    const checkPushSupport = async () => {
      try {
        // More reliable browser detection 
        // iOS detection
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        // Safari detection (includes iOS Safari)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                        (isiOS && !/(CriOS|FxiOS|OPiOS|mercury)/i.test(navigator.userAgent));
        
        const isChrome = /chrome|crios/i.test(navigator.userAgent) && !/edge|edg/i.test(navigator.userAgent);
        const isFirefox = /firefox|fxios/i.test(navigator.userAgent);
        const isEdge = /edge|edg/i.test(navigator.userAgent);
        
        // Specifically detect iOS Safari
        const isiOSSafari = isiOS && isSafari && !isChrome && !isFirefox && !isEdge;
        
        // Safari on iOS doesn't support web push notifications yet
        if (isiOSSafari) {
          console.log('Push notifications not supported on iOS Safari');
          setState(prev => ({ ...prev, isSupported: false }));
          return;
        }

        // Check for required browser features
        if (!('serviceWorker' in navigator)) {
          console.log('Service Worker not supported');
          setState(prev => ({ ...prev, isSupported: false }));
          return;
        }
        
        if (!('PushManager' in window)) {
          console.log('Push API not supported');
          setState(prev => ({ ...prev, isSupported: false }));
          return;
        }
        
        if (!('Notification' in window)) {
          console.log('Notification API not supported');
          setState(prev => ({ ...prev, isSupported: false }));
          return;
        }
        
        // Check if service worker is registered
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (!registration) {
            console.log('No service worker registration found');
            
            // Try registering the service worker directly
            try {
              await navigator.serviceWorker.register('/service-worker.js');
              console.log('Service worker registered successfully');
            } catch (err) {
              console.error('Failed to register service worker:', err);
              setState(prev => ({ ...prev, isSupported: false }));
              return;
            }
          }
        } catch (err) {
          console.error('Error checking service worker registration:', err);
          setState(prev => ({ ...prev, isSupported: false }));
          return;
        }
        
        // All conditions are met
        setState(prev => ({ ...prev, isSupported: true }));
        
        // Check notification permission status
        const permission = Notification.permission;
        if (permission === 'denied') {
          setState(prev => ({ ...prev, isPermissionDenied: true }));
          return;
        }
        
        // Wait for service worker to be ready
        try {
          const readyReg = await navigator.serviceWorker.ready;
          
          // Check if user is already subscribed
          const subscription = await readyReg.pushManager.getSubscription();
          
          setState(prev => ({
            ...prev,
            isSubscribed: !!subscription,
            subscription: subscription
          }));
          
          // If notification permission is granted and user is not subscribed, attempt to auto-subscribe
          if (!subscription && Notification.permission === 'granted') {
            // Check if there's a saved preference in localStorage
            const savedPreference = localStorage.getItem('push-notifications-enabled');
            
            // For admin users, always try to subscribe automatically
            // This ensures admins receive order notifications
            if (user.isAdmin) {
              console.log('Auto-subscribing admin user to push notifications');
              localStorage.setItem('push-notifications-enabled', 'true');
              
              // Slight delay to ensure state is updated
              setTimeout(() => {
                subscribe();
              }, 500);
            }
            // Auto-subscribe regular users if it was previously enabled
            else if (savedPreference === null || savedPreference === 'true') {
              console.log('Auto-subscribing to push notifications');
              
              // Slight delay to ensure state is updated
              setTimeout(() => {
                subscribe();
              }, 500);
            }
          } else if (Notification.permission !== 'denied' && !subscription) {
            // For admin users, always try to request permission
            if (user.isAdmin) {
              console.log('Requesting permission for admin user');
              localStorage.setItem('push-notifications-enabled', 'true');
              
              // Wait a bit for the UI to load before showing the permission request
              setTimeout(() => {
                subscribe();
              }, 1000);
            }
            // For first-time regular users, we'll auto-request permission
            // and auto-subscribe if they accept
            else {
              const savedPreference = localStorage.getItem('push-notifications-enabled');
              
              if (savedPreference === null) {
                // Save preference as 'true' by default
                localStorage.setItem('push-notifications-enabled', 'true');
                
                // Wait a bit for the UI to load before showing the permission request
                setTimeout(() => {
                  subscribe();
                }, 3000);
              }
            }
          }
        } catch (err) {
          console.error('Error getting service worker registration:', err);
          setState(prev => ({ ...prev, isSupported: false }));
        }
      } catch (error) {
        console.error('Error checking push support:', error);
        setState(prev => ({ ...prev, isSupported: false }));
      }
    };

    checkPushSupport();
  }, [user]);

  // Function to subscribe to push notifications
  const subscribe = async () => {
    if (!state.isSupported || !user || state.isSubscribed || state.isPending || state.isPermissionDenied) {
      return;
    }

    setState(prev => ({ ...prev, isPending: true }));

    try {
      // Check for existing service worker registration
      let registration: ServiceWorkerRegistration;
      try {
        const existingRegistration = await navigator.serviceWorker.getRegistration();
        if (!existingRegistration) {
          console.log('No service worker found, registering new one...');
          registration = await navigator.serviceWorker.register('/service-worker.js');
          // Wait for the service worker to be activated
          if (registration.installing) {
            console.log('Waiting for service worker to be activated...');
            await new Promise<void>((resolve) => {
              registration.installing?.addEventListener('statechange', (event: Event) => {
                const sw = event.target as ServiceWorker;
                if (sw.state === 'activated') {
                  resolve();
                }
              });
            });
          }
        } else {
          registration = existingRegistration;
        }
      } catch (err) {
        console.error('Error with service worker registration:', err);
        throw new Error('Service worker registration failed. Please reload the page and try again.');
      }

      // Request notification permission if not already granted
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          isPending: false,
          isPermissionDenied: permission === 'denied'
        }));
        return;
      }

      // Get service worker registration
      const readyRegistration = await navigator.serviceWorker.ready;
      
      // Get the VAPID public key from the server first
      let vapidPublicKey = '';
      let retryCount = 0;
      const maxRetries = 2;
      
      // Try multiple times to get the VAPID key from the server
      while (retryCount <= maxRetries) {
        try {
          console.log(`Fetching VAPID key from server (attempt ${retryCount + 1}/${maxRetries + 1})`);
          const keyResponse = await fetch('/api/push/vapid-key');
          
          if (keyResponse.ok) {
            const keyData = await keyResponse.json();
            vapidPublicKey = keyData.publicKey;
            console.log('Retrieved VAPID public key from server:', vapidPublicKey.substring(0, 10) + '...');
            break; // Successfully got the key, exit the loop
          } else {
            console.warn(`Server returned ${keyResponse.status} when fetching VAPID key`);
            retryCount++;
            
            if (retryCount <= maxRetries) {
              // Wait a bit before retrying (exponential backoff)
              const waitTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
              console.log(`Waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        } catch (err) {
          console.warn(`Error fetching VAPID key (attempt ${retryCount + 1}/${maxRetries + 1}):`, err);
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Wait a bit before retrying
            const waitTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
            console.log(`Waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // If we still don't have a key after all retries, use the fallback
      if (!vapidPublicKey) {
        vapidPublicKey = 'BLeQMZeMxGSl0T1YGtCufXPz6aKE8c7ItAwJ5bAavW8FSz0d-Czw5wR-nvGVIhhjkRPs2vok9MzViHINmzdCdCQ';
        console.log('Using fallback VAPID public key after all server requests failed');
      }
      
      // Convert the VAPID public key to the expected format
      let convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      // Add platform-specific logging
      const userAgent = navigator.userAgent;
      console.log('Subscribing with user agent:', userAgent);
      console.log('Is Windows:', userAgent.includes('Windows'));
      console.log('Is Edge:', userAgent.includes('Edg'));
      
      // Subscribe to push notifications with timeout and retry logic
      let subscription: PushSubscription | null = null;
      let subscribeRetries = 0;
      const maxSubscribeRetries = 2;
      
      while (subscribeRetries <= maxSubscribeRetries) {
        try {
          console.log(`Attempting to subscribe (attempt ${subscribeRetries + 1}/${maxSubscribeRetries + 1})`);
          
          const subscribePromise = readyRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
          
          // Set a timeout to prevent hanging
          const timeoutPromise = new Promise<PushSubscription>((_, reject) => {
            setTimeout(() => reject(new Error('Subscription request timed out')), 10000);
          });
          
          subscription = await Promise.race([subscribePromise, timeoutPromise]);
          
          // Success - break out of the retry loop
          console.log('Successfully created push subscription on attempt', subscribeRetries + 1);
          break;
          
        } catch (subscribeError: any) {
          console.error(`Push subscription error (attempt ${subscribeRetries + 1}):`, subscribeError);
          
          // Check if error might be related to VAPID key mismatch
          const errorMessage = subscribeError?.message?.toLowerCase() || '';
          const isKeyError = errorMessage.includes('key') || 
                             errorMessage.includes('invalid') || 
                             errorMessage.includes('token') || 
                             errorMessage.includes('vapid');
          
          // Windows-specific error detection
          const isWindowsClient = navigator.userAgent.includes('Windows');
          
          // First, try to unsubscribe from any existing subscription
          try {
            const existingSubscription = await readyRegistration.pushManager.getSubscription();
            if (existingSubscription) {
              console.log('Found existing subscription, unsubscribing first');
              await existingSubscription.unsubscribe();
              console.log('Successfully unsubscribed from existing subscription');
            }
          } catch (unsubError) {
            console.error('Error while trying to unsubscribe:', unsubError);
          }
          
          // Increment retry counter
          subscribeRetries++;
          
          // If we've exhausted all retries, throw the final error
          if (subscribeRetries > maxSubscribeRetries) {
            console.error('All subscription attempts failed, giving up');
            throw subscribeError;
          }
          
          // Wait a bit before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, subscribeRetries), 5000);
          console.log(`Waiting ${waitTime}ms before retry ${subscribeRetries}/${maxSubscribeRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // If this might be a VAPID key issue, try fetching a fresh key from the server
          if (isKeyError || (isWindowsClient && subscribeRetries === 1)) {
            console.log('Potential VAPID key issue detected, fetching fresh key');
            try {
              const keyResponse = await fetch('/api/push/vapid-key');
              if (keyResponse.ok) {
                const keyData = await keyResponse.json();
                const freshKey = keyData.publicKey;
                console.log('Fetched fresh VAPID key:', freshKey.substring(0, 10) + '...');
                
                if (freshKey !== vapidPublicKey) {
                  console.log('Received different VAPID key from server, using the new one');
                  vapidPublicKey = freshKey;
                  convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                } else {
                  console.log('VAPID key from server is the same as before');
                }
              }
            } catch (keyError) {
              console.error('Failed to fetch fresh VAPID key:', keyError);
            }
          }
        }
      }
      
      if (!subscription) {
        throw new Error('Failed to create subscription');
      }
      
      console.log('Successfully created push subscription');
      console.log('Endpoint:', subscription.endpoint.substring(0, 100) + '...');
      
      // Save the subscription on the server
      await subscribeMutation.mutateAsync(subscription);
      
      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
        isPending: false
      }));
      
      // Store in local storage that user has enabled notifications
      localStorage.setItem('push-notifications-enabled', 'true');
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      
      setState(prev => ({
        ...prev,
        isPending: false
      }));
      
      toast({
        title: 'Subscription Failed',
        description: error instanceof Error ? error.message : 'There was an error enabling push notifications. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Function to unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!state.isSupported || !state.isSubscribed || !state.subscription || state.isPending) {
      return;
    }

    setState(prev => ({ ...prev, isPending: true }));

    try {
      // Store endpoint before attempting to unsubscribe (needed if client-side unsubscribe fails)
      const endpoint = state.subscription.endpoint;
      
      console.log('Attempting to unsubscribe from push notifications');
      console.log('Endpoint:', endpoint.substring(0, 50) + '...');
      
      // Try client-side unsubscribe with a timeout
      try {
        const unsubscribePromise = state.subscription.unsubscribe();
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Unsubscribe request timed out')), 5000);
        });
        
        await Promise.race([unsubscribePromise, timeoutPromise]);
        console.log('Successfully unsubscribed on client side');
      } catch (unsubError) {
        // Log but continue - we still want to remove on server side
        console.error('Error during client-side unsubscribe:', unsubError);
        console.log('Continuing with server-side unsubscribe');
      }
      
      // Always remove from server, even if client-side unsubscribe fails
      await unsubscribeMutation.mutateAsync(endpoint);
      console.log('Successfully unsubscribed on server side');
      
      // Update local state
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
        isPending: false
      }));
      
      // Update localStorage preference
      localStorage.setItem('push-notifications-enabled', 'false');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      
      // Even if there was an error, we'll mark as unsubscribed client-side
      // to allow the user to try subscribing again
      setState(prev => ({
        ...prev,
        isSubscribed: false, // Reset subscription state anyway to prevent stuck state
        subscription: null,
        isPending: false
      }));
      
      toast({
        title: 'Unsubscribe Had Issues',
        description: 'There was an error while disabling push notifications. You may need to manually deny permission in your browser settings.',
        variant: 'destructive'
      });
    }
  };

  return {
    ...state,
    subscribe,
    unsubscribe
  };
}