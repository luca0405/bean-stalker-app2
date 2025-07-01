import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Coffee, CreditCard, Loader2, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    joinPremium: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      
      if (response.ok) {
        const user = await response.json();
        toast({
          title: "Welcome back",
          description: `Signed in as ${user.username}`,
        });
        navigate('/');
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { joinPremium, ...userData } = registerData;
    
    try {
      if (joinPremium) {
        toast({
          title: "Premium membership",
          description: "Processing premium membership for AUD$69...",
        });
        
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...userData,
            credits: 69,
          }),
        });
        
        if (response.ok) {
          const user = await response.json();
          toast({
            title: "Premium membership activated",
            description: `Welcome ${user.username}! AUD$69 credit added to your account.`,
          });
          navigate('/');
        } else {
          throw new Error("Registration failed");
        }
      } else {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        
        if (response.ok) {
          const user = await response.json();
          toast({
            title: "Account created",
            description: `Welcome to Bean Stalker, ${user.username}!`,
          });
          navigate('/');
        } else {
          throw new Error("Registration failed");
        }
      }
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
              <Coffee className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Bean Stalker</h1>
          <p className="text-gray-400 text-sm">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
          <CardContent className="p-6">
            {isLogin ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Full name"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                  <Input
                    placeholder="Username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-green-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Premium Membership Option */}
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-gray-700 bg-gray-800/50">
                  <Checkbox
                    checked={registerData.joinPremium}
                    onCheckedChange={(checked) => setRegisterData({ ...registerData, joinPremium: Boolean(checked) })}
                    className="border-gray-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <div className="flex-1">
                    <label className="flex items-center space-x-2 text-sm font-medium text-white cursor-pointer">
                      <CreditCard className="h-4 w-4 text-green-500" />
                      <span>Premium Membership - AUD$69</span>
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      Get instant AUD$69 credit plus exclusive benefits and priority ordering.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : registerData.joinPremium ? (
                    "Join Premium - AUD$69"
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            )}

            {/* Toggle between Login/Register */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {isLogin ? (
                  <>Don't have an account? <span className="text-green-500 font-medium">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="text-green-500 font-medium">Sign in</span></>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}