import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBiometricAuth } from "@/hooks/use-biometric-auth";
// import { useIAP } from "@/hooks/use-iap"; // Removed IAP import
import { iapService } from "@/services/iap-service";
import { biometricService } from "@/services/biometric-service";

import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNativeNotification } from "@/services/native-notification-service";
import { User, Lock, Eye, EyeOff, Fingerprint, CreditCard, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { deviceService } from "@/services/device-service";



export default function AuthPageMobile() {
  const { user, loginMutation } = useAuth();
  const { notify } = useNativeNotification();
  // Removed IAP functionality - now using Square payments for membership

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
  const [isSettingUpPayment, setIsSettingUpPayment] = useState(false);
  
  const [registerData, setRegisterData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    joinPremium: true // Premium membership enabled by default
  });


  // Load last used username for convenience and handle URL parameters
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

    // Check for URL parameters (new account from payment)
    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const username = urlParams.get('username');
      const newAccount = urlParams.get('newAccount');
      
      if (username && newAccount === 'true') {
        setLoginData(prev => ({ ...prev, username }));
        setIsLogin(true);
        notify({
          title: "Account Created Successfully!",
          description: `Welcome ${username}! Your premium membership is active. Please log in with your password.`,
        });
        
        // Clean URL after processing
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    loadLastUsername();
    checkUrlParams();
  }, [notify]);
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
      console.log('🔐 UI: Starting biometric authentication...');
      console.log('🔐 UI: Biometric state:', biometricState);
      console.log('🔐 UI: Is authenticating:', isAuthenticating);
      
      // Prevent multiple simultaneous authentication attempts
      if (isAuthenticating) {
        console.log('🔐 UI: Authentication already in progress, ignoring request');
        return;
      }
      
      // Enhanced safety checks at UI level
      if (!authenticateWithBiometrics || typeof authenticateWithBiometrics !== 'function') {
        console.error('🔐 UI: authenticateWithBiometrics function not available');
        notify({
          title: "Service Unavailable",
          description: "Biometric service is not properly initialized",
          variant: "destructive",
        });
        return;
      }
      
      // Check basic requirements before attempting authentication
      if (!biometricState.isAvailable) {
        console.log('🔐 UI: Biometric authentication not available');
        notify({
          title: "Biometric Authentication Unavailable",
          description: "Please use your username and password",
          variant: "destructive",
        });
        return;
      }
      
      // CRITICAL: Real-time credential check to prevent crashes
      console.log('🔐 UI: Performing real-time credential verification...');
      const hasRealTimeCredentials = await biometricService.hasCredentials();
      console.log('🔐 UI: Real-time credential check result:', hasRealTimeCredentials);
      
      if (!biometricState.hasStoredCredentials || !hasRealTimeCredentials) {
        console.log('🔐 UI: No stored credentials (state or real-time check failed)');
        notify({
          title: "No Biometric Login Set Up",
          description: "Sign in with password first to enable biometric login",
          variant: "destructive",
        });
        return;
      }
      
      console.log('🔐 UI: All checks passed, calling authentication function...');
      
      // Wrap the authentication call in a safety net
      const authPromise = new Promise<boolean>((resolve, reject) => {
        authenticateWithBiometrics()
          .then(resolve)
          .catch(reject);
      });
      
      // Add UI-level timeout (shorter than hook timeout)
      const uiTimeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('UI timeout - authentication took too long')), 60000)
      );
      
      const success = await Promise.race([authPromise, uiTimeoutPromise]);
      console.log('🔐 UI: Authentication result:', success);
      
      if (!success) {
        console.log('🔐 UI: Biometric authentication returned false');
        notify({
          title: "Authentication Failed",
          description: "Biometric authentication was not successful",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('🔐 UI: Biometric authentication error:', error);
      console.error('🔐 UI: Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      let errorMessage = "Please try again";
      let errorTitle = "Authentication Failed";
      
      if (error?.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('cancelled') || msg.includes('cancel')) {
          errorMessage = "Authentication was cancelled";
          errorTitle = "Authentication Cancelled";
        } else if (msg.includes('timeout')) {
          errorMessage = "Authentication timed out. Please try again.";
          errorTitle = "Authentication Timeout";
        } else if (msg.includes('not available') || msg.includes('unavailable')) {
          errorMessage = "Biometric authentication is not available";
        } else if (msg.includes('no credentials')) {
          errorMessage = "Please sign in with your password first to enable biometric login";
        } else if (msg.includes('service') || msg.includes('not properly initialized')) {
          errorMessage = "Biometric service error. Please restart the app and try again.";
        }
      }
      
      notify({
        title: errorTitle,
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

    setIsSettingUpPayment(true);
    try {
      const response = await fetch('/api/square/create-anonymous-membership-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 6900,
          description: 'Premium Membership - $69.00',
          userData: userData
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment');
      }
      
      const data = await response.json();
      window.location.href = data.url;
      
    } catch (error: any) {
      setIsSettingUpPayment(false);
      notify({
        title: "Payment Setup Failed", 
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative overflow-auto min-h-screen" style={{ 
      backgroundColor: '#1a3b29',
      width: '100vw',
      margin: 0,
      padding: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      minHeight: '100vh'
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
                  className="w-full pl-12 pr-16 py-5 bg-transparent border-2 border-white/40 rounded-full text-white placeholder:text-gray-300 focus:border-white/60 focus:ring-0 focus:outline-none focus:shadow-none text-base"
                />
                {loginData.username && (
                  <button
                    type="button"
                    onClick={async () => {
                      // Clear the input field
                      setLoginData({ ...loginData, username: "" });
                      setLastUsername("");
                      
                      // Clear stored username from preferences
                      try {
                        const { Preferences } = await import('@capacitor/preferences');
                        await Preferences.remove({ key: 'bean-stalker-last-username' });
                      } catch (error) {
                        console.error('Failed to clear stored username:', error);
                      }
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    data-testid="button-clear-username"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                {lastUsername && lastUsername === loginData.username && !loginData.username.includes('') && (
                  <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
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

                {/* Account Creation Notice - Payment Required */}
                <div className="p-4 rounded-lg border border-white/40 bg-white/10">
                  <div className="flex items-center space-x-2 text-sm font-medium text-white mb-2">
                    <CreditCard className="h-4 w-4 text-green-400" />
                    <span>Account Creation - AUD$69 Required</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    All accounts require payment verification. You'll receive AUD$69 in app credits to start ordering.
                  </p>
                  
                  {/* Optional Premium Benefits */}
                  <div className="flex items-start space-x-3 mt-3">
                    <Checkbox
                      checked={registerData.joinPremium}
                      onCheckedChange={(checked) => setRegisterData({ ...registerData, joinPremium: Boolean(checked) })}
                      className="border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 mt-1"
                    />
                    <div className="flex-1">
                      <label className="text-xs font-medium text-white cursor-pointer">
                        Include Premium Benefits
                      </label>
                      <p className="text-xs text-gray-300 mt-1">
                        Priority ordering, exclusive offers, and notifications.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Register Button */}
                <Button
                  type="submit"
                  className="w-full py-5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-full text-lg shadow-lg"
                  disabled={isSettingUpPayment}
                >
                  {isSettingUpPayment ? "Setting up Payment..." : "Pay AUD$69 & Create Account"}
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

            {/* Divider and Biometric - only for login AND if user has previously set up biometrics */}
            {isLogin && biometricState.hasStoredCredentials && (
              <>
                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-white/40" />
                  <span className="px-6 text-white/80 text-sm font-medium">OR</span>
                  <div className="flex-1 h-px bg-white/40" />
                </div>

                {/* Biometric Authentication - Temporarily disabled */}
                {biometricState.isAvailable && !biometricState.isLoading && biometricState.hasStoredCredentials && (
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