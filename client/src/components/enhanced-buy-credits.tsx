import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Capacitor } from '@capacitor/core';
import { useIAP } from '@/hooks/use-iap';
import { useNativeNotifications } from '@/hooks/use-native-notifications';


import { formatCurrency } from '@/lib/utils';
import { CreditCard, ShoppingBag, Star, Gift, Smartphone } from 'lucide-react';

interface CreditPackage {
  id: string;
  amount: number;
  price: number;
  popular?: boolean;
  bonus?: number;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'com.beanstalker.credits25', amount: 25, price: 25, bonus: 4.50 }, // $25 → $29.50 (+18%)
  { id: 'com.beanstalker.credits50', amount: 50, price: 50, bonus: 9.90, popular: true }, // $50 → $59.90 (+19.8%)  
  { id: 'com.beanstalker.credits100', amount: 100, price: 100, bonus: 20.70 }, // $100 → $120.70 (+20.7%)
];

export function EnhancedBuyCredits() {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { purchaseProduct, isAvailable: iapAvailable, isLoading: iapLoading } = useIAP();
  const { notifySuccess, notifyError } = useNativeNotifications();
  const isNative = Capacitor.isNativePlatform();

  const handlePurchase = async (creditPackage: CreditPackage) => {
    setIsProcessing(true);
    setSelectedPackage(creditPackage);

    try {
      // Process IAP purchase through App Store
      const result = await purchaseProduct(creditPackage.id);
      if (result.success) {
        notifySuccess("Purchase Successful!", `${formatCurrency(creditPackage.amount + (creditPackage.bonus || 0))} credits added to your account.`);
      }
    } catch (error) {
      notifyError("Purchase Failed", "Please try again or contact support if the issue persists.");
    } finally {
      setIsProcessing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Balance Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-green-100 text-sm">Add Credits</p>
                <p className="text-2xl font-bold">Choose Your Package</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Credit Packages */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-green-600" />
              <span>Credit Packages</span>
            </CardTitle>
            <CardDescription>
              Select a credit package to add to your account. All payments are processed securely through the App Store.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CREDIT_PACKAGES.map((pkg) => (
                <motion.div
                  key={pkg.id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`relative p-4 bg-slate-50 rounded-lg border-2 transition-all duration-200 ${
                    pkg.popular ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-300'
                  }`}>
                    {pkg.popular && (
                      <div className="absolute -top-2 left-4">
                        <div className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>Most Popular</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Gift className="h-5 w-5 text-green-600" />
                          <span className="font-bold text-lg">
                            {formatCurrency(pkg.amount + (pkg.bonus || 0))} Credits
                          </span>
                        </div>
                        
                        {pkg.bonus && (
                          <div className="mb-2">
                            <p className="text-sm text-green-700 font-medium">
                              {formatCurrency(pkg.amount)} + {formatCurrency(pkg.bonus)} bonus
                            </p>
                            <p className="text-xs text-green-600">
                              Save {Math.round((pkg.bonus / pkg.amount) * 100)}% extra credits!
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-slate-900">
                            {formatCurrency(pkg.price)}
                          </span>
                          <span className="text-sm text-slate-600">AUD</span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handlePurchase(pkg)}
                        disabled={isProcessing || (isNative && iapLoading)}
                        size="lg"
                        className={`ml-4 min-w-[80px] ${
                          pkg.popular 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-slate-600 hover:bg-slate-700 text-white'
                        }`}
                      >
                        {isProcessing && selectedPackage?.id === pkg.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Buy Now'
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Method Info */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-slate-100 border-slate-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Secure App Store Payment</span>
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
                <p>All payments are processed securely through the App Store</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
                <p>Credits are added immediately after successful purchase</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
                <p>Credits never expire and can be used for any Bean Stalker order</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>



    </div>
  );
}