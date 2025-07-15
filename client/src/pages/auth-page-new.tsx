import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Load Square Web Payments SDK
declare global {
  interface Window {
    Square?: any;
  }
}

const loginSchema = z.object({
  username: z.string().min(1, "Username or Email is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  joinPremium: z.boolean().default(false),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const auth = useAuth();
  const { user, login, register, isLoginPending, isRegisterPending } = auth;
  const { toast } = useToast();

  // Add safety check for authentication context
  if (!auth || !login || !register) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phoneNumber: "",
      joinPremium: false,
    },
  });

  // Membership signup mutation with Square payment integration
  const membershipSignupMutation = useMutation({
    mutationFn: async (data: { userData: Omit<RegisterFormValues, 'joinPremium' | 'confirmPassword'>; sourceId: string }) => {
      const res = await apiRequest('POST', '/api/membership-signup', {
        ...data.userData,
        sourceId: data.sourceId
      });
      return await res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Welcome to Bean Stalker Premium!",
        description: `Your account has been created and you've received AUD$69 in credits. Welcome to the community!`,
      });
      // Navigate to home page
      navigate('/');
    },
    onError: (error: Error) => {
      setIsProcessingPayment(false);
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create premium account. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    if (!data.joinPremium) {
      // Regular registration without membership
      const { joinPremium, confirmPassword, ...userData } = data;
      try {
        await register(userData);
      } catch (error) {
        // Error handling is done in the mutation
      }
      return;
    }

    // Premium membership signup with Square payment
    setIsProcessingPayment(true);
    
    try {
      // Initialize Square payment form
      if (!window.Square) {
        throw new Error("Square payment system is not available");
      }

      const appId = 'sandbox-sq0idb-0f_-wyGBcz7NmblQtFkv9A'; // Square sandbox app ID
      const locationId = 'LRQ926HVH9WFD'; // Beanstalker Sandbox location ID

      const payments = window.Square.payments(appId, locationId);
      const card = await payments.card();
      await card.attach('#card-container');

      const result = await card.tokenize();
      if (result.status === 'OK') {
        const { joinPremium, confirmPassword, ...userData } = data;
        await membershipSignupMutation.mutateAsync({
          userData,
          sourceId: result.token
        });
      } else {
        throw new Error(result.errors?.[0]?.message || "Payment failed");
      }
    } catch (error) {
      setIsProcessingPayment(false);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  // Load Square Web Payments SDK
  useEffect(() => {
    if (!document.querySelector('script[src*="web-payments-sdk"]')) {
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  if (user) {
    return null; // Redirecting...
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#124430]">
            Welcome to Bean Stalker
          </CardTitle>
          <CardDescription>
            Order coffee and food from your favorite coffee shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username or Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-[#124430] hover:bg-[#0d3526] text-white"
                    disabled={isLoginPending}
                  >
                    {isLoginPending ? "Logging in..." : "LOG IN"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Your phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Create a password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Confirm your password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Premium Membership Option */}
                  <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-yellow-50">
                    <FormField
                      control={registerForm.control}
                      name="joinPremium"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-semibold text-green-800">
                              Join Bean Stalker Premium - AUD$69
                            </FormLabel>
                            <div className="text-sm text-green-700">
                              <div className="mb-2">Get instant benefits:</div>
                              <ul className="list-disc list-inside space-y-1">
                                <li>AUD$69 credited to your account immediately</li>
                                <li>Start ordering right away</li>
                                <li>Premium member status</li>
                                <li>Priority support</li>
                              </ul>
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Square Payment Form for Premium Members */}
                  {registerForm.watch('joinPremium') && (
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-800 mb-2">Payment Information</h4>
                        <p className="text-sm text-gray-600">Your card will be charged AUD$69 for premium membership</p>
                      </div>
                      <div id="card-container" className="min-h-[100px] border rounded p-3"></div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-[#124430] hover:bg-[#0d3526] text-white"
                    disabled={isRegisterPending || membershipSignupMutation.isPending || isProcessingPayment}
                  >
                    {isProcessingPayment || membershipSignupMutation.isPending ? 
                      "Processing..." : 
                      registerForm.watch('joinPremium') ? 
                        "Join Premium - AUD$69" : 
                        "Create Account"
                    }
                  </Button>
                  
                  {registerForm.watch('joinPremium') && (
                    <p className="text-xs text-gray-500 text-center">
                      Secure payment powered by Square. Your card will be charged AUD$69 and credited to your account immediately.
                    </p>
                  )}
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}