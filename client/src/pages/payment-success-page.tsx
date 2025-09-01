import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Trigger payment processing immediately when page loads
    const processPayment = async () => {
      try {
        // Call the payment success API to trigger credit processing
        await fetch('/api/payment-success', { method: 'GET' });
        
        // Small delay then stop processing state
        setTimeout(() => {
          setIsProcessing(false);
          // Invalidate user data to refresh credit balance
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          // Payment processing completed - stay on success page
        }, 2000);
      } catch (error) {
        console.error('Error processing payment:', error);
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [queryClient]);

  const handleReturnToPurchase = () => {
    setLocation('/profile');
  };

  const handleGoHome = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4">
      <div className="max-w-md mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-4"
              >
                <CheckCircle className="h-16 w-16 text-green-600" />
              </motion.div>
              
              <CardTitle className="text-2xl font-bold text-green-800">
                {isProcessing ? 'Processing Payment...' : 'Payment Successful!'}
              </CardTitle>
              
              <CardDescription className="text-green-600">
                {isProcessing 
                  ? 'Please wait while we process your payment and add credits to your account.'
                  : 'Your payment has been completed successfully and credits have been added to your account.'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {isProcessing ? (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center justify-center space-x-2 py-4"
                >
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">Processing payment...</span>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center py-4"
                  >
                    <p className="text-green-700 font-medium">
                      ✅ Payment completed successfully
                    </p>
                    <p className="text-green-600 text-sm">
                      Your credits have been added to your account
                    </p>
                  </motion.div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleReturnToPurchase}
                      variant="outline"
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                    
                    <Button
                      onClick={handleGoHome}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}