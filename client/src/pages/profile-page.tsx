import { AppHeader } from "@/components/app-header";

import { QRCode } from "@/components/qr-code";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { EnhancedBuyCredits } from "@/components/enhanced-buy-credits";
import { SendCredits } from "@/components/send-credits";
import { TransactionHistory } from "@/components/transaction-history";
import { AccountSwitcher } from "@/components/account-switcher";
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
import { useNativeNotification } from "@/services/native-notification-service";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const { user, logout } = useAuth();
  const { notify } = useNativeNotification();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  
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
      
      notify({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create a mutation for deleting the account
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user/account");
      return response.json();
    },
    onSuccess: () => {
      notify({
        title: "Account Deleted Successfully",
        description: "Your account and all associated data have been permanently deleted.",
      });
      
      // Clear the confirmation text
      setDeleteConfirmText("");
      
      // Logout and redirect to home
      logout();
      
      // Navigate to home page after a brief delay to ensure logout completes
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    },
    onError: (error: Error) => {
      notify({
        title: "Delete Failed", 
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
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-50 to-slate-100 native-page-scroll"
    >
      <AppHeader />
      
      <main className="px-5 pb-32">
        <div className="max-w-2xl mx-auto py-6">
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
                    {biometricState.hasStoredCredentials ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disableBiometricAuth}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await setupBiometricAuth();
                            notify({
                              title: "Face ID Setup Complete",
                              description: "You can now sign in using biometric authentication",
                            });
                          } catch (error: any) {
                            notify({
                              title: "Setup Failed",
                              description: error.message || "Could not set up biometric authentication",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Set Up
                      </Button>
                    )}
                  </div>

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

          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>
                Manage your account settings and device binding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Device Account</h4>
                  <p className="text-sm text-muted-foreground">
                    This device is bound to your account for secure transactions
                  </p>
                </div>
                <AccountSwitcher />
              </div>
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

          {/* Danger Zone - Account Deletion */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Danger Zone</CardTitle>
              <CardDescription className="text-red-600">
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Delete Account
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
                      </p>
                      <div>
                        <p className="font-semibold text-gray-800 mb-3">
                          This will delete:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700">Your profile information</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700">Your credit balance <span className="font-medium text-green-600">(${user?.credits?.toFixed(2) || '0.00'})</span></span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700">Your order history</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700">Your favorites</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700">All transaction records</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                        <p className="text-sm text-amber-800 font-medium mb-2">
                          Type "DELETE" to confirm:
                        </p>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type DELETE to confirm"
                          className="mt-2"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                    <AlertDialogCancel 
                      onClick={() => setDeleteConfirmText("")}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAccountMutation.mutate()}
                      disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
      

    </div>
  );
}
