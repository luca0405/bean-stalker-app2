import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function RevenueCatForceReload() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { user } = useAuth();

  const forceReloadRevenueCat = async () => {
    if (!Capacitor.isNativePlatform()) {
      setResult({ error: 'Force reload only works on native iOS/Android platforms' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔄 Force reloading RevenueCat configuration...');
      
      // Step 1: Reset and reconfigure
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // Use hardcoded API key
      const apiKey = 'appl_owLmakOcTeYJOJoxJgScSQZtUQA';
      
      const userId = user && 'id' in user ? user.id.toString() : '1';
      console.log('🔧 Reconfiguring RevenueCat with user ID:', userId);
      await Purchases.configure({
        apiKey,
        appUserID: userId,
      });
      
      // Step 2: Force sync customer info
      console.log('👤 Syncing customer info...');
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('👤 Customer info synced:', customerInfo.customerInfo.originalAppUserId);
      
      // Step 3: Force reload offerings with retry
      console.log('🎁 Force reloading offerings...');
      let offerings = null;
      let attempt = 0;
      
      while (!offerings && attempt < 3) {
        attempt++;
        console.log(`🎁 Attempt ${attempt}: Fetching offerings...`);
        
        try {
          offerings = await Purchases.getOfferings();
          console.log(`🎁 Attempt ${attempt} result:`, offerings);
          
          if (offerings && (offerings.current || (offerings.all && Object.keys(offerings.all).length > 0))) {
            break;
          } else {
            console.log(`🎁 Attempt ${attempt}: No offerings found, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`🎁 Attempt ${attempt} failed:`, error);
          if (attempt === 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      const packagesFound = offerings?.current?.availablePackages?.length || 0;
      const totalOfferings = offerings?.all ? Object.keys(offerings.all).length : 0;
      
      setResult({
        success: true,
        customerInfo: customerInfo.customerInfo.originalAppUserId,
        totalOfferings,
        packagesFound,
        currentOffering: offerings?.current?.identifier,
        allOfferings: offerings?.all ? Object.keys(offerings.all) : [],
        packages: offerings?.current?.availablePackages?.map((pkg: any) => ({
          id: pkg.identifier,
          productId: pkg.product.identifier,
          price: pkg.product.priceString,
          title: pkg.product.title,
        })) || [],
        attempts: attempt,
      });
      
      console.log('✅ Force reload completed successfully');
      
    } catch (error) {
      console.error('❌ Force reload failed:', error);
      setResult({
        success: false,
        error: String(error),
        errorDetails: JSON.stringify(error, null, 2),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          RevenueCat Force Reload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={forceReloadRevenueCat} 
          disabled={isLoading}
          className="w-full"
          variant={result?.success ? 'default' : 'destructive'}
        >
          {isLoading ? 'Force Reloading...' : 'Force Reload RevenueCat'}
        </Button>

        {result && (
          <div className="space-y-3">
            <Alert className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>
                <strong>Status:</strong> {result.success ? 'Success' : 'Failed'}
                {result.success && (
                  <span> - Found {result.packagesFound} products in {result.attempts} attempts</span>
                )}
              </AlertDescription>
            </Alert>

            {result.success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-semibold text-green-800 mb-2">✅ Results:</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Customer ID: {result.customerInfo}</li>
                  <li>• Total Offerings: {result.totalOfferings}</li>
                  <li>• Current Offering: {result.currentOffering || 'None'}</li>
                  <li>• Products Found: {result.packagesFound}</li>
                  <li>• Attempts Required: {result.attempts}</li>
                </ul>
                
                {result.packages.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-green-800">Available Products:</h5>
                    <ul className="space-y-1 text-xs text-green-600 mt-1">
                      {result.packages.map((pkg: any, index: number) => (
                        <li key={index}>• {pkg.productId} - {pkg.price} ({pkg.title})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!result.success && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h4 className="font-semibold text-red-800 mb-2">❌ Error Details:</h4>
                <p className="text-sm text-red-700 mb-2">{result.error}</p>
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Full Error</summary>
                  <pre className="mt-1 bg-white p-2 rounded border overflow-auto max-h-32">
                    {result.errorDetails}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}