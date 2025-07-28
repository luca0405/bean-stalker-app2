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

  // Check for existing device binding on component mount
  useEffect(() => {
    const checkDeviceBinding = async () => {
      try {
        console.log('🔍 Checking device binding status...');
        const isDeviceBound = await deviceService.isDeviceBound();
        console.log('🔍 Device bound result:', isDeviceBound);
        setHasDeviceBinding(isDeviceBound);
        
        if (isDeviceBound) {
          // Get the bound user's username
          const boundUserId = await deviceService.getBoundUserId();
          console.log('🔍 Bound user ID:', boundUserId);
          
          if (boundUserId) {
            try {
              // Fetch user data to get username
              const response = await fetch(`/api/users/${boundUserId}`);
              if (response.ok) {
                const userData = await response.json();
                setBoundUsername(userData.username);
                // Only update username, preserve password
                setLoginData(prev => ({ 
                  ...prev, 
                  username: userData.username 
                }));
                console.log('✅ Device bound to user:', userData.username);
                console.log('✅ Device bound to user:', userData.username);
                console.log('✅ Username field should be HIDDEN');
                console.log('✅ Become a Member should be HIDDEN');
              } else {
                console.error('❌ Failed to fetch user data, response:', response.status);
              }
            } catch (error) {
              console.error('❌ Failed to fetch bound user data:', error);
            }
          } else {
            console.log('❌ No bound user ID found');
          }
        } else {
          console.log('ℹ️ Device has no binding - showing full registration options');
        }
      } catch (error) {
        console.error('❌ Failed to check device binding:', error);
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
    
    // For device-bound users, username should already be set, only validate password
    // For non-bound users, validate both username and password
    const effectiveUsername = hasDeviceBinding ? boundUsername : loginData.username;
    
    console.log('🔍 Login validation:', {
      hasDeviceBinding,
      boundUsername,
      loginDataUsername: loginData.username,
      effectiveUsername,
      passwordProvided: !!loginData.password,
      passwordLength: loginData.password?.length || 0,
      passwordValue: loginData.password || 'EMPTY',
      rawLoginData: JSON.stringify(loginData)
    });
    
    if (!effectiveUsername || !loginData.password || loginData.password.trim() === '') {
      console.log('❌ Login validation failed - missing fields:', {
        effectiveUsername: !!effectiveUsername,
        passwordProvided: !!loginData.password,
        passwordTrimmed: loginData.password?.trim() || 'EMPTY'
      });
      notify({
        title: "Please fill in all fields",
        description: hasDeviceBinding ? "Password is required" : "Username and password are required",
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
          // First register the user account and login automatically
          console.log('🚀 Starting premium membership registration with payment...');
          const response = await apiRequest('POST', '/api/register-with-membership', userData);
          
          if (response.ok) {
            const result = await response.json();
            const newUser = result.user;
            
            // Automatically login the new user to establish session
            console.log('🔐 Logging in new user for RevenueCat purchase...');
            await loginMutation.mutateAsync({
              username: userData.username,
              password: userData.password
            });
            
            notify({
              title: "Account Created",
              description: "Processing your premium membership payment...",
            });
            
            // Small delay to ensure login session is established
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Set RevenueCat user ID and purchase the membership product
            console.log('💳 Setting RevenueCat user ID for new user before purchase:', newUser.id);
            await iapService.setUserID(newUser.id.toString());
            
            // Extra delay to ensure RevenueCat user change is processed
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('💳 Processing membership payment for authenticated user...');
            console.log('💳 Triggering native payment popup for com.beanstalker.membership69');
            const purchaseResult = await purchaseProduct('com.beanstalker.membership69');
            
            if (purchaseResult.success) {
              // Reload user data and invalidate cache
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              notify({
                title: "Premium Membership Activated!",
                description: "Your account has been created with $69 credit. Welcome to Bean Stalker Premium!",
              });
            } else {
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
          console.error('Premium membership process failed:', error);
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
    </div>
  );
}