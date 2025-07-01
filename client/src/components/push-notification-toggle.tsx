import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, BellOff, AlertCircle, Info, HelpCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIOSNotificationService } from '@/contexts/ios-notification-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Enhanced utility function to detect iOS devices
const isIOS = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
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
    console.log('iOS device detected in toggle component:', {
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
  
  const ua = navigator.userAgent.toLowerCase();
  const result = ua.includes('safari') && !ua.includes('chrome');
  
  if (result) {
    console.log('Safari browser detected');
  }
  
  return result;
};

// Utility to determine if we should use in-app notifications
const shouldUseInAppNotifications = () => {
  // iOS devices should use the in-app notification system
  if (isIOS()) {
    console.log('Using in-app notifications because device is iOS');
    return true;
  }
  
  // Also use in-app notifications if notifications are not supported or denied
  if (typeof window !== 'undefined' && window.Notification) {
    if (Notification.permission === 'denied') {
      console.log('Using in-app notifications because browser notifications are denied');
      return true;
    }
  }
  
  // Check if push API is supported
  const pushSupported = 'PushManager' in window;
  if (!pushSupported) {
    console.log('Using in-app notifications because PushManager is not supported');
    return true;
  }
  
  return false;
};

// Enhanced browser detection with more detailed logging
// Interface for browser detection result with all expected properties
interface BrowserInfo {
  isiOS: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isiOSSafari: boolean;
}

const detectBrowser = (): BrowserInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { 
      isiOS: false, 
      isSafari: false, 
      isChrome: false, 
      isFirefox: false,
      isEdge: false,
      isiOSSafari: false
    };
  }
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Detect browser and platform characteristics 
  const browserInfo = {
    // iOS detection
    isiOSByUA: /ipad|iphone|ipod/.test(ua),
    isiOSByPlatform: (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isiOSBySafari: ua.includes('safari') && !ua.includes('chrome') && 
                  (ua.includes('apple') || ua.includes('ios')),
                  
    // Browser detection
    hasSafari: ua.includes('safari') && !ua.includes('chrome'),
    hasChrome: /chrome|crios/i.test(ua) && !/edge|edg/i.test(ua),
    hasFirefox: /firefox|fxios/i.test(ua),
    hasEdge: /edge|edg/i.test(ua)
  };
  
  // Combine detection results
  const results = {
    isiOS: browserInfo.isiOSByUA || browserInfo.isiOSByPlatform || browserInfo.isiOSBySafari,
    isSafari: browserInfo.hasSafari,
    isChrome: browserInfo.hasChrome,
    isFirefox: browserInfo.hasFirefox,
    isEdge: browserInfo.hasEdge
  };
  
  // Specifically detect iOS Safari
  const isiOSSafari = results.isiOS && results.isSafari && 
                        !results.isChrome && !results.isFirefox && !results.isEdge;
  
  // Log detection results
  console.log('Browser detection results:', { 
    ...results,
    isiOSSafari,
    userAgent: ua.substring(0, 50)
  });
  
  // Return the final result object with all properties
  return {
    ...results,
    isiOSSafari
  };
};

// Check for PWA installation status
const isPWAInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

// Check for service worker availability
const checkServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    } catch (error) {
      console.error('Service Worker check failed:', error);
      return false;
    }
  }
  return false;
};

