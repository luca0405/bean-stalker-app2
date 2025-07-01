import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Crown, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    Square: any;
  }
}

export default function MembershipPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [payments, setPayments] = useState<any>(null);

  const membershipSignupMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await apiRequest("POST", "/api/membership/signup", {
        sourceId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Membership Activated!",
        description: `Welcome to Bean Stalker Premium! AUD$69 has been added to your account.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Membership Signup Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const loadSquareSDK = async () => {
      if (!window.Square) {
        const script = document.createElement('script');
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
        script.async = true;
        document.head.appendChild(script);
        
        script.onload = async () => {
          if (!window.Square) {
            console.error('Square.js failed to load');
            return;
          }
          
          try {
            const paymentsInstance = window.Square.payments(
              import.meta.env.VITE_SQUARE_APPLICATION_ID,
              'sandbox'
            );
            setPayments(paymentsInstance);
          } catch (error) {
            console.error('Failed to initialize Square payments:', error);
          }
        };
      } else {
        try {
          const paymentsInstance = window.Square.payments(
            import.meta.env.VITE_SQUARE_APPLICATION_ID,
            'sandbox'
          );
          setPayments(paymentsInstance);
        } catch (error) {
          console.error('Failed to initialize Square payments:', error);
        }
      }
    };

    loadSquareSDK();
  }, []);

  const handlePayment = async () => {
    if (!payments) {
      toast({
        title: "Payment Error",
        description: "Payment system not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const card = await payments.card();
      await card.attach('#card-container');
      
      const result = await card.tokenize();
      
      if (result.status === 'OK') {
        membershipSignupMutation.mutate(result.token);
      } else {
        toast({
          title: "Payment Error",
          description: result.errors?.[0]?.message || "Payment failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Please log in to access membership features.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.isMember) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl text-yellow-800">Premium Member</CardTitle>
            <CardDescription className="text-yellow-700">
              You're already a Bean Stalker Premium member!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Member since {user.membershipDate ? new Date(user.membershipDate).toLocaleDateString() : 'Unknown'}
            </Badge>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Current Credits: <span className="font-semibold">{user.credits}</span></p>
              <p className="text-sm text-gray-600">Enjoy exclusive member benefits and priority support!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Join Bean Stalker Premium</h1>
          <p className="text-gray-600 mb-6">
            Unlock exclusive benefits and get instant credits with our premium membership
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Benefits Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Premium Benefits
              </CardTitle>
              <CardDescription>
                Everything you get with Bean Stalker Premium membership
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm">AUD$69 instant credits added to your account</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Priority customer support</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Exclusive member-only promotions</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Early access to new menu items</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Special member pricing on select items</span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">AUD$69</div>
                  <div className="text-sm text-gray-600">One-time membership fee</div>
                  <div className="text-xs text-green-600 mt-1">Full amount credited to your account!</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Secure Payment
              </CardTitle>
              <CardDescription>
                Pay securely with Square. Your membership fee will be immediately credited to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Square Payment Form Container */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Payment Details</label>
                  <div id="card-container" className="border rounded-md p-4 min-h-[200px]">
                    {!payments && (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        Loading payment form...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button 
                  onClick={handlePayment}
                  disabled={isProcessing || membershipSignupMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing || membershipSignupMutation.isPending ? (
                    "Processing..."
                  ) : (
                    "Join Premium - AUD$69"
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  Secure payment powered by Square. Your card will be charged AUD$69.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Questions about membership? Contact our support team for assistance.
          </p>
        </div>
      </div>

      {/* Load Square Payment Form Script */}
      <script src="https://js.squareup.com/v2/paymentform"></script>
    </div>
  );
}