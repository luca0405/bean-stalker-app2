import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export function RevenueCatDiagnostic() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      apiKey: !!import.meta.env.VITE_REVENUECAT_API_KEY,
      apiKeyLength: import.meta.env.VITE_REVENUECAT_API_KEY?.length || 0,
    };

    try {
      // Only run RevenueCat tests on native platforms
      if (Capacitor.isNativePlatform()) {
        console.log('🔍 Running RevenueCat Native Diagnostic...');
        
        // Set debug logging
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        info.debugLogSet = true;

        // Configure RevenueCat
        const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
        if (apiKey) {
          await Purchases.configure({
            apiKey,
            appUserID: undefined,
          });
          info.configured = true;
          console.log('✅ RevenueCat configured successfully');
        } else {
          info.configured = false;
          info.error = 'No API key found';
        }

        // Check payment capability
        try {
          const canMakePayments = await Purchases.canMakePayments();
          info.canMakePayments = canMakePayments;
          console.log('💳 Can make payments:', canMakePayments);
        } catch (error) {
          info.canMakePayments = false;
          info.paymentError = String(error);
        }

        // Get customer info
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          info.customerInfo = {
            originalAppUserId: customerInfo.customerInfo.originalAppUserId,
            activeSubscriptions: customerInfo.customerInfo.activeSubscriptions,
            allPurchasedProductIdentifiers: customerInfo.customerInfo.allPurchasedProductIdentifiers,
          };
          console.log('👤 Customer info retrieved:', customerInfo.customerInfo.originalAppUserId);
        } catch (error) {
          info.customerInfoError = String(error);
        }

        // Get offerings
        try {
          const offerings = await Purchases.getOfferings();
          info.offerings = {
            current: offerings.current?.identifier,
            availableCount: offerings.all ? Object.keys(offerings.all).length : 0,
            packages: offerings.current?.availablePackages?.map(pkg => ({
              identifier: pkg.identifier,
              productId: pkg.product.identifier,
              price: pkg.product.price,
              priceString: pkg.product.priceString,
            })) || [],
          };
          console.log('🎁 Offerings retrieved:', offerings);
        } catch (error) {
          info.offeringsError = String(error);
          console.error('❌ Offerings error:', error);
        }

      } else {
        info.note = 'RevenueCat diagnostic only runs on native platforms';
        console.log('ℹ️ Web platform - RevenueCat diagnostic skipped');
      }

    } catch (error) {
      info.mainError = String(error);
      console.error('❌ Main diagnostic error:', error);
    }

    setDiagnosticInfo(info);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run diagnostic on mount if on native platform
    if (Capacitor.isNativePlatform()) {
      runDiagnostic();
    }
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔍</span>
          RevenueCat Diagnostic
          <span className="text-sm font-normal text-gray-500">
            ({Capacitor.getPlatform()})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostic} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
        </Button>

        {Object.keys(diagnosticInfo).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Diagnostic Results:</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm space-y-2">
          <h4 className="font-semibold">Common Issues & Solutions:</h4>
          <ul className="space-y-1 text-gray-600">
            <li>• <strong>No products:</strong> Check App Store Connect product status (Ready for Sale)</li>
            <li>• <strong>Cannot make payments:</strong> Verify device is signed into sandbox Apple ID</li>
            <li>• <strong>Configuration error:</strong> Check VITE_REVENUECAT_API_KEY in environment</li>
            <li>• <strong>Bundle ID mismatch:</strong> Ensure RevenueCat app matches iOS bundle ID</li>
            <li>• <strong>Sandbox account:</strong> Create/use a sandbox Apple ID account for testing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}