// iOS Alternative Notification UI Components
function IOSNotificationToggle() {
  const { toast } = useToast();
  const {
    enabled: useAlternative,
    enableNotifications,
    disableNotifications
  } = useIOSNotificationService();
  
  // Check device information
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [needsInApp, setNeedsInApp] = useState(false);
  
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      setIsIosDevice(isIOS());
      setNeedsInApp(shouldUseInAppNotifications());
    }
  }, []);
  
  // Demo notification for iOS
  const showDemoNotification = () => {
    toast({
      title: "Order Status Updated",
      description: "Your order #1234 is now ready for pickup!",
      variant: "default",
    });
  };

  // Notification when enabled
  useEffect(() => {
    if (useAlternative && isIosDevice) {
      toast({
        title: "In-App Notifications Active",
        description: "You'll now receive order updates while the app is open.",
        duration: 3000,
      });
    }
  }, [useAlternative, isIosDevice, toast]);

  const cardTitle = isIosDevice ? "In-App Notifications (Recommended)" : "In-App Notifications";
  const badgeLabel = isIosDevice ? "Required for iOS" : "Alternative";
  const badgeVariant = isIosDevice ? "default" : "outline";
  const badgeClass = isIosDevice 
    ? "text-xs bg-green-100 text-green-800 border-green-200" 
    : "text-xs bg-amber-100 text-amber-800 border-amber-200";

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{cardTitle}</CardTitle>
          <Badge variant={badgeVariant} className={badgeClass}>
            {badgeLabel}
          </Badge>
        </div>
        <CardDescription>
          {isIosDevice 
            ? "iOS requires in-app notifications to receive order updates" 
            : "Get order updates while using the app"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {useAlternative ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-sm">
              {useAlternative 
                ? "In-app notifications are enabled" 
                : isIosDevice 
                  ? "Required for iOS devices - enable for order updates" 
                  : "Enable in-app notifications for order updates"}
            </p>
          </div>
          <Switch
            checked={useAlternative}
            onCheckedChange={(checked) => {
              if (checked) {
                enableNotifications();
              } else {
                disableNotifications();
              }
            }}
          />
        </div>
      </CardContent>
      {useAlternative && (
        <CardFooter className="flex justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            You'll see notifications when the app is open
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={showDemoNotification}
          >
            Test Notification
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Special component just for admin users - forces a push notification subscription on mount
export function AdminPushNotificationToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    isSupported, 
    isSubscribed, 
    isPending, 
    isPermissionDenied,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  
  // Auto-subscribe for admin users on component mount
  useEffect(() => {
    // First check if the browser actually supports notifications properly
    const browserInfo = detectBrowser();
    if (browserInfo.isiOSSafari) {
      // iOS Safari doesn't support web push at all, so don't even try
      console.log('Not attempting push subscription on iOS Safari');
      return;
    }
    
    // Only attempt to subscribe if notifications are supported, not already subscribed, not pending, and not denied
    if (isSupported && !isSubscribed && !isPending && !isPermissionDenied && 'Notification' in window) {
      console.log('Auto-subscribing admin user to push notifications');
      
      // Add a timeout to ensure we don't get stuck in a processing state
      const subscribeTimeout = setTimeout(() => {
        console.log('Subscription attempt timed out');
      }, 5000);
      
      // Check current permission first
      if (Notification.permission === 'granted') {
        subscribe().catch(err => {
          console.error('Error auto-subscribing to notifications:', err);
        }).finally(() => clearTimeout(subscribeTimeout));
      } else if (Notification.permission !== 'denied') {
        // Request permission explicitly first
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            subscribe().catch(err => {
              console.error('Error auto-subscribing to notifications after permission granted:', err);
            });
          }
        }).finally(() => clearTimeout(subscribeTimeout));
      }
    }
  }, [isSupported, isSubscribed, isPending, isPermissionDenied, subscribe]);

  // Function to handle subscription toggle
  const handleToggle = async () => {
    if (isPending) return;
    
    try {
      if (isSubscribed) {
        unsubscribe();
      } else {
        // First check if browser supports notifications
        const browserInfo = detectBrowser();
        if (browserInfo.isiOSSafari) {
          toast({
            title: "Not Supported",
            description: "Push notifications are not supported in iOS Safari. Please use the in-app notifications instead.",
            duration: 6000,
          });
          return;
        }
        
        // If the user previously denied permission, we need to show instructions
        if (isPermissionDenied) {
          toast({
            title: "Permission Required",
            description: 
              "You previously denied notification permission. Please update your browser settings to allow notifications from this site.",
            duration: 6000,
          });
          return;
        }
        
        // Add a timeout to prevent getting stuck in loading state
        const subscribeTimeout = setTimeout(() => {
          console.log('Subscription attempt timed out');
          toast({
            title: "Subscription Failed",
            description: "The subscription attempt took too long. Please try again.",
            duration: 6000,
          });
        }, 5000);
        
        // Check current permission status first
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            // Permission already granted, try subscribing
            subscribe()
              .catch(err => {
                console.error('Error subscribing to notifications:', err);
                toast({
                  title: "Subscription Failed",
                  description: "There was a problem enabling notifications. Please try again.",
                  variant: "destructive",
                });
              })
              .finally(() => clearTimeout(subscribeTimeout));
          } else if (Notification.permission !== 'denied') {
            // Need to request permission first
            Notification.requestPermission()
              .then(permission => {
                if (permission === 'granted') {
                  subscribe().catch(err => {
                    console.error('Error subscribing after permission granted:', err);
                    toast({
                      title: "Subscription Failed",
                      description: "There was a problem enabling notifications after permission was granted.",
                      variant: "destructive",
                    });
                  });
                } else {
                  toast({
                    title: "Permission Denied",
                    description: "You need to allow notification permission to receive updates.",
                    variant: "destructive",
                  });
                }
              })
              .finally(() => clearTimeout(subscribeTimeout));
          }
        } else {
          // Notifications not supported in this browser
          toast({
            title: "Not Supported",
            description: "Your browser doesn't support web notifications.",
            variant: "destructive",
          });
          clearTimeout(subscribeTimeout);
        }
      }
    } catch (error) {
      console.error('Error toggling admin notifications:', error);
      toast({
        title: "Error",
        description: "There was a problem with the notification system.",
        variant: "destructive",
      });
    }
  };
  
  if (!isSupported) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm space-y-2">
        <div className="font-medium flex items-center text-yellow-800 dark:text-yellow-300">
          <AlertCircle className="h-4 w-4 mr-2" />
          Notifications Not Supported
        </div>
        <p className="text-yellow-700 dark:text-yellow-400 text-sm">
          Your browser doesn't support push notifications. For the best admin experience, please use a modern browser like Chrome, Edge, or Firefox.
        </p>
      </div>
    );
  }

  if (isPermissionDenied) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm space-y-2">
        <div className="font-medium flex items-center text-yellow-800 dark:text-yellow-300">
          <AlertCircle className="h-4 w-4 mr-2" />
          Permission Required
        </div>
        <p className="text-yellow-700 dark:text-yellow-400 text-sm">
          You've blocked notifications for this site. To receive order notifications, please update your browser settings to allow notifications from Bean Stalker.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.open('https://support.google.com/chrome/answer/3220216?hl=en')}>
          Learn How
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-base font-medium">Admin Push Notifications</p>
          <p className="text-muted-foreground text-sm">
            {isSubscribed
              ? "You're receiving notifications about new orders"
              : "Get notified immediately when new orders come in"}
          </p>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </div>
      
      {isPending && (
        <div className="flex items-center text-muted-foreground text-sm">
          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          Processing...
        </div>
      )}
      
      {isSubscribed && (
        <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
          <CheckCircle2 className="h-3 w-3 mr-2" />
          Notifications enabled
        </div>
      )}
    </div>
  );
}

