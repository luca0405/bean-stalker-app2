import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Capacitor } from '@capacitor/core';
import { useIAP } from '@/hooks/use-iap';

import { formatCurrency } from '@/lib/utils';
import { Smartphone, DollarSign } from 'lucide-react';

interface CreditPackage {
  id: string;
  amount: number;
  price: number;
  popular?: boolean;
  bonus?: number;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'com.beanstalker.credits10', amount: 10, price: 10 },
  { id: 'com.beanstalker.credits25', amount: 25, price: 25, bonus: 2 },
  { id: 'com.beanstalker.credits50', amount: 50, price: 50, bonus: 5, popular: true },
  { id: 'com.beanstalker.credits100', amount: 100, price: 100, bonus: 15 }
];

export function EnhancedBuyCredits() {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { purchaseProduct, isAvailable: iapAvailable, isLoading: iapLoading } = useIAP();
  const isNative = Capacitor.isNativePlatform();

  const handlePurchase = async (creditPackage: CreditPackage) => {
    setIsProcessing(true);
    setSelectedPackage(creditPackage);

    try {
      // Process IAP purchase through App Store
      const result = await purchaseProduct(creditPackage.id);
      if (result.success) {
        console.log('App Store purchase successful:', result);
      }
    } catch (error) {
      console.error('App Store purchase failed:', error);
    } finally {
      setIsProcessing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="h-full max-h-[65vh] overflow-y-auto">
      <div className="space-y-4 p-1">
        {/* App Store Payment Header */}
        <div className="flex items-center gap-2 text-sm text-gray-600 px-2">
          <Smartphone className="h-4 w-4" />
          <span className="text-xs">App Store In-App Purchase</span>
        </div>

        {/* Credit Packages - Mobile Optimized */}
        <div className="space-y-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card key={pkg.id} className={`relative cursor-pointer transition-all duration-200 ${
              pkg.popular ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-md'
            }`}>
              {pkg.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-xs">
                  Popular
                </Badge>
              )}
              
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-lg">
                        {pkg.amount + (pkg.bonus || 0)} Credits
                      </span>
                    </div>
                    {pkg.bonus && (
                      <p className="text-xs text-green-600 mb-2">
                        {pkg.amount} + {pkg.bonus} bonus
                      </p>
                    )}
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(pkg.price)}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handlePurchase(pkg)}
                    disabled={isProcessing || (isNative && iapLoading)}
                    size="sm"
                    variant={pkg.popular ? "default" : "outline"}
                    className="ml-4"
                  >
                    {isProcessing && selectedPackage?.id === pkg.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Buy'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Method Info */}
        <div className="text-xs text-gray-500 space-y-1 px-2 pb-4">
          <p>• Secure payments processed by App Store</p>
          <p>• Credits added immediately after purchase</p>
          <p>• Credits never expire and can be used for any order</p>
        </div>
      </div>
    </div>
  );
}