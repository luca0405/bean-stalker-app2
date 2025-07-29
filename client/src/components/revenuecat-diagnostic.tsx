import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

export function RevenueCatDiagnostic() {
  const { user } = useAuth();
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      currentUser: user,
    };

    try {
      console.log('🔍 REVENUECAT DIAGNOSTIC: Starting comprehensive analysis...');
      
      // 1. Check current RevenueCat customer info
      try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        results.revenueCatCustomerInfo = {
          originalAppUserId: customerInfo.originalAppUserId,
          activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
          allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
          latestExpirationDate: customerInfo.latestExpirationDate,
        };
        
        console.log('🔍 DIAGNOSTIC: Current RevenueCat customer:', customerInfo.originalAppUserId);
        console.log('🔍 DIAGNOSTIC: Bean Stalker user ID:', user?.id);
        
        // CRITICAL CHECK: Does RevenueCat user match Bean Stalker user?
        results.userIdMatch = customerInfo.originalAppUserId === user?.id?.toString();
        results.revenueCatUserId = customerInfo.originalAppUserId;
        results.beanStalkerUserId = user?.id?.toString();
        
      } catch (error: any) {
        results.revenueCatError = error?.message || 'Unknown RevenueCat error';
        console.error('🔍 DIAGNOSTIC: RevenueCat error:', error);
      }

      // 2. Check offerings availability
      try {
        const offerings = await Purchases.getOfferings();
        results.offerings = {
          current: offerings.current ? {
            identifier: offerings.current.identifier,
            packagesCount: offerings.current.availablePackages.length,
            packages: offerings.current.availablePackages.map(pkg => ({
              identifier: pkg.identifier,
              packageType: pkg.packageType,
              product: {
                identifier: pkg.product.identifier,
                price: pkg.product.price,
                currencyCode: pkg.product.currencyCode
              }
            }))
          } : null,
          allCount: Object.keys(offerings.all).length
        };
        
        console.log('🔍 DIAGNOSTIC: Offerings loaded:', Object.keys(offerings.all).length);
      } catch (error: any) {
        results.offeringsError = error?.message || 'Unknown offerings error';
        console.error('🔍 DIAGNOSTIC: Offerings error:', error);
      }

      // 3. Check payment capability
      try {
        const canMakePayments = await Purchases.canMakePayments();
        results.canMakePayments = canMakePayments;
        console.log('🔍 DIAGNOSTIC: Can make payments:', canMakePayments);
      } catch (error: any) {
        results.paymentCapabilityError = error?.message || 'Unknown payment capability error';
      }

      console.log('🔍 DIAGNOSTIC COMPLETE:', results);
      
    } catch (error: any) {
      console.error('🔍 DIAGNOSTIC: Fatal error:', error);
      results.fatalError = error?.message || 'Unknown fatal error';
    }

    setDiagnosticData(results);
    setLoading(false);
  };

  useEffect(() => {
    if (user && Capacitor.isNativePlatform()) {
      runDiagnostic();
    }
  }, [user]);

  if (!Capacitor.isNativePlatform()) {
    return (
      <Card className="mb-4 border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-800">RevenueCat diagnostic only available on native platforms</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">RevenueCat Customer ID Diagnostic</CardTitle>
        <Button onClick={runDiagnostic} disabled={loading}>
          {loading ? 'Running Diagnostic...' : 'Refresh Diagnostic'}
        </Button>
      </CardHeader>
      <CardContent>
        {diagnosticData ? (
          <div className="space-y-4">
            {/* Critical Issue Check */}
            <div className="p-4 border rounded-lg bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-800 mb-2">Customer ID Mapping Check</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Bean Stalker User ID:</span>
                  <Badge variant="outline">{diagnosticData.beanStalkerUserId || 'None'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>RevenueCat Customer ID:</span>
                  <Badge variant="outline">{diagnosticData.revenueCatUserId || 'None'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>IDs Match:</span>
                  <Badge variant={diagnosticData.userIdMatch ? "default" : "destructive"}>
                    {diagnosticData.userIdMatch ? 'YES' : 'NO - THIS IS THE PROBLEM'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Platform Info */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Platform Information</h3>
              <div className="text-sm space-y-1">
                <p>Platform: {diagnosticData.platform}</p>
                <p>Native: {diagnosticData.isNative ? 'Yes' : 'No'}</p>
                <p>Timestamp: {diagnosticData.timestamp}</p>
              </div>
            </div>

            {/* RevenueCat Status */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">RevenueCat Status</h3>
              <div className="text-sm space-y-1">
                {diagnosticData.canMakePayments !== undefined && (
                  <p>Can Make Payments: <Badge variant={diagnosticData.canMakePayments ? "default" : "destructive"}>
                    {diagnosticData.canMakePayments ? 'Yes' : 'No'}
                  </Badge></p>
                )}
                {diagnosticData.offerings && (
                  <p>Available Packages: {diagnosticData.offerings.current?.packagesCount || 0}</p>
                )}
                {diagnosticData.revenueCatCustomerInfo && (
                  <p>Active Subscriptions: {diagnosticData.revenueCatCustomerInfo.activeSubscriptions.length}</p>
                )}
              </div>
            </div>

            {/* Errors */}
            {(diagnosticData.revenueCatError || diagnosticData.offeringsError || diagnosticData.fatalError) && (
              <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">Errors</h3>
                <div className="text-sm space-y-1">
                  {diagnosticData.revenueCatError && <p>RevenueCat: {diagnosticData.revenueCatError}</p>}
                  {diagnosticData.offeringsError && <p>Offerings: {diagnosticData.offeringsError}</p>}
                  {diagnosticData.fatalError && <p>Fatal: {diagnosticData.fatalError}</p>}
                </div>
              </div>
            )}

            {/* Raw Data */}
            <details>
              <summary className="cursor-pointer font-semibold">Raw Diagnostic Data</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                {JSON.stringify(diagnosticData, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <p className="text-gray-500">Click "Refresh Diagnostic" to analyze RevenueCat configuration</p>
        )}
      </CardContent>
    </Card>
  );
}