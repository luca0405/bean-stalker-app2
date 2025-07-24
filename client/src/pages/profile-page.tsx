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
import { useNativeNotifications } from "@/hooks/use-native-notifications";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";

const profileFormSchema = z.object({
  username: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  fullName: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  notifications: z.boolean().default(true),
  marketing: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;



export default function ProfilePage() {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNativeNotifications();

  
  const {
    biometricState,
    setupBiometricAuth,
    disableBiometricAuth,
    getBiometricDisplayName,
  } = useBiometricAuth();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      fullName: user?.fullName || "",
      phoneNumber: user?.phoneNumber || "",
      notifications: true,
      marketing: true,
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
      
      notifySuccess("Profile updated", "Your profile has been updated successfully.");
    },
    onError: (error: Error) => {
      notifyError("Update failed", error.message);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AppHeader />
      
      <main className="pb-24 px-5 main-content-with-header">
        <div className="max-w-2xl mx-auto py-2">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-semibold text-2xl text-primary">Profile Settings</h1>
          </div>
          
          <div className="space-y-6">
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
          </div>
        </div>
      </main>
    </div>
  );
}
