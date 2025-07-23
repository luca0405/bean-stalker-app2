import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Globe } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export default function WebRevenueCatTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [rawResponse, setRawResponse] = useState<string>('');

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runWebTest = async () => {
    setIsRunning(true);
    setResults([]);
    setRawResponse('');

    try {
      // Force web testing mode
      addResult({
        test: 'Platform Override',
        status: 'warning',
        message: 'Testing RevenueCat in web mode (bypassing native check)',
        details: 'This test forces RevenueCat SDK to run in browser for debugging'
      });

      // Test API key
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
      addResult({
        test: 'API Key Check',
        status: apiKey ? 'success' : 'error',
        message: apiKey ? 'RevenueCat API key found' : 'RevenueCat API key missing',
        details: apiKey ? `Key: ${apiKey.substring(0, 10)}...` : 'VITE_REVENUECAT_API_KEY not configured'
      });

      if (!apiKey) {
        setIsRunning(false);
        return;
      }

      // Initialize RevenueCat in web mode
      addResult({
        test: 'SDK Initialization',
        status: 'pending',
        message: 'Initializing RevenueCat SDK...'
      });

      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        await Purchases.configure({
          apiKey,
          appUserID: '32', // Test with known user ID
        });

        setResults(prev => prev.map(r => 
          r.test === 'SDK Initialization' 
            ? { ...r, status: 'success', message: 'RevenueCat SDK initialized successfully' }
            : r
        ));

        // Test offerings fetch
        addResult({
          test: 'Offerings Fetch',
          status: 'pending',
          message: 'Fetching offerings from RevenueCat...'
        });

        const offerings = await Purchases.getOfferings();
        setRawResponse(JSON.stringify(offerings, null, 2));

        const offeringCount = Object.keys(offerings.all || {}).length;
        const hasDefault = offerings.all && offerings.all.default;
        const hasCurrent = !!offerings.current;

        setResults(prev => prev.map(r => 
          r.test === 'Offerings Fetch' 
            ? { 
                ...r, 
                status: offeringCount > 0 ? 'success' : 'warning',
                message: `Found ${offeringCount} offerings`,
                details: `Current: ${hasCurrent ? offerings.current?.identifier : 'None'}, Default: ${hasDefault ? 'Found' : 'None'}`
              }
            : r
        ));

        // Test package extraction
        let totalPackages = 0;
        let productDetails: string[] = [];

        if (offerings.all) {
          Object.entries(offerings.all).forEach(([key, offering]) => {
            const packageCount = offering.availablePackages?.length || 0;
            totalPackages += packageCount;
            
            addResult({
              test: `Offering: ${key}`,
              status: packageCount > 0 ? 'success' : 'warning',
              message: `${packageCount} packages found`,
              details: offering.availablePackages?.map(pkg => 
                `${pkg.identifier} → ${pkg.product.identifier} (${pkg.product.priceString || 'No price'})`
              ).join(', ') || 'No packages'
            });

            if (offering.availablePackages) {
              offering.availablePackages.forEach(pkg => {
                productDetails.push(`${pkg.identifier}: ${pkg.product.title || 'No title'} - ${pkg.product.priceString || 'No price'}`);
              });
            }
          });
        }

        addResult({
          test: 'Product Summary',
          status: totalPackages > 0 ? 'success' : 'error',
          message: `Total products found: ${totalPackages}`,
          details: productDetails.join('\n') || 'No products available'
        });

        // Test specific products
        const expectedProducts = [
          'com.beanstalker.membership69',
          'com.beanstalker.credit100',
          'com.beanstalker.credit50',
          'com.beanstalker.credit25'
        ];

        expectedProducts.forEach(productId => {
          const found = productDetails.some(detail => detail.includes(productId));
          addResult({
            test: `Product: ${productId}`,
            status: found ? 'success' : 'error',
            message: found ? 'Product found in offerings' : 'Product missing from offerings',
            details: found ? 'Available for purchase' : 'Check App Store Connect configuration'
          });
        });

      } catch (sdkError: any) {
        setResults(prev => prev.map(r => 
          r.test === 'SDK Initialization' 
            ? { ...r, status: 'error', message: 'RevenueCat SDK initialization failed', details: sdkError.message }
            : r
        ));
        
        addResult({
          test: 'SDK Error Details',
          status: 'error',
          message: 'Detailed error information',
          details: JSON.stringify(sdkError, null, 2)
        });
      }

    } catch (error: any) {
      addResult({
        test: 'Critical Error',
        status: 'error',
        message: 'Test failed with critical error',
        details: error.message || 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'pending': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Web RevenueCat SDK Test
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test RevenueCat SDK 11.0.0 integration directly in the browser
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runWebTest} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Web RevenueCat Test'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Test Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{result.test}</span>
                    <Badge className={getStatusBadge(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {rawResponse && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Raw RevenueCat Response:</h3>
            <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-64">
              {rawResponse}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}