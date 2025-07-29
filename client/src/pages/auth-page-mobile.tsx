import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBiometricAuth } from "@/hooks/use-biometric-auth";
import { useIAP } from "@/hooks/use-iap";
import { iapService } from "@/services/iap-service";
import { Capacitor } from '@capacitor/core';
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNativeNotification } from "@/services/native-notification-service";
import { User, Lock, Eye, EyeOff, Fingerprint, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { deviceService } from "@/services/device-service";
import { MembershipDebugDisplay } from "@/components/membership-debug-display";


export default function AuthPageMobile() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { notify } = useNativeNotification();
  const { purchaseProduct, isAvailable: iapAvailable, isLoading: iapLoading } = useIAP();
  const isNative = Capacitor.isNativePlatform();
  const {
    biometricState,
    authenticateWithBiometrics,
    getBiometricDisplayName,
    isAuthenticating
  } = useBiometricAuth();

  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  });
  
  // Debug login data changes
  useEffect(() => {
    console.log('🔍 Login data state changed:', {
      username: loginData.username,
      passwordLength: loginData.password?.length || 0,
      hasPassword: !!loginData.password
    });
  }, [loginData]);

  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [hasDeviceBinding, setHasDeviceBinding] = useState(false);
  const [boundUsername, setBoundUsername] = useState("");
  
  const [registerData, setRegisterData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    joinPremium: true // Premium membership enabled by default
  });

  // Debug state for membership registration
  const [debugSteps, setDebugSteps] = useState<Array<{
    step: string;
    status: 'pending' | 'success' | 'warning' | 'error';
    details: string;
    timestamp: string;
  }>>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addDebugStep = (step: string, status: 'pending' | 'success' | 'warning' | 'error', details: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugSteps(prev => [...prev, { step, status, details, timestamp }]);
  };

  // Check for existing device binding on component mount
  useEffect(() => {
    const checkDeviceBinding = async () => {
      try {
        console.log('🔍 DEVICE BINDING: Starting comprehensive device binding check...');
        
        // CRITICAL: Always clear previous state first
        setHasDeviceBinding(false);
        setBoundUsername('');
        
        // ENHANCED: Force detailed device binding check
        const isDeviceBound = await deviceService.isDeviceBound();
        console.log('🔍 DEVICE BINDING: Device bound result:', isDeviceBound);
        
        // CRITICAL DEBUG: Check Capacitor preferences directly for diagnostics
        const { Preferences } = await import('@capacitor/preferences');
        const rawBoundValue = await Preferences.get({ key: 'bean-stalker-account-bound' });
        const rawUserIdValue = await Preferences.get({ key: 'bound-user-id' });
        
        console.log('🔍 DEVICE BINDING DEBUG: Raw preferences:', {
          rawBoundValue: rawBoundValue.value,
          rawUserIdValue: rawUserIdValue.value,
          isDeviceBound,
          platformCheck: 'Native iPhone testing'
        });
        
        setHasDeviceBinding(isDeviceBound);
        
        if (isDeviceBound) {
          // Get the bound user's username with enhanced debugging
          const boundUserId = await deviceService.getBoundUserId();
          console.log('🔍 NATIVE DEVICE BINDING: Bound user ID from service:', boundUserId);
          
          if (boundUserId) {
            try {
              // ENHANCED: Fetch user data with full URL and error handling
              console.log('🔍 NATIVE DEVICE BINDING: Fetching user data for ID:', boundUserId);
              const response = await fetch(`/api/users/${boundUserId}`);
              console.log('🔍 NATIVE DEVICE BINDING: API response status:', response.status);
              
              if (response.ok) {
                const userData = await response.json();
                console.log('🔍 NATIVE DEVICE BINDING: User data received:', userData);
                
                setBoundUsername(userData.username);
                // CRITICAL: Update username in login data for device-bound users
                setLoginData(prev => ({ 
                  ...prev, 
                  username: userData.username 
                }));
                
                // CRITICAL: Force re-render to ensure UI shows correct state
                console.log('✅ DEVICE BINDING FIX: Username set in both boundUsername and loginData');
                console.log('✅ DEVICE BINDING FIX: boundUsername =', userData.username);
                console.log('✅ DEVICE BINDING FIX: loginData.username will be =', userData.username);
                
                console.log('✅ NATIVE DEVICE BINDING SUCCESS:');
                console.log('✅ Device bound to user:', userData.username);
                console.log('✅ Username auto-filled in login data');
                console.log('✅ hasDeviceBinding state set to true');
                console.log('✅ User should only see password field');
              } else {
                console.error('❌ NATIVE DEVICE BINDING ERROR: Failed to fetch user data');
                console.error('❌ Response status:', response.status);
                console.error('❌ Response text:', await response.text());
                
                // FALLBACK: Reset device binding if user fetch fails
                setHasDeviceBinding(false);
              }
            } catch (error) {
              console.error('❌ NATIVE DEVICE BINDING ERROR: Failed to fetch bound user data:', error);
              // FALLBACK: Reset device binding on fetch error
              setHasDeviceBinding(false);
            }
          } else {
            console.error('❌ NATIVE DEVICE BINDING ERROR: No bound user ID found despite device being bound');
            console.error('❌ This indicates corrupted device binding data');
            // FALLBACK: Reset device binding if user ID is missing
            setHasDeviceBinding(false);
          }
        } else {
          console.log('ℹ️ NATIVE DEVICE BINDING: Device has no binding - showing full registration options'); 
        }
      } catch (error) {
        console.error('❌ NATIVE DEVICE BINDING CRITICAL ERROR:', error);
        setHasDeviceBinding(false);
      }
    };

    // Only check on native platforms where device binding is active
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Native platform detected - checking device binding');
      checkDeviceBinding();
    } else {
      console.log('🌐 Web platform - device binding disabled');
    }
  }, []); // Only run once on mount - device binding persists after logout

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL FIX: For device-bound users, username is already set in loginData by device binding check
    // For non-bound users, validate both username and password  
    const effectiveUsername = loginData.username; // Always use loginData.username since it's set by device binding
    
    console.log('🔍 DEVICE BINDING LOGIN VALIDATION:', {
      hasDeviceBinding,
      boundUsername,
      loginDataUsername: loginData.username,
      effectiveUsername,
      passwordProvided: !!loginData.password,
      passwordLength: loginData.password?.length || 0,
      passwordNonEmpty: loginData.password && loginData.password.trim() !== '',
      loginDataSet: !!loginData.username,
      rawLoginData: JSON.stringify(loginData)
    });
    
    // CRITICAL DEBUG: Enhanced validation with detailed native debugging
    console.log('🚨 NATIVE LOGIN VALIDATION - COMPREHENSIVE CHECK:');
    console.log('🚨 effectiveUsername:', effectiveUsername);
    console.log('🚨 effectiveUsername type:', typeof effectiveUsername);
    console.log('🚨 effectiveUsername length:', effectiveUsername?.length);
    console.log('🚨 effectiveUsername trimmed:', effectiveUsername?.trim());
    console.log('🚨 hasDeviceBinding:', hasDeviceBinding);
    console.log('🚨 boundUsername:', boundUsername);
    console.log('🚨 loginData:', JSON.stringify(loginData, null, 2));
    console.log('🚨 Platform check:', Capacitor.getPlatform());
    console.log('🚨 Is native platform:', Capacitor.isNativePlatform());
    
    if (!effectiveUsername || effectiveUsername.trim() === '') {
      console.error('🚨 NATIVE LOGIN FAILED: No effective username found');
      console.error('🚨 DETAILED STATE DUMP:');
      console.error('🚨 - hasDeviceBinding:', hasDeviceBinding);
      console.error('🚨 - boundUsername:', boundUsername);
      console.error('🚨 - loginData.username:', loginData.username);
      console.error('🚨 - loginData full:', JSON.stringify(loginData));
      
      // ENHANCED: Different error messages based on device binding state
      if (hasDeviceBinding && boundUsername) {
        console.error('🚨 CRITICAL BUG: Device is bound but username not set in loginData');
        // CRITICAL FIX: Force set the username if we have boundUsername but loginData.username is empty
        if (boundUsername && !loginData.username) {
          console.log('🔧 EMERGENCY FIX: Forcing username from boundUsername');
          console.log('🔧 EMERGENCY FIX: Setting', boundUsername, 'as username');
          setLoginData(prev => ({ ...prev, username: boundUsername }));
          // Trigger re-render with fixed data - user can try login again
          return;
        }
        
        notify({
          title: "Device Binding Error",
          description: "Your device is bound but username sync failed. Restarting app may help.",
          variant: "destructive",
        });
      } else if (hasDeviceBinding && !boundUsername) {
        console.error('🚨 CRITICAL BUG: Device claims to be bound but no bound username found');
        notify({
          title: "Corrupted Device Binding",
          description: "Device binding data is corrupted. Please use account switcher to reset.",
          variant: "destructive",
        });
      } else {
        // Regular case - no device binding, user needs to enter username
        notify({
          title: "Username required",
          description: "Please enter your username to continue",
          variant: "destructive",
        });
      }
      return;
    }
    
    if (!loginData.password || loginData.password.trim() === '') {
      notify({
        title: "Password required", 
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('✅ Attempting login with username:', effectiveUsername);
      // Add saveBiometric flag for password logins to automatically enable biometric auth
      await loginMutation.mutateAsync({
        username: effectiveUsername, // Use the effective username (bound or manually entered)
        password: loginData.password,
        saveBiometric: true // Always save credentials for biometric auth after successful password login
      });
    } catch (error: any) {
      notify({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    }
  };

  const handleBiometricLogin = async () => {
    try {
      console.log('Starting biometric authentication...');
      console.log('Biometric state:', biometricState);
      
      // Extra safety check before calling authenticateWithBiometrics
      if (!authenticateWithBiometrics) {
        console.error('authenticateWithBiometrics function not available');
        notify({
          title: "Service Unavailable",
          description: "Biometric service is not available",
          variant: "destructive",
        });
        return;
      }
      
      const success = await authenticateWithBiometrics();
      
      if (!success) {
        console.log('Biometric authentication returned false');
        notify({
          title: "Authentication Failed",
          description: "Biometric authentication was not successful",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = "Please try again";
      if (error.message?.includes('cancelled') || error.message?.includes('cancel')) {
        errorMessage = "Authentication was cancelled";
      } else if (error.message?.includes('not available')) {
        errorMessage = "Biometric authentication is not available";
      } else if (error.message?.includes('no credentials')) {
        errorMessage = "Please sign in with your password first to enable biometric login";
      }
      
      notify({
        title: "Biometric Authentication Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.username || !registerData.email || !registerData.password) {
      notify({
        title: "Please fill in all fields",
        description: "Username, email and password are required",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      notify({
        title: "Passwords don't match",
        description: "Please ensure both password fields are identical",
        variant: "destructive",
      });
      return;
    }

    const userData = {
      username: registerData.username,
      fullName: registerData.fullName || registerData.username,
      email: registerData.email,
      password: registerData.password
    };

    if (registerData.joinPremium) {
      // Native mobile app - always use RevenueCat for premium membership
        try {
          // Clear previous debug steps and show debug display
          setDebugSteps([]);
          setShowDebug(true);
          
          // First register the user account and login automatically
          addDebugStep('Account Registration', 'pending', 'Creating new Bean Stalker account...');
          console.log('🚀 Starting premium membership registration with payment...');
          const response = await apiRequest('POST', '/api/register-with-membership', userData);
          
          if (response.ok) {
            const result = await response.json();
            const newUser = result.user;
            addDebugStep('Account Registration', 'success', `Account created with ID: ${newUser.id}`);
            
            // Automatically login the new user to establish session
            addDebugStep('User Login', 'pending', 'Logging in to establish session...');
            console.log('🔐 Logging in new user for RevenueCat purchase...');
            await loginMutation.mutateAsync({
              username: userData.username,
              password: userData.password
            });
            addDebugStep('User Login', 'success', 'Login successful - session established');
            
            notify({
              title: "Account Created",
              description: "Processing your premium membership payment...",
            });
            
            // Small delay to ensure login session is established
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // CRITICAL: Clean RevenueCat setup with authenticated user's ID for native payment popup
            addDebugStep('RevenueCat Setup', 'pending', `Setting up RevenueCat with user ID: ${newUser.id}`);
            console.log('💳 MEMBERSHIP PAYMENT: Setting up RevenueCat with authenticated user ID:', newUser.id);
            
            // Import RevenueCat directly for clean setup
            const { Purchases } = await import('@revenuecat/purchases-capacitor');
            
            // Force logout to clear any cached state
            addDebugStep('RevenueCat Cleanup', 'pending', 'Clearing RevenueCat cache...');
            try {
              await Purchases.logOut();
              console.log('💳 MEMBERSHIP PAYMENT: RevenueCat logout completed');
            } catch (logoutError) {
              console.log('💳 MEMBERSHIP PAYMENT: Logout error (expected for first user):', logoutError);
            }
            addDebugStep('RevenueCat Cleanup', 'success', 'Cache cleared');
            
            // Wait for logout to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Login with the new user ID
            addDebugStep('RevenueCat Login', 'pending', `Logging in as user ${newUser.id}...`);
            const loginResult = await Purchases.logIn({ appUserID: newUser.id.toString() });
            console.log('💳 MEMBERSHIP PAYMENT: Login result:', {
              created: loginResult.created,
              userID: loginResult.customerInfo.originalAppUserId
            });
            
            if (loginResult.customerInfo.originalAppUserId === newUser.id.toString()) {
              addDebugStep('RevenueCat Login', 'success', `✅ Logged in as user ${newUser.id}`);
            } else {
              addDebugStep('RevenueCat Login', 'error', `Login failed - got user ${loginResult.customerInfo.originalAppUserId}`);
              throw new Error('RevenueCat login verification failed');
            }
            
            // CRITICAL: Verify IAP service availability for native payment popup
            const isIAPAvailable = iapService.isAvailable();
            console.log('💳 MEMBERSHIP PAYMENT: IAP service availability check:', isIAPAvailable);
            if (!isIAPAvailable) {
              console.error('💳 MEMBERSHIP PAYMENT ERROR: IAP service not available for native payments');
              throw new Error('In-app purchase service not available. Please ensure you are on a native mobile device.');
            }
            
            // CRITICAL: Longer delay to ensure RevenueCat user change is fully processed
            console.log('💳 MEMBERSHIP PAYMENT: Waiting for RevenueCat user change to complete...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // CRITICAL: Verify products are loaded before attempting purchase
            console.log('💳 MEMBERSHIP PAYMENT: Verifying products are loaded for native payment popup...');
            const availableProducts = await iapService.getAvailableProducts();
            console.log('💳 MEMBERSHIP PAYMENT: Available products count:', availableProducts.length);
            console.log('💳 MEMBERSHIP PAYMENT: Available product IDs:', availableProducts.map(p => p.id));
            
            const membershipProduct = availableProducts.find(p => p.id === 'com.beanstalker.membership69');
            if (!membershipProduct) {
              console.error('💳 MEMBERSHIP PAYMENT ERROR: Membership product not found');
              console.error('💳 MEMBERSHIP PAYMENT ERROR: This usually means:');
              console.error('💳 MEMBERSHIP PAYMENT ERROR:   1. App Store Connect product not "Ready to Submit"');
              console.error('💳 MEMBERSHIP PAYMENT ERROR:   2. RevenueCat offerings not configured');
              console.error('💳 MEMBERSHIP PAYMENT ERROR:   3. Bundle ID mismatch');
              console.error('💳 MEMBERSHIP PAYMENT ERROR:   4. Network connectivity issues');
              throw new Error('Membership product not available for purchase. Please check your internet connection and try again.');
            }
            console.log('💳 MEMBERSHIP PAYMENT: Membership product verified:', {
              id: membershipProduct.id,
              title: membershipProduct.title,
              price: membershipProduct.price
            });
            
            // Verify customer ID is correct
            addDebugStep('Customer ID Check', 'pending', 'Final verification...');
            const { customerInfo } = await Purchases.getCustomerInfo();
            const finalCustomerId = customerInfo.originalAppUserId;
            const expectedCustomerId = newUser.id.toString();
            
            console.log('💳 MEMBERSHIP PAYMENT: Final verification - Customer ID:', finalCustomerId);
            console.log('💳 MEMBERSHIP PAYMENT: Expected Customer ID:', expectedCustomerId);
            
            if (finalCustomerId !== expectedCustomerId) {
              addDebugStep('Customer ID Check', 'error', `MISMATCH: Got ${finalCustomerId}, expected ${expectedCustomerId}`);
              throw new Error(`Customer ID mismatch: ${finalCustomerId} vs ${expectedCustomerId}`);
            }
            
            addDebugStep('Customer ID Check', 'success', `✅ Verified: Customer ID ${finalCustomerId}`);

            // CRITICAL: Launch native payment popup
            console.log('💳 MEMBERSHIP PAYMENT: Starting native Apple Pay popup...');
            console.log('💳 MEMBERSHIP PAYMENT: Product ID:', 'com.beanstalker.membership69');
            console.log('💳 MEMBERSHIP PAYMENT: Expected: Native payment interface should appear');
            
            addDebugStep('Membership Purchase', 'pending', 'Launching native payment popup...');
            const purchaseResult = await iapService.purchaseProduct('com.beanstalker.membership69');
            console.log('💳 MEMBERSHIP PAYMENT: Purchase completed with result:', purchaseResult);
            
            if (purchaseResult.success) {
              addDebugStep('Membership Purchase', 'success', 'Payment completed successfully!');
              addDebugStep('Registration Complete', 'success', '🎉 Premium membership activated! Debug will close in 8 seconds...');
              
              // Reload user data and invalidate cache
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              notify({
                title: "Premium Membership Activated!",
                description: "Your account has been created with $69 credit. Welcome to Bean Stalker Premium!",
              });
              
              // Keep debug visible for 8 seconds so user can see the results
              setTimeout(() => {
                setShowDebug(false);
              }, 8000);
              
            } else {
              addDebugStep('Membership Purchase', 'error', `Payment failed: ${purchaseResult.error || 'Unknown error'}`);
              notify({
                title: "Payment Warning",
                description: "Account created but payment failed. You can retry payment from the Buy Credits page.",
                variant: "destructive",
              });
            }
          } else {
            throw new Error('Registration failed');
          }
        } catch (error: any) {
          addDebugStep('Registration Process', 'error', `Failed: ${error.message || 'Unknown error'}`);
          console.error('Premium membership process failed:', error);
          notify({
            title: "Registration Failed",
            description: error.message || "Please try again or contact support.",
            variant: "destructive",
          });
          
          // Keep debug visible on error so user can see what went wrong
          // Don't auto-hide debug display on errors
        }

    } else {
      // Regular registration without premium membership
      try {
        await registerMutation.mutateAsync(userData);
        notify({
          title: "Account created successfully!",
          description: "Welcome to Bean Stalker!",
        });
      } catch (error: any) {
        notify({
          title: "Registration failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="relative overflow-hidden iphone-fullscreen" style={{ 
      backgroundColor: '#1a3b29',
      height: '-webkit-fill-available',
      width: '100vw',
      margin: 0,
      padding: 0 
    }}>
      {/* White background section at top */}
      <div className="w-full bg-white pt-safe pb-4"></div>
      
      {/* Bean Stalker Logo - full width stretching across entire page */}
      <div className="relative z-10 pb-0">
        <div className="w-full">
          <img 
            src="/bean-stalker-logo-new.png" 
            alt="Bean Stalker Logo" 
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      {/* Login Form - positioned in green background */}
      <div className="relative z-10 pt-4">
        <div className="px-12 text-center">
          <div className="max-w-sm mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              {isLogin ? "Welcome back!" : "Become a Member"}
            </h2>
            
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input - hidden if device has binding, auto-filled */}
              {!hasDeviceBinding && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                  />
                </div>
              )}
              
              {/* Show bound username for device-bound login */}
              {hasDeviceBinding && boundUsername && (
                <div className="text-center p-4 bg-white/10 rounded-full border border-white/40">
                  <div className="flex items-center justify-center space-x-2">
                    <User className="h-5 w-5 text-green-400" />
                    <span className="text-white font-medium">{boundUsername}</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">Device Account</p>
                </div>
              )}

              {/* Password Input - exact styling from reference */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => {
                    console.log('🔍 Password field changed:', e.target.value.length, 'characters');
                    setLoginData({ ...loginData, password: e.target.value });
                  }}
                  className="w-full pl-12 pr-12 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Login Button - exact brown/amber color from reference */}
              <Button
                type="submit"
                className="w-full py-5 text-white font-semibold rounded-full text-lg shadow-lg hover:opacity-90"
                style={{ backgroundColor: '#bb8c69' }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Username Input */}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                  />
                </div>

                {/* Full Name Input */}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                    className="w-full pl-12 pr-4 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                  />
                </div>

                {/* Email Input */}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                  />
                </div>

                {/* Password Input */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Confirm Password Input */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                  />
                </div>

                {/* Premium Membership Option */}
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-white/40 bg-white/10">
                  <Checkbox
                    checked={registerData.joinPremium}
                    onCheckedChange={(checked) => setRegisterData({ ...registerData, joinPremium: Boolean(checked) })}
                    className="border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 mt-1"
                  />
                  <div className="flex-1">
                    <label className="flex items-center space-x-2 text-sm font-medium text-white cursor-pointer">
                      <CreditCard className="h-4 w-4 text-green-400" />
                      <span>Premium Membership - AUD$69</span>
                    </label>
                    <p className="text-xs text-gray-300 mt-1">
                      Get instant AUD$69 credit plus exclusive benefits and priority ordering.
                    </p>
                  </div>
                </div>

                {/* Register Button */}
                <Button
                  type="submit"
                  className="w-full py-5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-full text-lg shadow-lg"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating Account..." : 
                   registerData.joinPremium ? "Join Premium - AUD$69" : "Create Account"}
                </Button>
              </form>
            )}

            {/* Links section - exact spacing and styling */}
            <div className="text-center mt-6 space-y-2">
              {isLogin && (
                <button className="text-white/90 hover:text-white text-sm">
                  Forgot password?
                </button>
              )}
              <div className="text-white/90 text-sm">
                {isLogin ? (
                  <>
                    {/* Hide "Become a Member" if device already has a bound account */}
                    {!hasDeviceBinding && (
                      <>
                        New user?{" "}
                        <button 
                          onClick={() => setIsLogin(!isLogin)}
                          className="text-white hover:underline font-medium"
                        >
                          Become a Member
                        </button>
                      </>
                    )}
                    {hasDeviceBinding && (
                      <div className="text-white/70 text-xs">
                        This device is already registered to an account.
                        <br />
                        Use "Switch Account" in Profile to change accounts.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button 
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-white hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Divider and Biometric - only for login */}
            {isLogin && (
              <>
                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-white/40" />
                  <span className="px-6 text-white/80 text-sm font-medium">OR</span>
                  <div className="flex-1 h-px bg-white/40" />
                </div>

                {/* Biometric Authentication with dynamic text based on device */}
                {biometricState.isAvailable && !biometricState.isLoading && (
                  <Button
                    onClick={handleBiometricLogin}
                    disabled={isAuthenticating || biometricState.isLoading}
                    className="w-full py-5 bg-green-700 hover:bg-green-800 border border-green-600 text-white font-medium rounded-full text-base flex items-center justify-center gap-3 shadow-lg"
                  >
                    <Fingerprint className="h-5 w-5" />
                    {isAuthenticating 
                      ? "Authenticating..." 
                      : biometricState.isLoading
                      ? "Checking availability..."
                      : `Sign in with ${(() => {
                          try {
                            return getBiometricDisplayName(biometricState.biometricType || 'biometric');
                          } catch (error) {
                            console.error('Error getting biometric display name:', error);
                            return 'Biometric Authentication';
                          }
                        })()}`
                    }
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Debug Display for Membership Registration */}
      <MembershipDebugDisplay 
        debugSteps={debugSteps}
        isVisible={showDebug}
        onClose={() => setShowDebug(false)}
      />
    </div>
  );
}