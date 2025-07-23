import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBiometricAuth } from "@/hooks/use-biometric-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Eye, EyeOff, Fingerprint, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AuthPageMobile() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const {
    biometricState,
    authenticateWithBiometrics,
    isAuthenticating
  } = useBiometricAuth();

  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  
  const [registerData, setRegisterData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    joinPremium: true // Premium membership enabled by default
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.username || !loginData.password) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await loginMutation.mutateAsync(loginData);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    }
  };

  const handleBiometricLogin = async () => {
    try {
      await authenticateWithBiometrics();
    } catch (error: any) {
      toast({
        title: "Biometric authentication failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.username || !registerData.email || !registerData.password) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username: registerData.username,
        fullName: registerData.fullName || registerData.username,
        email: registerData.email,
        password: registerData.password
      });
      
      toast({
        title: "Account created successfully!",
        description: registerData.joinPremium ? "Your premium membership is active!" : "Welcome to Bean Stalker!",
      });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#1a3b29' }}>
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
              {/* Username Input - exact styling from reference */}
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

                {/* Biometric Authentication - exact styling from reference */}
                {biometricState.isAvailable && (
                  <Button
                    onClick={handleBiometricLogin}
                    disabled={isAuthenticating}
                    className="w-full py-5 bg-green-700 hover:bg-green-800 border border-green-600 text-white font-medium rounded-full text-base flex items-center justify-center gap-3 shadow-lg"
                  >
                    <Fingerprint className="h-5 w-5" />
                    {isAuthenticating 
                      ? "Authenticating..." 
                      : "Sign in with Biometric authentication"
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