import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MobileNetworkTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runNetworkTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    addResult('Starting network connectivity tests...');

    // Test 1: Basic internet connectivity
    try {
      addResult('Testing basic internet connectivity...');
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      addResult(`✅ Internet OK: ${response.status}`);
    } catch (error) {
      addResult(`❌ Internet FAILED: ${error.message}`);
    }

    // Test 2: Production server connectivity
    try {
      addResult('Testing production server...');
      const response = await fetch('https://member.beanstalker.com.au/api/menu', {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      addResult(`✅ Server OK: ${response.status}`);
    } catch (error) {
      addResult(`❌ Server FAILED: ${error.message}`);
    }

    // Test 3: Authentication endpoint
    try {
      addResult('Testing auth endpoint...');
      const response = await fetch('https://member.beanstalker.com.au/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bean Stalker Mobile Test'
        },
        body: JSON.stringify({ username: 'test', password: 'test' }),
        signal: AbortSignal.timeout(10000)
      });
      addResult(`✅ Auth endpoint OK: ${response.status}`);
    } catch (error) {
      addResult(`❌ Auth endpoint FAILED: ${error.message}`);
    }

    // Test 4: With credentials
    try {
      addResult('Testing with valid credentials...');
      const response = await fetch('https://member.beanstalker.com.au/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bean Stalker Mobile Test'
        },
        body: JSON.stringify({ username: 'iamninz', password: 'password123' }),
        credentials: 'include',
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Login SUCCESS: User ${data.username}, Credits $${data.credits}`);
      } else {
        addResult(`❌ Login FAILED: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addResult(`❌ Login ERROR: ${error.message}`);
    }

    setIsRunning(false);
    addResult('Network tests completed.');
  };

  // Always show for testing purposes
  const isNative = Capacitor.isNativePlatform();

  return (
    <Card className="mx-4 my-2">
      <CardHeader>
        <CardTitle className="text-sm">
          Network Test {isNative ? '(Native)' : '(Web)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          onClick={runNetworkTests} 
          disabled={isRunning}
          className="w-full"
          size="sm"
        >
          {isRunning ? 'Testing...' : 'Run Network Test'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="bg-black/90 text-white p-2 rounded text-xs max-h-48 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}