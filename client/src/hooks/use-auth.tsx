import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { InsertUser, User } from "@shared/schema";
import { apiRequest, getQueryFn, queryClient } from "../lib/queryClient";
import { useNativeNotification } from "@/services/native-notification-service";
import { Capacitor } from '@capacitor/core';
import { iapService } from "@/services/iap-service";
import { deviceService } from "@/services/device-service";

// Define simplified type for login data
type LoginData = {
  username: string;
  password: string;
  saveBiometric?: boolean;
};

// Define a simpler AuthContext type that doesn't rely on complex generics
export type AuthContextType = {
  user: any | null;
  isLoading: boolean;
  error: Error | null;
  login: (data: LoginData & { saveBiometric?: boolean }) => Promise<void>;
  register: (data: InsertUser) => Promise<void>;
  logout: () => Promise<void>;
  isLoginPending: boolean;
  isRegisterPending: boolean;
  isLogoutPending: boolean;
  loginMutation: {
    mutate: (data: LoginData & { saveBiometric?: boolean }) => void;
    mutateAsync: (data: LoginData & { saveBiometric?: boolean }) => Promise<any>;
    isPending: boolean;
  };
  registerMutation: {
    mutate: (data: InsertUser) => void;
    mutateAsync: (data: InsertUser) => Promise<any>;
    isPending: boolean;
  };
};

