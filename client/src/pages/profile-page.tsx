import { AppHeader } from "@/components/app-header";

import { QRCode } from "@/components/qr-code";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { EnhancedBuyCredits } from "@/components/enhanced-buy-credits";
import { SendCredits } from "@/components/send-credits";
import { TransactionHistory } from "@/components/transaction-history";
import AppInstallButton from "@/components/app-install-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useBiometricAuth } from "@/hooks/use-biometric-auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useEffect } from "react";
import { useAppUpdate } from "@/contexts/app-update-context";

const profileFormSchema = z.object({
  username: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  fullName: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  notifications: z.boolean().default(true),
  marketing: z.boolean().default(false),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Add testNotification to Window interface
declare global {
  interface Window {
    testNotification?: () => void;
  }
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkForUpdates, updateAvailable, applyUpdate } = useAppUpdate();
  
  const {
    biometricState,
    setupBiometricAuth,
    disableBiometricAuth,
    getBiometricDisplayName,
  } = useBiometricAuth();

  // Create a single mutation for testing push notifications
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/push/test');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test notification sent",
        description: "If notifications are enabled, you should receive it shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test notification failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handler for sending a test notification
  const handleSendTestNotification = () => {
    // First, send a message to all clients with a potential notification payload
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const timestamp = new Date().toISOString();
      const testId = Math.random().toString(36).substring(2, 10);
      
      // Create notification data to be verified by service worker
      const notificationData = {
        title: "Test Notification",
        body: `This is a test notification (${new Date().toLocaleTimeString()})`,
        timestamp: Date.now(),
        data: {
          testId,
          url: "/profile",
          timestamp,
          orderId: 999, // For test notifications
          status: "test",
          isTestNotification: true,
          userId: user?.id // Include user ID for verification
        }
      };
      
      console.log('Sending TEST_NOTIFICATION message to service worker with user ID:', user?.id);
      
      // Send test notification message to service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_NOTIFICATION',
        notificationData
      });
    }
    
    // Also trigger the backend mutation to send the test notification
    testNotificationMutation.mutate();
  };
  
  // Expose the test notification function to the window object
  // so it can be called from the PushNotificationToggle component
  useEffect(() => {
    window.testNotification = handleSendTestNotification;
    
    // Clean up when component unmounts
    return () => {
      delete window.testNotification;
    };
  }, [handleSendTestNotification, user?.id]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      fullName: user?.fullName || "",
      phoneNumber: user?.phoneNumber || "",
      notifications: true,
      marketing: false,
    },
  });

  // Create a mutation for updating the profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileFormValues>) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the user data in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    // Extract only the profile fields we want to update (not username, which is read-only)
    const { username, notifications, marketing, ...updateData } = data;
    
    try {
      await updateProfileMutation.mutateAsync(updateData);
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error("Error updating profile:", error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <AppHeader />
      
      <main className="flex-1 p-5 scroll-container momentum-scroll">
        <div className="grid gap-6">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-2xl text-primary">Profile Settings</h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormDescription>
                            Your username cannot be changed
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your full name" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your email" type="email" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your phone number" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4">
                    <h3 className="text-lg font-medium">Notifications</h3>
                    
                    <FormField
                      control={form.control}
                      name="notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel>Order Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications about your orders
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="marketing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel>Marketing Emails</FormLabel>
                            <FormDescription>
                              Receive emails about promotions and special offers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Biometric Authentication Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Biometric Authentication</CardTitle>
              <CardDescription>
                Secure and convenient login using Face ID, Touch ID, or fingerprint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {biometricState.isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Checking biometric availability...</span>
                </div>
              ) : biometricState.isAvailable ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{getBiometricDisplayName(biometricState.biometricType)}</span>
                        {biometricState.hasStoredCredentials && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Enabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {biometricState.hasStoredCredentials 
                          ? `You can sign in quickly using ${getBiometricDisplayName(biometricState.biometricType)}`
                          : `Enable ${getBiometricDisplayName(biometricState.biometricType)} for faster sign-in`
                        }
                      </p>
                    </div>
                    <Switch
                      checked={biometricState.hasStoredCredentials}
                      onCheckedChange={async (enabled) => {
                        if (enabled) {
                          // Would prompt user to sign in again to save credentials
                          toast({
                            title: "Setup Required",
                            description: "Sign out and back in to enable biometric authentication",
                          });
                        } else {
                          await disableBiometricAuth();
                        }
                      }}
                    />
                  </div>
                  
                  {biometricState.hasStoredCredentials && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disableBiometricAuth}
                      className="w-full"
                    >
                      Disable {getBiometricDisplayName(biometricState.biometricType)}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-400">🔒</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Biometric authentication is not available on this device or browser. 
                    This feature works on mobile devices with Face ID, Touch ID, or fingerprint sensors.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Balance</CardTitle>
              <CardDescription>
                Your current credit balance is <span className="font-medium">${user?.credits.toFixed(2)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <EnhancedBuyCredits />
                <SendCredits />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Your QR Code</CardTitle>
              <CardDescription>
                Scan this code to identify yourself at the coffee shop or receive credits from other users
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="w-48 h-48">
                <QRCode />
              </div>
            </CardContent>
          </Card>
          
          <TransactionHistory />
          
          <AppInstallButton />
          
          <PushNotificationToggle />
          
          <Card>
            <CardHeader>
              <CardTitle>Debug Tools</CardTitle>
              <CardDescription>Utilities for debugging the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="text-sm font-semibold">Notification Status</div>
                <ul className="list-disc pl-5 text-sm">
                  <li>Push API Supported: {'Notification' in window ? 'Yes' : 'No'}</li>
                  <li>Service Worker Supported: {'serviceWorker' in navigator ? 'Yes' : 'No'}</li>
                  <li>Notification Permission: {typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unknown'}</li>
                  <li>Is Windows: {typeof window !== 'undefined' ? window.navigator.userAgent.includes('Windows') ? 'Yes' : 'No' : 'unknown'}</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.ready
                        .then(reg => {
                          const state = reg.active?.state;
                          console.log('Service worker state:', state);
                          toast({
                            title: 'Service Worker Status',
                            description: `State: ${state || 'unknown'}`,
                            duration: 3000
                          });
                        })
                        .catch(err => {
                          console.error('Service worker error:', err);
                          toast({
                            title: 'Service Worker Error',
                            description: String(err),
                            variant: 'destructive',
                            duration: 5000
                          });
                        });
                    } else {
                      toast({
                        title: 'Service Worker Not Supported',
                        description: 'This browser does not support Service Workers',
                        variant: 'destructive',
                        duration: 5000
                      });
                    }
                  }}
                >
                  Check Service Worker State
                </Button>
                
                <Button
                  onClick={() => {
                    toast({
                      title: "Sending test notification",
                      description: "Check your notifications and console logs",
                      duration: 3000
                    });
                    handleSendTestNotification();
                  }}
                >
                  Send Test Notification
                </Button>
                
                <Button
                  variant="outline"
                  onClick={async () => {
                    toast({
                      title: "Checking for updates",
                      description: "Looking for new versions of the app...",
                      duration: 3000
                    });
                    
                    const hasUpdate = await checkForUpdates();
                    
                    if (hasUpdate) {
                      toast({
                        title: "Update Available",
                        description: "A new version of the app is available.",
                        action: (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={applyUpdate}
                          >
                            Update Now
                          </Button>
                        ),
                        duration: 10000
                      });
                    } else {
                      toast({
                        title: "No Updates",
                        description: "You're already using the latest version.",
                        duration: 3000
                      });
                    }
                  }}
                >
                  Check for Updates
                </Button>
                
                <Button 
                  variant="secondary"
                  onClick={() => {
                    // Force unregister and reregister service worker
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        for(let registration of registrations) {
                          console.log('Unregistering service worker:', registration);
                          registration.unregister();
                        }
                        
                        toast({
                          title: 'Service Worker Reset',
                          description: 'Service worker has been unregistered. Refresh the page to reinstall.',
                          duration: 5000
                        });
                      });
                    } else {
                      toast({
                        title: 'Service Worker Not Supported',
                        description: 'This browser does not support Service Workers',
                        variant: 'destructive',
                        duration: 5000
                      });
                    }
                  }}
                >
                  Reset Service Worker
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      

    </div>
  );
}
