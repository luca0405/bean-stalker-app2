import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deviceService } from '@/services/device-service';
import { useAuth } from '@/hooks/use-auth';
import { Smartphone, User, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export function DeviceBindingTest() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const runDeviceTest = async () => {
    setIsLoading(true);
    try {
      const deviceInfo = await deviceService.getDeviceInfo();
      const validation = await deviceService.validateDeviceBinding();
      const boundUserId = await deviceService.getBoundUserId();
      const isDeviceBound = await deviceService.isDeviceBound();

      setTestResults({
        deviceInfo,
        validation,
        boundUserId,
        isDeviceBound,
        currentUser: user,
        platform: Capacitor.isNativePlatform() ? 'Native' : 'Web',
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      console.error('Device test failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const clearDeviceBinding = async () => {
    try {
      await deviceService.unbindDevice();
      setTestResults(null);
      alert('Device binding cleared! App data reset.');
    } catch (error) {
      console.error('Failed to clear device binding:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Device Binding Test
        </CardTitle>
        <CardDescription>
          Test the one account per device system implementation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDeviceTest} disabled={isLoading} className="flex items-center gap-2">
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Run Device Test
          </Button>
          
          {Capacitor.isNativePlatform() && (
            <Button variant="destructive" onClick={clearDeviceBinding} className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Clear Device Data
            </Button>
          )}
        </div>

        {testResults && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Test Results:</h3>
            
            {testResults.error ? (
              <div className="text-red-600">Error: {testResults.error}</div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Platform:</strong> {testResults.platform}
                  </div>
                  <div>
                    <strong>Device ID:</strong> {testResults.deviceInfo?.deviceId?.substring(0, 8)}...
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <strong>Device Bound:</strong>
                    {testResults.isDeviceBound ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    {testResults.isDeviceBound ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Bound User ID:</strong> {testResults.boundUserId || 'None'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Current User:</strong> {testResults.currentUser?.username || 'Not logged in'}
                  </div>
                  <div>
                    <strong>Current User ID:</strong> {testResults.currentUser?.id || 'None'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <strong>Validation Status:</strong>
                  <div className="mt-1">
                    <div>Valid: {testResults.validation.isValid ? '✅' : '❌'}</div>
                    <div>Requires Auth: {testResults.validation.requiresAuth ? '✅' : '❌'}</div>
                    <div>Bound User ID: {testResults.validation.boundUserId || 'None'}</div>
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  Test run at: {testResults.timestamp}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Testing Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Run test after login to see device binding status</li>
            <li>• Use "Switch Account" in Profile to test account switching</li>
            <li>• Clear device data to simulate fresh installation</li>
            <li>• Verify bound user ID matches current logged-in user</li>
            <li>• Test on TestFlight to verify native platform behavior</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}