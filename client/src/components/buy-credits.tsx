import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, DollarSign, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

declare global {
  interface Window {
    Square: any;
  }
}

// Credit package options with bonus amounts
const CREDIT_PACKAGES = [
  { pay: 20, receive: 23.90 },
  { pay: 50, receive: 61.50 },
  { pay: 100, receive: 125.60 }
];

export function BuyCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[0]>(CREDIT_PACKAGES[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [squareConfig, setSquareConfig] = useState<{
    applicationId: string;
    locationId: string;
  } | null>(null);
  const cardPaymentRef = useRef<HTMLDivElement>(null);
  const squarePaymentRef = useRef<any>(null);
  
  // Function to fetch Square configuration
  const fetchSquareConfig = useCallback(async () => {
    try {
      const response = await apiRequest('GET', '/api/square/config');
      const config = await response.json();
      console.log('Received Square config:', config);
      setSquareConfig(config);
      return config;
    } catch (error) {
      console.error('Failed to load Square configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment configuration',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Load Square configuration on component mount
  useEffect(() => {
    fetchSquareConfig();
  }, [fetchSquareConfig]);

  // Load Square Web Payments SDK
  useEffect(() => {
    if (!squareConfig?.applicationId || !squareConfig?.locationId || !cardPaymentRef.current) return;

    // Clean up function for component unmount
    let isComponentMounted = true;
    
    const setupSquare = async () => {
      // Check if the script is already loaded
      const scriptExists = document.querySelector('script[src*="square"]');
      
      if (!scriptExists) {
        // Create script element for Square SDK
        const script = document.createElement('script');
        
        // Always use sandbox for testing purposes
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
        
        console.log(`Loading Square SDK from: ${script.src} (Using Sandbox for testing)`);
        
        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => {
            reject(new Error('Failed to load Square SDK'));
            if (isComponentMounted) {
              toast({
                title: 'Error',
                description: 'Failed to load payment system',
                variant: 'destructive',
              });
            }
          };
          document.body.appendChild(script);
        });
      }
      
      // Initialize payment only if component is still mounted
      if (isComponentMounted && window.Square) {
        try {
          // Clean up previous instances
          if (squarePaymentRef.current) {
            try {
              await squarePaymentRef.current.destroy();
              squarePaymentRef.current = null;
            } catch (e) {
              console.error('Error cleaning up previous Square payment instance:', e);
            }
          }
          
          // Initialize Square payments
          const payments = window.Square.payments(squareConfig.applicationId, squareConfig.locationId);
          const card = await payments.card();
          await card.attach('#card-container');
          squarePaymentRef.current = card;
        } catch (error) {
          console.error('Failed to initialize Square payment:', error);
          if (isComponentMounted) {
            toast({
              title: 'Payment Setup Failed',
              description: 'Could not initialize the payment system',
              variant: 'destructive',
            });
          }
        }
      }
    };
    
    setupSquare();
    
    // Clean up function
    return () => {
      isComponentMounted = false;
      // Destroy card instance on unmount
      if (squarePaymentRef.current) {
        squarePaymentRef.current.destroy().catch((e: Error) => {
          console.error('Error destroying Square payment instance during cleanup:', e);
        });
      }
    };
  }, [squareConfig, toast, cardPaymentRef]);

  const handleSelectPackage = (pkg: typeof CREDIT_PACKAGES[0]) => {
    setSelectedPackage(pkg);
  };

  const handlePayment = async () => {
    if (!squarePaymentRef.current) {
      toast({
        title: 'Payment Error',
        description: 'Payment system not initialized',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get payment token from Square
      const result = await squarePaymentRef.current.tokenize();
      if (result.status === 'OK') {
        // Process the payment with the token
        const response = await apiRequest('POST', '/api/square/process-payment', {
          sourceId: result.token,
          amount: selectedPackage.pay,
          bonusAmount: selectedPackage.receive,
          currency: 'AUD'
        });
        
        const paymentResult = await response.json();
        
        if (paymentResult.success) {
          toast({
            title: 'Payment Successful',
            description: `Successfully added ${selectedPackage.receive.toFixed(2)} credits to your account!`,
          });
          
          // Refresh user data to show updated credits
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        } else {
          throw new Error(paymentResult.message || 'Payment processing failed');
        }
      } else {
        throw new Error(result.errors[0].message);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-lg">Buy Credits</CardTitle>
          <CardDescription className="text-xs">
            {isMobile ? "Add credits to your account" : "Add credits to your account to place orders at Bean Stalker."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3 py-2">
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-medium mb-1">Choose a Package</h3>
              <div className="grid gap-2 grid-cols-1">
                {CREDIT_PACKAGES.map((pkg) => (
                  <Button
                    key={pkg.pay}
                    type="button"
                    variant={selectedPackage.pay === pkg.pay ? 'default' : 'outline'}
                    className="w-full justify-between h-auto py-1.5 px-3 text-sm"
                    onClick={() => handleSelectPackage(pkg)}
                    disabled={loading}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className={`font-medium ${selectedPackage.pay === pkg.pay ? 'text-white' : ''}`}>
                        ${pkg.pay.toFixed(2)}
                      </span>
                      <span className={`text-xs ${selectedPackage.pay === pkg.pay ? 'text-white/80' : 'text-muted-foreground'}`}>
                        Pay
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end text-right">
                      <span className={`font-bold ${selectedPackage.pay === pkg.pay ? 'text-white' : 'text-primary'}`}>
                        ${pkg.receive.toFixed(2)}
                      </span>
                      <span className={`text-xs ${selectedPackage.pay === pkg.pay ? 'text-white/80' : 'text-primary'}`}>
                        +{((pkg.receive/pkg.pay - 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-medium mb-1">Payment Details</h3>
              <div 
                id="card-container" 
                ref={cardPaymentRef} 
                className="min-h-[80px] mb-1 p-3 border rounded-md"
                style={{ fontSize: isMobile ? '13px' : '16px' }}
              ></div>
              <p className="text-xs text-muted-foreground">
                Securely processed by Square
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-1 pb-3">
          <Button
            className="w-full"
            onClick={handlePayment}
            disabled={loading || !squarePaymentRef.current}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-3 w-3 mr-1" />
                {isMobile 
                  ? `Pay $${selectedPackage.pay} → $${selectedPackage.receive.toFixed(2)}`
                  : `Pay $${selectedPackage.pay} for $${selectedPackage.receive.toFixed(2)} Credits`
                }
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}