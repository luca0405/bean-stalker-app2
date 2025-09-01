import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useNativeNotification } from '@/services/native-notification-service';

// Square Web Payments SDK types
declare global {
  var Square: any;
}

interface CreditPackage {
  id: string;
  amount: number;
  price: number;
  bonus?: number;
}

interface SquarePaymentFormProps {
  creditPackage: CreditPackage;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SquarePaymentForm({ creditPackage, onSuccess, onCancel }: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const paymentFormRef = useRef<any>(null);
  const { user } = useAuth();
  const { notify } = useNativeNotification();
  const queryClient = useQueryClient();

  // Square payment processing mutation
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest('POST', '/api/square/process-payment', {
        sourceId: paymentData.token,
        amount: creditPackage.price,
        credits: creditPackage.amount + (creditPackage.bonus || 0),
        packageId: creditPackage.id,
        customerEmail: user?.email,
        customerName: user?.fullName || user?.username
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Payment mutation success - response data:', data);
      if (data.success) {
        console.log('Payment successful, showing notification and calling onSuccess');
        notify({
          title: "Payment Successful!",
          description: `${creditPackage.amount + (creditPackage.bonus || 0)} credits added to your account.`,
        });
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        onSuccess();
      } else {
        console.error('Payment response indicates failure:', data);
        throw new Error(data.error || 'Payment failed');
      }
    },
    onError: (error: any) => {
      notify({
        title: "Payment Failed",
        description: error.message || 'There was an error processing your payment.',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Load Square SDK
  useEffect(() => {
    const loadSquareSDK = async () => {
      try {
        // Check if SDK is already loaded
        if (window.Square) {
          setSdkLoaded(true);
          setIsLoading(false);
          return;
        }

        // Load Square SDK from CDN
        const script = document.createElement('script');
        script.src = 'https://web.squarecdn.com/v1/square.js'; // Use production SDK
        script.async = true;
        script.onload = () => {
          console.log('Square SDK loaded successfully');
          setSdkLoaded(true);
          setIsLoading(false);
        };
        script.onerror = () => {
          console.error('Failed to load Square SDK');
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Square SDK:', error);
        setIsLoading(false);
      }
    };

    loadSquareSDK();
  }, []);

  // Initialize Square payment form
  useEffect(() => {
    const initializeSquareForm = async () => {
      console.log('Initializing Square form...');
      console.log('sdkLoaded:', sdkLoaded, 'formInitialized:', formInitialized);
      console.log('window.Square:', window.Square);
      console.log('cardRef.current:', cardRef.current);
      
      if (!sdkLoaded || !window.Square || !cardRef.current || formInitialized) {
        console.log('Skipping initialization - missing requirements or already initialized');
        return;
      }

      try {
        // Get Square config from backend
        console.log('Fetching Square config...');
        const configResponse = await fetch('/api/square/config');
        const config = await configResponse.json();
        console.log('Square config:', config);

        console.log('Creating Square payments instance...');
        const payments = window.Square.payments(config.applicationId, config.locationId);
        console.log('Creating card form...');
        const card = await payments.card();
        console.log('Attaching card form to DOM...');
        await card.attach(cardRef.current);

        paymentFormRef.current = { payments, card };
        setFormInitialized(true);
        console.log('Square form initialized successfully');
      } catch (error) {
        console.error('Error initializing Square form:', error);
        notify({
          title: "Payment Form Error",
          description: "Unable to load payment form. Please try again.",
        });
      }
    };

    initializeSquareForm();
  }, [sdkLoaded, formInitialized, notify]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (paymentFormRef.current?.card) {
        try {
          paymentFormRef.current.card.destroy();
          console.log('Square form cleaned up');
        } catch (error) {
          console.warn('Error cleaning up Square form:', error);
        }
      }
    };
  }, []);

  const handlePayment = async () => {
    console.log('Payment button clicked');
    console.log('paymentFormRef.current:', paymentFormRef.current);
    
    if (!paymentFormRef.current) {
      console.error('Payment form not initialized');
      notify({
        title: "Payment Error",
        description: "Payment form not ready. Please refresh and try again.",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { card } = paymentFormRef.current;
      console.log('Attempting to tokenize payment...');
      console.log('Card object:', card);
      
      // Use the correct tokenization method
      const result = await card.tokenize();
      console.log('Tokenization result:', result);

      if (result.status === 'OK') {
        console.log('Token received:', result.token);
        // Process payment with token
        await paymentMutation.mutateAsync({ token: result.token });
      } else {
        console.error('Tokenization failed:', result.errors);
        throw new Error(result.errors?.[0]?.message || 'Tokenization failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      notify({
        title: "Payment Error",
        description: error.message || 'Payment processing failed',
      });
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="ml-2 text-green-700">Loading payment form...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-green-200 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-green-800">
            Complete Purchase
          </CardTitle>
          <CardDescription className="text-green-600">
            {creditPackage.amount + (creditPackage.bonus || 0)} credits for ${creditPackage.price}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Security Disclaimer */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <CreditCard className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700">
                <p className="font-medium mb-1">Secure Payment by Square</p>
                <p className="text-green-600">
                  Your payment is processed securely by Square, a trusted payment platform. 
                  Your card information is encrypted and never stored on our servers.
                </p>
              </div>
            </div>
          </div>

          {/* Square Card Form */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-green-700">
              Card Information
            </label>
            <div 
              ref={cardRef}
              className="p-4 border border-green-200 rounded-lg bg-white min-h-[120px]"
              style={{ minHeight: '120px' }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ${creditPackage.price}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}