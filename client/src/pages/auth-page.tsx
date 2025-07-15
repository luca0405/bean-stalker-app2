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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotFormValues = z.infer<typeof forgotSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const resetToken = searchParams.get('resetToken');
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>(resetToken ? 'reset' : 'login');

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

  const forgotForm = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // If user is already logged in, redirect to appropriate page
    if (user) {
      // Scroll to top before navigation
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // If user is admin, redirect to admin page with orders tab
      if (user.isAdmin) {
        navigate("/admin");
      } else {
        // Otherwise redirect to home
        navigate("/");
      }
    }
  }, [user, navigate]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await login(data);
      // No need to navigate here as the useEffect will handle it
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Password reset request mutation
  const resetRequestMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/password-reset/request', { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset link sent",
        description: "If your email is registered, you will receive a password reset link shortly.",
      });
      setResetSent(true);
      forgotForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const res = await apiRequest('POST', '/api/password-reset/reset', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now log in with your new password.",
      });
      // Clear the token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Switch to login tab
      setActiveTab('login');
      resetPasswordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. The link may be expired or invalid.",
        variant: "destructive",
      });
    },
  });

  const onForgotSubmit = async (data: ForgotFormValues) => {
    resetRequestMutation.mutate(data.email);
  };
  
  const onResetPasswordSubmit = async (data: ResetPasswordFormValues) => {
    if (!resetToken) {
      toast({
        title: "Error",
        description: "Reset token is missing. Please use the link from your email.",
        variant: "destructive",
      });
      return;
    }
    
    resetPasswordMutation.mutate({
      token: resetToken,
      newPassword: data.newPassword,
    });
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center mb-8">
        <img src="/images/bean-stalker-logo.png" alt="Bean Stalker Logo" className="w-40 h-auto" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-[#124430]">
            Welcome to Bean Stalker
          </CardTitle>
          <CardDescription className="text-center">
            Order coffee and food from your favorite coffee shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetToken ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'reset')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="reset">Reset Password</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username or Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your username or email"
                              type="text"
                              {...field}
                            />
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
                            <Input
                              placeholder="Password"
                              type="password"
                              {...field}
                            />
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

                    <div className="text-center mt-4">
                      <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="link" className="text-[#124430]">
                            Forgot my User ID or Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Contact Bean Stalker</DialogTitle>
                            <DialogDescription>
                              Please contact Bean Stalker directly to request a password change.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="py-6">
                            <div className="space-y-4 mb-6">
                              <p className="text-sm">
                                For security reasons, password resets must be handled by our staff. Please contact us using one of the methods below:
                              </p>
                              
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Phone:</p>
                                <p className="text-sm">0400 123 456</p>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Email:</p>
                                <p className="text-sm">info@beanstalker.com.au</p>
                              </div>
                              
                              <p className="text-sm">
                                Our staff will verify your identity and assist you with resetting your password.
                              </p>
                            </div>
                            
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">
                                  Close
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="reset">
                <Form {...resetPasswordForm}>
                  <form
                    onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-medium">Reset Your Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Please enter a new password for your account.
                      </p>
                    </div>
                    
                    <FormField
                      control={resetPasswordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your new password"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={resetPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Confirm your new password"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full bg-[#124430] hover:bg-[#0d3526] text-white"
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                    </Button>
                    
                    <div className="text-center mt-4">
                      <Button 
                        variant="link" 
                        className="text-[#124430]"
                        onClick={() => setActiveTab('login')}
                      >
                        Back to Login
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          ) : (
            // Default login form when no reset token is present
            <Form {...loginForm}>
              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username or email"
                          type="text"
                          {...field}
                        />
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
                        <Input
                          placeholder="Password"
                          type="password"
                          {...field}
                        />
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

                <div className="text-center mt-4">
                  <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-[#124430]">
                        Forgot my User ID or Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Contact Bean Stalker</DialogTitle>
                        <DialogDescription>
                          Please contact Bean Stalker directly to request a password change.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="py-6">
                        <div className="space-y-4 mb-6">
                          <p className="text-sm">
                            For security reasons, password resets must be handled by our staff. Please contact us using one of the methods below:
                          </p>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Phone:</p>
                            <p className="text-sm">0400 123 456</p>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Email:</p>
                            <p className="text-sm">info@beanstalker.com.au</p>
                          </div>
                          
                          <p className="text-sm">
                            Our staff will verify your identity and assist you with resetting your password.
                          </p>
                        </div>
                        
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">
                              Close
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
