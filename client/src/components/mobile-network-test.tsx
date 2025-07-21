import { useState } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
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
      let response;
      
      if (isNative) {
        // Try multiple reliable endpoints for mobile
        const testUrls = ['https://www.google.com', 'https://www.apple.com', 'https://httpbin.org/get'];
        let success = false;
        
        for (const testUrl of testUrls) {
          try {
            const nativeResponse = await CapacitorHttp.request({
              url: testUrl,
              method: 'GET',
              connectTimeout: 5000,
              readTimeout: 5000
            });
            response = { status: nativeResponse.status };
            success = true;
            break;
          } catch (urlError) {
            continue;
          }
        }
        
        if (!success) {
          throw new Error('All connectivity tests failed');
        }
      } else {
        response = await fetch('https://httpbin.org/get', {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });
      }
      
      addResult(`✅ Internet OK: ${response.status}`);
    } catch (error) {
      addResult(`⚠️ Internet Limited: ${error.message} (Bean Stalker should still work)`);
    }

    // Test 2: Production server connectivity
    try {
      addResult('Testing production server...');
      let response;
      
      if (isNative) {
        const nativeResponse = await CapacitorHttp.request({
          url: 'https://member.beanstalker.com.au/api/menu',
          method: 'GET',
          headers: {
            'User-Agent': 'Bean Stalker Mobile Test',
            'Accept': 'application/json'
          },
          connectTimeout: 10000,
          readTimeout: 10000
        });
        response = { status: nativeResponse.status };
      } else {
        response = await fetch('https://member.beanstalker.com.au/api/menu', {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });
      }
      
      addResult(`✅ Server OK: ${response.status}`);
    } catch (error) {
      addResult(`❌ Server FAILED: ${error.message}`);
    }

    // Test 3: Authentication endpoint
    try {
      addResult('Testing auth endpoint...');
      let response;
      
      if (isNative) {
        const nativeResponse = await CapacitorHttp.request({
          url: 'https://member.beanstalker.com.au/api/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bean Stalker Mobile Test',
            'Accept': 'application/json'
          },
          data: JSON.stringify({ username: 'test', password: 'test' }),
          connectTimeout: 10000,
          readTimeout: 10000
        });
        response = { status: nativeResponse.status };
      } else {
        response = await fetch('https://member.beanstalker.com.au/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bean Stalker Mobile Test'
          },
          body: JSON.stringify({ username: 'test', password: 'test' }),
          signal: AbortSignal.timeout(10000)
        });
      }
      
      addResult(`✅ Auth endpoint OK: ${response.status}`);
    } catch (error) {
      addResult(`❌ Auth endpoint FAILED: ${error.message}`);
    }

    // Test 4: With credentials
    try {
      addResult('Testing with valid credentials...');
      
      if (isNative) {
        const nativeResponse = await CapacitorHttp.request({
          url: 'https://member.beanstalker.com.au/api/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bean Stalker Mobile Test',
            'Accept': 'application/json'
          },
          data: JSON.stringify({ username: 'iamninz', password: 'password123' }),
          connectTimeout: 10000,
          readTimeout: 10000,
          // Enable cookies for session handling
          webFetchExtra: {
            credentials: 'include'
          }
        });
        
        if (nativeResponse.status === 200) {
          const data = typeof nativeResponse.data === 'string' ? JSON.parse(nativeResponse.data) : nativeResponse.data;
          addResult(`✅ LOGIN SUCCESS: User ${data.username}, Credits $${data.credits}`);
          
          // Test session persistence with a follow-up request
          try {
            const sessionTest = await CapacitorHttp.request({
              url: 'https://member.beanstalker.com.au/api/user',
              method: 'GET',
              headers: {
                'User-Agent': 'Bean Stalker Mobile Test',
                'Accept': 'application/json'
              },
              connectTimeout: 5000,
              readTimeout: 5000,
              webFetchExtra: {
                credentials: 'include'
              }
            });
            
            if (sessionTest.status === 200) {
              addResult(`✅ SESSION PERSISTENCE: Authentication working properly`);
            } else {
              addResult(`⚠️ SESSION ISSUE: Status ${sessionTest.status} - cookies may not be persisting`);
            }
          } catch (sessionError) {
            addResult(`⚠️ SESSION TEST FAILED: ${sessionError.message}`);
          }
        } else {
          addResult(`❌ Login FAILED: ${nativeResponse.status}`);
        }
      } else {
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
          addResult(`✅ LOGIN SUCCESS: User ${data.username}, Credits $${data.credits}`);
        } else {
          addResult(`❌ Login FAILED: ${response.status} ${response.statusText}`);
        }
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