// Create a default context with minimal implementation
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  isLoginPending: false,
  isRegisterPending: false,
  isLogoutPending: false,
  loginMutation: {
    mutate: () => {},
    mutateAsync: async () => ({}),
    isPending: false,
  },
  registerMutation: {
    mutate: () => {},
    mutateAsync: async () => ({}),
    isPending: false,
  },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { notify } = useNativeNotification();
  
  // Fetch current user with mobile-optimized configuration
  const {
    data: user,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry auth failures
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Initialize RevenueCat with dynamic user ID for sandbox testing
  useEffect(() => {
    if (user && typeof user === 'object' && 'id' in user && user.id && Capacitor.isNativePlatform()) {
      // Initialize with actual user ID for sandbox testing
      iapService.initializeWithUserID(user.id.toString()).then(success => {
        if (success) {
          console.log('RevenueCat initialized for sandbox testing with user ID:', user.id);
        } else {
          console.error('Failed to initialize RevenueCat with user ID:', user.id);
        }
      }).catch(error => {
        console.error('RevenueCat initialization error:', error);
      });
    }
  }, [user]);



  // Login mutation with biometric credential saving
  const loginMutationObj = useMutation({
    mutationFn: async (credentials: LoginData & { saveBiometric?: boolean }) => {
      const res = await apiRequest("POST", "/api/login", {
        username: credentials.username,
        password: credentials.password
      });
      const data = await res.json();
      return { userData: data, originalCredentials: credentials };
    },
    onSuccess: async ({ userData, originalCredentials }) => {
      queryClient.setQueryData(["/api/user"], userData);
      // Scroll to top after successful login
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Save biometric credentials after successful password login (not for biometric login)
      if (originalCredentials.saveBiometric && Capacitor.isNativePlatform()) {
        try {
          const { biometricService } = await import('@/services/biometric-service');
          const saved = await biometricService.saveCredentials(
            originalCredentials.username, 
            originalCredentials.password
          );
          if (saved) {
            console.log('Biometric credentials saved successfully for user:', originalCredentials.username);
          } else {
            console.log('Failed to save biometric credentials');
          }
        } catch (error) {
          console.error('Error saving biometric credentials:', error);
        }
      }
      
      // CRITICAL: Re-initialize RevenueCat after login with user's ID for native payment popups
      if (Capacitor.isNativePlatform() && userData && typeof userData === 'object' && 'id' in userData && userData.id) {
        console.log('💳 AUTH: Re-initializing RevenueCat after login for user:', userData.id);
        iapService.initializeWithUserID(userData.id.toString()).then(success => {
          if (success) {
            console.log('💳 AUTH: RevenueCat re-initialized successfully for native payments');
          } else {
            console.error('💳 AUTH: RevenueCat re-initialization failed');
          }
        }).catch(error => {
          console.error('💳 AUTH: RevenueCat initialization error:', error);
        });
      }
      
      // CRITICAL: Handle device binding for native platforms after successful login
      if (Capacitor.isNativePlatform() && userData && typeof userData === 'object' && 'id' in userData && userData.id) {
        console.log('🔍 NATIVE LOGIN SUCCESS - Starting device binding process...');
        console.log('🔍 User logged in:', { id: userData.id, username: userData.username });
        
        try {
          const isDeviceBound = await deviceService.isDeviceBound();
          console.log('🔍 NATIVE DEVICE BINDING: Current status:', isDeviceBound);
          
          if (!isDeviceBound) {
            console.log('🔗 NATIVE DEVICE BINDING: Device not bound - binding to user:', userData.id);
            await deviceService.bindDeviceToAccount(userData.id.toString());
            console.log('✅ NATIVE DEVICE BINDING: Successfully bound device to user:', userData.id);
            
            // CRITICAL: Verify binding was successful
            const verifyBinding = await deviceService.isDeviceBound();
            const verifyUserId = await deviceService.getBoundUserId();
            console.log('✅ NATIVE DEVICE BINDING VERIFICATION:');
            console.log('✅ - Device bound:', verifyBinding);
            console.log('✅ - Bound to user ID:', verifyUserId);
            
            if (verifyBinding && verifyUserId === userData.id.toString()) {
              console.log('✅ NATIVE DEVICE BINDING: Verification successful');
            } else {
              console.error('❌ NATIVE DEVICE BINDING: Verification failed');
              console.error('❌ Expected:', userData.id.toString());
              console.error('❌ Got:', verifyUserId);
            }
          } else {
            const existingUserId = await deviceService.getBoundUserId();
            console.log('✅ NATIVE DEVICE BINDING: Device already bound to user:', existingUserId);
            
            // Check if bound to the correct user
            if (existingUserId !== userData.id.toString()) {
              console.warn('⚠️ NATIVE DEVICE BINDING: Device bound to different user');
              console.warn('⚠️ Current login:', userData.id.toString());
              console.warn('⚠️ Device bound to:', existingUserId);
              // This shouldn't happen with one-account-per-device system
            }
          }
        } catch (error) {
          console.error('❌ NATIVE DEVICE BINDING: Failed to handle device binding:', error);
          // Don't throw error - login was successful, device binding is optional
        }
      }
    },
    onError: (error: Error) => {
      let title = "Sign In Failed";
      let description = "Please check your credentials and try again";



      // Handle specific error cases
      if (error.message.includes("Invalid credentials")) {
        title = "Invalid Username or Password";
        description = "Please check your username and password are correct";
      } else if (error.message.includes("Network") || error.message.includes("fetch")) {
        title = "Connection Error";
        description = "Cannot connect to server. Check internet connection.";
      } else if (error.message.includes("Server") || error.message.includes("500")) {
        title = "Server Error";
        description = "Our servers are temporarily unavailable. Please try again later";
      } else if (error.message.includes("Unauthorized") || error.message.includes("401")) {
        title = "Invalid Credentials";
        description = "Username or password is incorrect";
      } else if (error.message.includes("timeout")) {
        title = "Request Timeout";
        description = "Server response too slow. Try again.";
      }

      // Log the specific error details for mobile debugging
      console.log('Login error details for mobile debug:', {
        title,
        description,
        originalError: error.message
      });

      notify({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutationObj = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/user"], userData);
      notify({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
      
      // CRITICAL: Re-initialize RevenueCat after registration with new user's ID for native payment popups
      if (Capacitor.isNativePlatform() && userData && typeof userData === 'object' && 'id' in userData && userData.id) {
        console.log('💳 AUTH: Re-initializing RevenueCat after registration for user:', userData.id);
        iapService.initializeWithUserID(userData.id.toString()).then(success => {
          if (success) {
            console.log('💳 AUTH: RevenueCat re-initialized successfully for native payments after registration');
          } else {
            console.error('💳 AUTH: RevenueCat re-initialization failed after registration');
          }
        }).catch(error => {
          console.error('💳 AUTH: RevenueCat initialization error after registration:', error);
        });
      }
    },
    onError: (error: Error) => {
      let title = "Registration Failed";
      let description = "Unable to create your account. Please try again";

      // Handle specific error cases
      if (error.message.includes("Username already exists") || error.message.includes("already taken")) {
        title = "Username Not Available";
        description = "This username is already taken. Please choose a different one";
      } else if (error.message.includes("Email already exists") || error.message.includes("email")) {
        title = "Email Already Registered";
        description = "An account with this email already exists. Try signing in instead";
      } else if (error.message.includes("Password")) {
        title = "Password Requirements";
        description = "Please ensure your password meets the security requirements";
      } else if (error.message.includes("Payment") || error.message.includes("Purchase")) {
        title = "Payment Processing Error";
        description = "Unable to process your premium membership payment. Please try again";
      } else if (error.message.includes("Network")) {
        title = "Connection Error";
        description = "Please check your internet connection and try again";
      } else if (error.message.includes("Server")) {
        title = "Server Error";
        description = "Our servers are temporarily unavailable. Please try again later";
      }

      notify({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutationObj = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      notify({
        title: "Logout successful",
        description: "You have been logged out.",
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Simplified interface for authentication actions
  const login = async (credentials: LoginData & { saveBiometric?: boolean }) => {
    await loginMutationObj.mutateAsync(credentials);
  };

  const register = async (userData: InsertUser) => {
    await registerMutationObj.mutateAsync(userData);
  };

  const logout = async () => {
    await logoutMutationObj.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        login,
        register,
        logout,
        isLoginPending: loginMutationObj.isPending,
        isRegisterPending: registerMutationObj.isPending,
        isLogoutPending: logoutMutationObj.isPending,
        loginMutation: {
          mutate: loginMutationObj.mutate,
          mutateAsync: loginMutationObj.mutateAsync,
          isPending: loginMutationObj.isPending,
        },
        registerMutation: {
          mutate: registerMutationObj.mutate,
          mutateAsync: registerMutationObj.mutateAsync,
          isPending: registerMutationObj.isPending,
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // Force cache refresh: v1.0.2
  return context;
}
