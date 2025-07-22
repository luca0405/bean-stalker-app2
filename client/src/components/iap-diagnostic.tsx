import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { iapService } from '@/services/iap-service';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export default function IAPDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Check if running on native platform
      addResult({
        test: 'Platform Check',
        status: 'success',
        message: `Running on: ${navigator.userAgent.includes('capacitor') ? 'Native iOS' : 'Web Browser'}`,
        details: navigator.userAgent
      });

      // Test 2: Check API key
      const hasApiKey = !!import.meta.env.VITE_REVENUECAT_API_KEY;
      addResult({
        test: 'RevenueCat API Key',
        status: hasApiKey ? 'success' : 'error',
        message: hasApiKey ? 'API key configured' : 'API key missing',
        details: hasApiKey ? 'VITE_REVENUECAT_API_KEY found' : 'VITE_REVENUECAT_API_KEY not set'
      });

      // Test 3: Initialize IAP service
      addResult({
        test: 'IAP Service Initialization',
        status: 'pending',
        message: 'Initializing IAP service...'
      });

      const initSuccess = await iapService.initialize();
      setResults(prev => prev.map(r => 
        r.test === 'IAP Service Initialization' 
          ? {
              ...r,
              status: initSuccess ? 'success' : 'error',
              message: initSuccess ? 'IAP service initialized successfully' : 'IAP service initialization failed'
            }
          : r
      ));

      if (!initSuccess) {
        addResult({
          test: 'Diagnostic Complete',
          status: 'error',
          message: 'Cannot continue - IAP service failed to initialize'
        });
        return;
      }

      // Test 4: Set user ID
      addResult({
        test: 'User Login',
        status: 'pending',
        message: 'Setting user ID...'
      });

      await iapService.setUserID('32');
      setResults(prev => prev.map(r => 
        r.test === 'User Login' 
          ? {
              ...r,
              status: 'success',
              message: 'User ID set successfully'
            }
          : r
      ));

      // Test 5: Load available products
      addResult({
        test: 'Product Loading',
        status: 'pending',
        message: 'Loading available products...'
      });

      try {
        const products = await iapService.getAvailableProducts();
        
        // Get detailed RevenueCat logs for troubleshooting
        const debugInfo = await iapService.getDebugInfo();
        
        setResults(prev => prev.map(r => 
          r.test === 'Product Loading' 
            ? {
                ...r,
                status: products.length > 0 ? 'success' : 'warning',
                message: `Found ${products.length} products`,
                details: products.length > 0 
                  ? products.map(p => `${p.id}: ${p.title} - ${p.price}`).join('\n')
                  : `RevenueCat Debug Info:\n${debugInfo}`
              }
            : r
        ));

        // Test 6: Check IAP availability
        const isAvailable = iapService.isAvailable();
        addResult({
          test: 'IAP Availability',
          status: isAvailable ? 'success' : 'error',
          message: isAvailable ? 'IAP system available' : 'IAP system not available'
        });

      } catch (error: any) {
        setResults(prev => prev.map(r => 
          r.test === 'Product Loading' 
            ? {
                ...r,
                status: 'error',
                message: 'Failed to load products',
                details: error.message
              }
            : r
        ));
      }

      addResult({
        test: 'Diagnostic Complete',
        status: 'success',
        message: 'All diagnostics completed'
      });

    } catch (error: any) {
      addResult({
        test: 'Diagnostic Error',
        status: 'error',
        message: 'Diagnostic failed',
        details: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testPurchase = async () => {
    try {
      addResult({
        test: 'Test Purchase',
        status: 'pending',
        message: 'Attempting test purchase...'
      });

      const result = await iapService.purchaseProduct('com.beanstalker.credit25');
      
      addResult({
        test: 'Test Purchase',
        status: result.success ? 'success' : 'error',
        message: result.success ? 'Purchase successful' : `Purchase failed: ${result.error}`,
        details: result.success ? `Transaction ID: ${result.transactionId}` : result.error
      });
    } catch (error: any) {
      addResult({
        test: 'Test Purchase',
        status: 'error',
        message: 'Purchase error',
        details: error.message
      });
    }
  };

  const StatusIcon = ({ status }: { status: DiagnosticResult['status'] }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>RevenueCat IAP Diagnostic Tool</CardTitle>
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
          <Button onClick={testPurchase} variant="secondary">
            Test Purchase
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <StatusIcon status={result.status} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{result.test}</span>
                  <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                    {result.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                {result.details && (
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                    {result.details}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}