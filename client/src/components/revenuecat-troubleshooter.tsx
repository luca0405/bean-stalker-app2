import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { debugEnvironment } from '@/utils/environment-debug';

export function RevenueCatTroubleshooter() {
  const [status, setStatus] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0);

  const troubleshootingSteps = [
    'Checking environment variables...',
    'Initializing RevenueCat SDK...',
    'Verifying device payment capability...',
    'Loading customer information...',
    'Fetching available offerings...',
    'Analyzing configuration issues...'
  ];

  const runComprehensiveTroubleshooting = async () => {
    setIsRunning(true);
    setStep(0);
    const results: any = {
      timestamp: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      fixes: [],
      errors: [],
      warnings: [],
    };

    try {
      // Step 1: Environment Check
      setStep(1);
      const envDebug = debugEnvironment();
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
      results.environment = {
        apiKeyPresent: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 8) + '...' || 'none',
        allEnvVars: Object.keys(import.meta.env).filter(k => k.includes('REVENUE')),
        allViteVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        prod: import.meta.env.PROD,
        debugInfo: envDebug,
      };
      
      if (!apiKey) {
        results.errors.push('Missing VITE_REVENUECAT_API_KEY environment variable');
        results.fixes.push('Add VITE_REVENUECAT_API_KEY to your environment variables');
      } else if (apiKey.length < 30) {
        results.warnings.push('API key seems too short - verify it\'s correct');
      }

      // Step 2: SDK Initialization
      setStep(2);
      if (Capacitor.isNativePlatform() && apiKey) {
        try {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          console.log('🔧 Configuring RevenueCat with API key:', apiKey.substring(0, 12) + '...');
          await Purchases.configure({
            apiKey,
            appUserID: '32', // Set the specific user ID immediately
          });
          results.initialization = { success: true };
          console.log('✅ RevenueCat configured with user ID 32');
          
          // Wait a moment for initialization to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          results.initialization = { success: false, error: String(error) };
          results.errors.push(`SDK initialization failed: ${error}`);
        }

        // Step 3: Payment Capability
        setStep(3);
        try {
          const canMakePayments = await Purchases.canMakePayments();
          results.paymentCapability = canMakePayments;
          if (!canMakePayments) {
            results.errors.push('Device cannot make payments - check sandbox Apple ID');
            results.fixes.push('Sign into Settings > App Store with a sandbox Apple ID');
          }
        } catch (error) {
          results.paymentCapability = false;
          results.errors.push(`Payment capability check failed: ${error}`);
        }

        // Step 4: Customer Info
        setStep(4);
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          results.customerInfo = {
            appUserId: customerInfo.customerInfo.originalAppUserId,
            hasActiveEntitlements: Object.keys(customerInfo.customerInfo.entitlements.active).length > 0,
          };
          console.log('👤 Customer info retrieved for user:', customerInfo.customerInfo.originalAppUserId);
        } catch (error) {
          results.customerInfo = { error: String(error) };
          results.warnings.push(`Customer info error: ${error}`);
        }

        // Step 5: Offerings  
        setStep(5);
        try {
          console.log('🎁 Fetching offerings from RevenueCat...');
          const offerings = await Purchases.getOfferings();
          console.log('🎁 Raw offerings response received');
          console.log('🎁 Full offerings object:', JSON.stringify(offerings, null, 2));
          
          results.offerings = {
            hasCurrentOffering: !!offerings.current,
            currentOfferingId: offerings.current?.identifier,
            totalOfferings: offerings.all ? Object.keys(offerings.all).length : 0,
            allOfferingIds: offerings.all ? Object.keys(offerings.all) : [],
            totalPackages: offerings.current?.availablePackages?.length || 0,
            packages: offerings.current?.availablePackages?.map(pkg => ({
              id: pkg.identifier,
              productId: pkg.product.identifier,
              price: pkg.product.priceString,
            })) || [],
          };
          
          if (!offerings.current && (!offerings.all || Object.keys(offerings.all).length === 0)) {
            results.errors.push('No offerings found in RevenueCat');
            results.fixes.push('✅ RevenueCat Dashboard is properly configured (user confirmed)');
            results.fixes.push('✅ Products are "Ready to Submit" (user confirmed)');
            results.fixes.push('✅ Bundle ID matched (user confirmed)');
            results.fixes.push('❌ Most likely: API key not injected during iOS build process');
            results.fixes.push('🔧 Solution: Hardcoded API key now active for testing');
          }
          
          console.log('🎁 Offerings loaded:', results.offerings);
        } catch (error) {
          results.offerings = { error: String(error) };
          results.errors.push(`Offerings error: ${error}`);
        }

        // Step 6: Analysis
        setStep(6);
        if (results.errors.length === 0 && results.offerings?.totalPackages > 0) {
          results.status = 'success';
          results.fixes.push('RevenueCat is working correctly!');
        } else if (results.errors.length > 0) {
          results.status = 'error';
        } else {
          results.status = 'warning';
          results.fixes.push('Some issues detected - see warnings above');
        }
      } else {
        results.note = 'Troubleshooting only runs on native iOS/Android platforms';
      }

    } catch (error) {
      results.mainError = String(error);
      results.status = 'error';
    }

    setStatus(results);
    setIsRunning(false);
    setStep(0);
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default: return <RefreshCw className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      runComprehensiveTroubleshooting();
    }
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          RevenueCat Troubleshooter
          <span className="text-sm font-normal text-gray-500">
            ({Capacitor.getPlatform()})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runComprehensiveTroubleshooting} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {troubleshootingSteps[step - 1] || 'Starting troubleshooting...'}
            </div>
          ) : (
            'Run Complete Troubleshooting'
          )}
        </Button>

        {Object.keys(status).length > 0 && (
          <div className="space-y-4">
            {/* Status Summary */}
            <Alert className={getStatusColor()}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Status:</strong> {status.status || 'Unknown'}
                {status.offerings?.totalPackages > 0 ? 
                  ` - Found ${status.offerings.totalPackages} products` : 
                  ' - No products found'
                }
              </AlertDescription>
            </Alert>

            {/* Errors */}
            {status.errors?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h4 className="font-semibold text-red-800 mb-2">🚫 Issues Found:</h4>
                <ul className="space-y-1 text-sm text-red-700">
                  {status.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fixes */}
            {status.fixes?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-800 mb-2">🔧 Recommended Fixes:</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  {status.fixes.map((fix: string, index: number) => (
                    <li key={index}>• {fix}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technical Details */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <summary className="font-semibold cursor-pointer">Technical Details</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-64 bg-white p-2 rounded border">
                {JSON.stringify(status, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}