export function PushNotificationToggle({ className }: { className?: string }) {
  const { 
    isSupported, 
    isSubscribed, 
    isPending, 
    isPermissionDenied,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  const { toast } = useToast();

  const [browserInfo] = useState(detectBrowser());
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasServiceWorker, setHasServiceWorker] = useState(false);
  
  // Check PWA installation and service worker status on component mount
  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    
    // Check service worker registration
    checkServiceWorker().then(result => {
      setHasServiceWorker(result);
    });
    
    // Listen for display mode changes (if user installs PWA during session)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Special case: iOS Safari (which doesn't support web push)
  if (browserInfo.isiOSSafari) {
    // Use the iOS alternative notification system
    const {
      enabled: useAlternative,
      enableNotifications,
      disableNotifications
    } = useIOSNotificationService();
    
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="w-full border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Notifications</CardTitle>
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                iOS Alternative
              </Badge>
            </div>
            <CardDescription>In-app notifications for iOS Safari</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {useAlternative ? (
                  <Bell className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {useAlternative 
                      ? "In-app notifications are enabled" 
                      : "Enable in-app notifications"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications when the app is open
                  </p>
                </div>
              </div>
              <Switch
                checked={useAlternative}
                onCheckedChange={(checked) => {
                  if (checked) {
                    enableNotifications();
                  } else {
                    disableNotifications();
                  }
                }}
              />
            </div>
            
            <div className="flex items-start space-x-4">
              <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm">
                  Apple doesn't support web push notifications on iOS Safari. We've implemented an alternative system that shows notifications while the app is open.
                </p>
                {isInstalled ? (
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    App installed to home screen
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    We recommend adding this app to your home screen for the best experience.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          
          {useAlternative && (
            <CardFooter className="border-t pt-4 flex justify-between">
              <p className="text-xs text-muted-foreground">
                Test the in-app notification system
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Show a test toast notification
                  toast({
                    title: "Test Notification",
                    description: "This is how notifications will appear in the app",
                    duration: 5000,
                  });
                }}
              >
                Test Notification
              </Button>
            </CardFooter>
          )}
          
          {!isInstalled && (
            <CardFooter className="flex flex-col items-start px-6 py-4 bg-muted/50 border-t">
              <div className="flex items-center mb-2">
                <Info className="h-4 w-4 text-primary mr-2" />
                <p className="text-sm font-medium">Install Bean Stalker to your Home Screen</p>
              </div>
              <ol className="text-xs text-muted-foreground list-decimal ml-5 space-y-1">
                <li>Tap the Share button <span className="inline-block px-1">⎋</span> at the bottom of your screen</li>
                <li>Scroll and select "Add to Home Screen"</li>
                <li>Confirm by tapping "Add"</li>
              </ol>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  // If standard push notifications are not supported in this browser
  if (!isSupported) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>Get real-time updates about your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Push notifications are not supported in your browser
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-[250px] text-xs">
                      Try using a modern browser like Chrome, Firefox, or Edge for push notification support.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
      </Card>
    );
  }

  // If permission is denied, show message about how to enable
  if (isPermissionDenied) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>Get real-time updates about your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm">Permission denied. Enable notifications in your browser settings.</p>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start px-6 py-4 bg-muted/50 border-t rounded-b-lg">
          <div className="flex items-center mb-2">
            <Info className="h-4 w-4 text-primary mr-2" />
            <p className="text-sm font-medium">How to enable notifications</p>
          </div>
          <ol className="text-xs text-muted-foreground list-decimal ml-5 space-y-1">
            <li>Click the lock/info icon in your browser's address bar</li>
            <li>Find "Notifications" in the site settings</li>
            <li>Change the setting to "Allow"</li>
            <li>Reload this page</li>
          </ol>
        </CardFooter>
      </Card>
    );
  }

  // Standard push notification UI for supported browsers
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>Get real-time updates about your orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-sm">
              {isSubscribed 
                ? "You will receive order status notifications" 
                : "Enable notifications to stay updated on your orders"}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={isSubscribed}
              onCheckedChange={(checked) => {
                if (checked) {
                  // Similar to admin toggle but simplified for regular users
                  const subscribeTimeout = setTimeout(() => {
                    console.log('Subscription attempt timed out');
                  }, 5000);
                  
                  if ('Notification' in window && Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        subscribe().catch(err => console.error('Error subscribing:', err));
                      }
                    }).finally(() => clearTimeout(subscribeTimeout));
                  } else {
                    subscribe().finally(() => clearTimeout(subscribeTimeout));
                  }
                } else {
                  unsubscribe();
                }
              }}
              disabled={isPending}
            />
          </div>
        </div>
        
        {isSubscribed && (
          <div className="pt-4 border-t mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="text-sm">Test your notifications</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // This function will be provided via window object
                  if (window.testNotification) {
                    window.testNotification();
                  }
                }}
                disabled={isPending}
              >
                Send Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Send a test notification to verify your device can receive push notifications properly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}