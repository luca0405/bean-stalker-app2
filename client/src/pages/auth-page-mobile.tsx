import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIAP } from "@/hooks/use-iap";
import { useBiometricAuth } from "@/hooks/use-biometric-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Coffee, Star, Shield, Zap, CheckCircle2, Smartphone, User, Lock, Mail, Phone, Globe, Fingerprint } from "lucide-react";

export default function AuthPageMobile() {
  console.log('AuthPageMobile: Component rendering...');
  const { user, loginMutation, registerMutation } = useAuth();
  console.log('AuthPageMobile: Auth state:', { user: !!user });
  const { purchaseProduct, isAvailable: isIAPAvailable, isLoading: iapLoading } = useIAP();
  const { toast } = useToast();
  
  const {
    biometricState,
    authenticateWithBiometrics,
    setupBiometricAuth,
    getBiometricDisplayName,
    getBiometricIcon,
    isAuthenticating
  } = useBiometricAuth();
  
  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  });
  
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phoneNumber: ""
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your username",
        variant: "destructive"
      });
      return;
    }

    if (!loginData.password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await loginMutation.mutateAsync(loginData);
      
      // After successful login, offer to setup biometric auth if available
      if (biometricState.isAvailable && !biometricState.hasStoredCredentials) {
        setTimeout(async () => {
          const shouldSetup = window.confirm(
            `Would you like to enable ${getBiometricDisplayName(biometricState.biometricType)} for faster sign-in?`
          );
          
          if (shouldSetup) {
            await setupBiometricAuth(loginData.username, loginData.password);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegisterWithMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Password Confirmation Error",
        description: "Please ensure both password fields match exactly",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    if (!registerData.username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username",
        variant: "destructive"
      });
      return;
    }

    if (!registerData.email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      toast({
        title: "Invalid Email Format",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Purchase membership via IAP
      const purchaseResult = await purchaseProduct('com.beanstalker.member');
      
      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error || 'Purchase failed');
      }

      // Step 2: Register user with purchase data
      const userData = {
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        fullName: registerData.fullName || undefined,
        phoneNumber: registerData.phoneNumber || undefined,
        isMember: true,
        membershipDate: new Date().toISOString(),
        purchaseData: purchaseResult.purchaseData
      };

      await registerMutation.mutateAsync(userData);

      toast({
        title: "Welcome to Bean Stalker!",
        description: "Your premium membership is active with AUD$69 credit",
      });

    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex flex-col">
      {/* Header Section */}
      <div className="relative text-center pt-12 pb-8 pt-safe">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <img 
            src="/bs-logo.png" 
            alt="Bean Stalker Background Logo" 
            className="w-32 h-32 mx-auto mt-4 animate-pulse opacity-30 filter brightness-0 invert"
          />
        </div>
        
        {/* Logo and branding */}
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-xl shadow-2xl">
              <img 
                src="/bs-logo.png" 
                alt="Bean Stalker Logo" 
                className="w-12 h-12 object-contain filter brightness-0 invert"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Bean Stalker
          </h1>
          <p className="text-green-300 text-lg font-medium">
            Premium Coffee Experience
          </p>
          <Badge variant="secondary" className="mt-3 bg-green-600/20 text-green-300 border-green-500/30">
            <Crown className="w-4 h-4 mr-2" />
            Mobile Exclusive
          </Badge>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 px-6 pb-8">
        <div className="max-w-md mx-auto">
          
          {/* Premium Features Showcase */}
          <div className="bg-gradient-to-r from-green-600/10 to-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="bg-green-600/20 rounded-xl p-3 mb-2 mx-auto w-fit">
                  <Zap className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-white/90 text-sm font-medium">Instant Orders</p>
              </div>
              <div className="text-center">
                <div className="bg-green-600/20 rounded-xl p-3 mb-2 mx-auto w-fit">
                  <Star className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-white/90 text-sm font-medium">VIP Service</p>
              </div>
              <div className="text-center">
                <div className="bg-green-600/20 rounded-xl p-3 mb-2 mx-auto w-fit">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-white/90 text-sm font-medium">Secure Payments</p>
              </div>
              <div className="text-center">
                <div className="bg-green-600/20 rounded-xl p-3 mb-2 mx-auto w-fit">
                  <Smartphone className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-white/90 text-sm font-medium">Mobile First</p>
              </div>
            </div>
          </div>

          {/* Auth Card */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardContent className="p-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/5 p-1">
                  <TabsTrigger 
                    value="login" 
                    className="text-white/80 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="text-white/80 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Join Premium
                  </TabsTrigger>
                </TabsList>
                
                {/* Login Tab */}
                <TabsContent value="login" className="space-y-6 mt-6">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="text"
                          placeholder="Username or Email"
                          value={loginData.username}
                          onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500 transition-all duration-200"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="password"
                          placeholder="Password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500 transition-all duration-200"
                          required
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold h-12 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Signing in...
                        </div>
                      ) : (
                        "Sign In to Bean Stalker"
                      )}
                    </Button>
                  </form>

                  {/* Face ID / Touch ID Authentication */}
                  {biometricState.isAvailable && biometricState.hasStoredCredentials && (
                    <div className="mt-6">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-slate-900 px-3 text-white/60">Or continue with</span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={authenticateWithBiometrics}
                        disabled={isAuthenticating || biometricState.isLoading}
                        className="w-full mt-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold h-12 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        {isAuthenticating ? (
                          <div className="flex items-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Authenticating...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Fingerprint className="w-5 h-5 mr-2 text-green-400" />
                            Sign in with {getBiometricDisplayName(biometricState.biometricType)}
                          </div>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Biometric Setup Hint */}
                  {biometricState.isAvailable && !biometricState.hasStoredCredentials && !biometricState.isLoading && (
                    <div className="mt-6 text-center">
                      <p className="text-white/60 text-sm">
                        💡 Sign in with your password first to enable {getBiometricDisplayName(biometricState.biometricType)} for faster access
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                {/* Registration Tab */}
                <TabsContent value="register" className="space-y-6 mt-6">
                  {/* Premium Membership Highlight */}
                  <div className="bg-gradient-to-r from-green-600/15 to-green-500/15 backdrop-blur-sm border border-green-400/30 rounded-2xl p-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-3">
                        <div className="bg-green-600/20 rounded-full p-2 mr-3">
                          <Crown className="w-6 h-6 text-green-400" />
                        </div>
                        <Badge className="bg-green-600 text-white px-3 py-1 text-lg font-bold">
                          AUD$69
                        </Badge>
                      </div>
                      <h3 className="text-white font-bold text-xl mb-2">Premium Membership</h3>
                      <p className="text-white/90 text-sm mb-4">
                        Join today and get instant AUD$69 credit plus VIP benefits
                      </p>
                      
                      {/* Benefits list */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center text-white/90 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" />
                          AUD$69 Credit
                        </div>
                        <div className="flex items-center text-white/90 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" />
                          Priority Service
                        </div>
                        <div className="flex items-center text-white/90 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" />
                          Instant Orders
                        </div>
                        <div className="flex items-center text-white/90 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" />
                          Mobile App
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterWithMembership} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="text"
                          placeholder="Choose Username"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500"
                          required
                        />
                      </div>
                      
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="email"
                          placeholder="Email Address"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500"
                          required
                        />
                      </div>
                      
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="password"
                          placeholder="Create Password"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500"
                          required
                        />
                      </div>
                      
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="password"
                          placeholder="Confirm Password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500"
                          required
                        />
                      </div>
                      
                      <div className="relative">
                        <Globe className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="text"
                          placeholder="Full Name (optional)"
                          value={registerData.fullName}
                          onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500"
                        />
                      </div>
                      
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 h-5 w-5 text-green-400" />
                        <Input
                          type="tel"
                          placeholder="Phone Number (optional)"
                          value={registerData.phoneNumber}
                          onChange={(e) => setRegisterData({...registerData, phoneNumber: e.target.value})}
                          className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-12 focus:border-green-500"
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold h-14 rounded-xl shadow-xl transition-all duration-300 transform hover:scale-[1.02] text-lg"
                      disabled={isProcessing || !isIAPAvailable || iapLoading}
                    >
                      {isProcessing ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                          Processing Purchase...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Crown className="w-5 h-5 mr-2" />
                          Join Premium for AUD$69
                        </div>
                      )}
                    </Button>
                    
                    {!isIAPAvailable && (
                      <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-3">
                        <p className="text-yellow-300 text-sm text-center font-medium">
                          Development Mode: In-App Purchase not available
                        </p>
                      </div>
                    )}
                    
                    <div className="text-center space-y-2">
                      <p className="text-white/70 text-sm">
                        🔒 Secure payment via Apple App Store
                      </p>
                      <p className="text-white/60 text-xs">
                        Your membership includes instant AUD$69 credit to start ordering
                      </p>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}