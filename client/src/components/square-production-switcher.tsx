import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Settings } from 'lucide-react';

export function SquareProductionSwitcher() {
  const [isChecking, setIsChecking] = useState(false);
  const [environment, setEnvironment] = useState<'sandbox' | 'production' | 'unknown'>('unknown');

  const checkEnvironment = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/debug/square-test');
      const data = await response.json();
      
      // Check if using sandbox or production based on application ID
      if (data.applicationId?.includes('sandbox')) {
        setEnvironment('sandbox');
      } else if (data.applicationId?.startsWith('sq0idp-')) {
        setEnvironment('production');
      } else {
        setEnvironment('unknown');
      }
    } catch (error) {
      console.error('Failed to check Square environment:', error);
      setEnvironment('unknown');
    } finally {
      setIsChecking(false);
    }
  };

  const getEnvironmentBadge = () => {
    switch (environment) {
      case 'sandbox':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">🧪 Sandbox</Badge>;
      case 'production':
        return <Badge variant="default" className="bg-green-100 text-green-800">🚀 Production</Badge>;
      default:
        return <Badge variant="outline">❓ Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Square Environment Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Current Environment:</span>
          {getEnvironmentBadge()}
        </div>

        <Button 
          onClick={checkEnvironment} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Checking...' : 'Check Current Environment'}
        </Button>

        {environment === 'sandbox' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sandbox Mode</strong> - Test payments only. To switch to production:
              <br />
              1. Go to Replit Secrets panel (🔒 in sidebar)
              <br />
              2. Update SQUARE_ACCESS_TOKEN with production token (sq0atp-...)
              <br />
              3. Update SQUARE_APPLICATION_ID with production ID (sq0idp-...)
              <br />
              4. Update SQUARE_LOCATION_ID with your business location ID
              <br />
              5. App will restart automatically with production credentials
            </AlertDescription>
          </Alert>
        )}

        {environment === 'production' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Production Mode</strong> - Real payments are being processed! 
              Orders sync to your live Square for Restaurants Kitchen Display.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <div><strong>Sandbox:</strong> Test mode - no real money involved</div>
          <div><strong>Production:</strong> Live mode - real payments and orders</div>
          <div><strong>Credentials Location:</strong> Replit Secrets panel (🔒)</div>
        </div>
      </CardContent>
    </Card>
  );
}