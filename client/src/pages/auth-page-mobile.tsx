import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBiometricAuth } from "@/hooks/use-biometric-auth";
import { useIAP } from "@/hooks/use-iap";
import { iapService } from "@/services/iap-service";

import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNativeNotification } from "@/services/native-notification-service";
import { User, Lock, Eye, EyeOff, Fingerprint, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { deviceService } from "@/services/device-service";



export default function AuthPageMobile() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { notify } = useNativeNotification();
  const { purchaseProduct, isAvailable: iapAvailable, isLoading: iapLoading } = useIAP();

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
  


  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [lastUsername, setLastUsername] = useState("");
  
  const [registerData, setRegisterData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    joinPremium: true // Premium membership enabled by default
  });


  // Load last used username for convenience
  useEffect(() => {
    const loadLastUsername = async () => {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key: 'bean-stalker-last-username' });
        
        if (result.value) {
          setLastUsername(result.value);
          setLoginData(prev => ({ 
            ...prev, 
            username: result.value || "" 
          }));
        }
      } catch (error) {
        console.error('Failed to load last username:', error);
      }
    };

    loadLastUsername();
  }, []);
  if (user) {
    // Check if payment is being processed to prevent redirect
    const isProcessingPayment = sessionStorage.getItem('payment-processing') === 'true';
    if (!isProcessingPayment) {
      return <Redirect to="/" />;
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.username || !loginData.password) {
      notify({
        title: "Please fill in all fields",
        description: "Both username and password are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save username for future convenience
      if (loginData.username) {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ 
          key: 'bean-stalker-last-username', 
          value: loginData.username 
        });
      }

      await loginMutation.mutateAsync({
        username: loginData.username,
        password: loginData.password,
        saveBiometric: true // Enable biometric auth after successful login
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
      username: registerData.username?.trim(),
      fullName: registerData.fullName?.trim() || registerData.username?.trim(),
      email: registerData.email?.trim(),
      password: registerData.password
    };

    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
      notify({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      notify({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (registerData.joinPremium) {
      // Bean Stalker is exclusively a native mobile app
      
      // Native mobile app - always use RevenueCat for premium membership
        try {
          console.log('🚀 Starting premium membership registration with payment...');
          // Set payment processing flag to prevent navigation
          sessionStorage.setItem('payment-processing', 'true');
          
          const response = await apiRequest('POST', '/api/register-with-membership', userData);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
            throw new Error(errorData.message || 'Registration failed');
          }
          
          if (response.ok) {
            const result = await response.json();
            const newUser = result.user;
            // Manual login after registration to establish proper session
            console.log('🔐 Logging in new user for RevenueCat purchase...');
            const loginResponse = await apiRequest('POST', '/api/login', {
              username: userData.username,
              password: userData.password
            });
            
            if (!loginResponse.ok) {
              const errorData = await loginResponse.json().catch(() => ({ message: 'Login failed' }));
              throw new Error(errorData.message || 'Failed to login after registration');
            }
            
            // Set user data in React Query cache
            const loginData = await loginResponse.json();
            queryClient.setQueryData(["/api/user"], loginData);
            console.log('✅ User session established:', loginData.username);
            
            notify({
              title: "Account Created",
              description: "Processing your premium membership payment...",
            });
            
            // Small delay to ensure login session is established
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // STEP 2: Native Payment Popup - RevenueCat setup
            console.log('💳 MEMBERSHIP PAYMENT: Setting up RevenueCat with authenticated user ID:', newUser.id);
            
            try {
              console.log('💳 MEMBERSHIP: Using working IAP service (same as credit purchases)');
              
              // Use the SAME working IAP service that successfully processes credit purchases
              const { IAPService } = await import('@/services/iap-service');
              const iapService = new IAPService();
              
              // Initialize with the correct user ID (same approach as working credit purchases)
              const initSuccess = await iapService.initializeWithUserID(newUser.id.toString());
              if (!initSuccess) {
                throw new Error('Failed to initialize payment system');
              }
              
              console.log('💳 MEMBERSHIP: IAP service initialized successfully');
              
              // Purchase the membership using the SAME method as credit purchases
              const membershipProductId = 'com.beanstalker.membership69';
              const purchaseResult = await iapService.purchaseProduct(membershipProductId);
              
              if (!purchaseResult.success) {
                throw new Error(purchaseResult.error || 'Membership purchase failed');
              }
              
              console.log('✅ MEMBERSHIP SUCCESSFUL! Payment completed using working IAP service.');
              
              console.log('✅ MEMBERSHIP: Apple Pay popup completed successfully!');
              console.log('✅ Transaction ID:', purchaseResult.transactionId);
              
              // Wait for credits to be processed by webhook (up to 10 seconds)
              let creditsAdded = false;
              for (let i = 0; i < 20; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if credits have been added
                const updatedUserResponse = await fetch('/api/user');
                if (updatedUserResponse.ok) {
                  const updatedUser = await updatedUserResponse.json();
                  if (updatedUser.credits >= 69) {
                    creditsAdded = true;
                    console.log('✅ Credits confirmed added:', updatedUser.credits);
                    break;
                  }
                }
              }
              
              // Reload user data
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              
              if (creditsAdded) {
                notify({
                  title: "Premium Membership Activated!",
                  description: "$69 credits added to your account. Welcome to Bean Stalker Premium!",
                });
              } else {
                notify({
                  title: "Payment Processed",
                  description: "Your payment was successful. Credits will appear shortly.",
                });
              }
              
              // Clear payment processing flag and redirect to homepage
              sessionStorage.removeItem('payment-processing');
              
              // Delay before navigation to ensure everything is complete
              setTimeout(() => {
                window.location.href = '/';
              }, 2000);
              
            } catch (error: any) {
              console.error('💳 Apple Pay failed:', error);
              
              // Enhanced error diagnosis for RevenueCat issues
              if (error.message?.includes('string did not match') || 
                  error.message?.includes('Invalid Product Identifiers') ||
                  error.message?.includes('None of the products registered')) {
                console.log('🔍 RevenueCat configuration error detected, running diagnostic...');
                
                try {
                  const { RevenueCatDiagnostic } = await import('@/services/revenuecat-diagnostic');
                  const report = await RevenueCatDiagnostic.generateReport();
                  console.log('📋 DIAGNOSTIC REPORT:\n', report);
                  
                  notify({
                    title: "Configuration Issue",
                    description: "RevenueCat setup needs attention. Check console for diagnostic report.",
                    variant: "destructive",
                  });
                } catch (diagError) {
                  console.error('Failed to run diagnostic:', diagError);
                }
              }
              
              // Clear payment processing flag on error
              sessionStorage.removeItem('payment-processing');
              
              if (error.message?.includes('cancel') || error.userCancelled) {
                notify({
                  title: "Payment Cancelled",
                  description: "You cancelled the Apple Pay popup. Account created - retry from Buy Credits page.",
                  variant: "destructive",
                });
              } else if (error.message?.includes('No RevenueCat packages')) {
                notify({
                  title: "Configuration Error",
                  description: "RevenueCat products not configured. Contact support.",
                  variant: "destructive",
                });
              } else {
                notify({
                  title: "Apple Pay Failed",
                  description: `Payment error: ${error.message}. Account created - retry from Buy Credits page.`,
                  variant: "destructive",
                });
              }
            }
          } else {
            throw new Error('Registration failed');
          }
        } catch (error: any) {
          console.error('Premium membership process failed:', error);
          // Clear payment processing flag on error
          sessionStorage.removeItem('payment-processing');
          
          notify({
            title: "Registration Failed",
            description: error.message || "Please try again or contact support.",
            variant: "destructive",
          });
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
              {/* Username Input - Always visible for flexible login */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Username"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full pl-12 pr-4 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                />
                {lastUsername && lastUsername === loginData.username && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded">Last used</span>
                  </div>
                )}
              </div>

              {/* Password Input - exact styling from reference */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
                    New user?{" "}
                    <button 
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-white hover:underline font-medium"
                    >
                      Become a Member
                    </button>

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
      

    </div>
  );
}