import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

interface AuthDebugProps {
  onDebugComplete?: (result: string) => void;
}

export function MobileAuthDebug({ onDebugComplete }: AuthDebugProps) {
  const [debugResult, setDebugResult] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setDebugResult(prev => prev + message + '\n');
  };

  const runAuthDebug = async () => {
    setIsRunning(true);
    setDebugResult('');
    
    addResult('🔍 MOBILE AUTH DEBUG STARTING...\n');
    
    const isNative = Capacitor.isNativePlatform();
    const baseUrl = 'https://member.beanstalker.com.au';
    
    addResult(`Platform: ${isNative ? 'Native iOS' : 'Web'}`);
    addResult(`Base URL: ${baseUrl}`);
    addResult(`User Agent: ${navigator.userAgent.substring(0, 50)}...`);
    addResult('');

    try {
      // Step 1: Direct authentication test using same credentials that work with curl
      addResult('STEP 1: Direct Login Test with iamninz/password123');
      
      const loginData = {
        username: 'iamninz',
        password: 'password123'
      };
      
      let loginResponse;
      
      if (isNative) {
        // Native HTTP request with detailed logging
        const options = {
          url: `${baseUrl}/api/login`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bean Stalker Mobile Debug',
            'Accept': 'application/json'
          },
          data: JSON.stringify(loginData),
          connectTimeout: 15000,
          readTimeout: 15000
        };
        
        addResult(`🔗 Native request to: ${options.url}`);
        addResult(`📝 Headers: ${JSON.stringify(options.headers, null, 2)}`);
        addResult(`📦 Body: ${options.data}`);
        
        const nativeResponse = await CapacitorHttp.request(options);
        
        addResult(`📊 Response Status: ${nativeResponse.status}`);
        addResult(`📋 Response Headers: ${JSON.stringify(nativeResponse.headers, null, 2)}`);
        addResult(`💾 Response Data: ${JSON.stringify(nativeResponse.data, null, 2)}`);
        
        loginResponse = {
          status: nativeResponse.status,
          headers: nativeResponse.headers,
          data: nativeResponse.data
        };
      } else {
        // Web fetch request
        const response = await fetch(`${baseUrl}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(loginData),
          credentials: 'include'
        });
        
        const responseData = await response.json();
        
        addResult(`📊 Response Status: ${response.status}`);
        addResult(`💾 Response Data: ${JSON.stringify(responseData, null, 2)}`);
        
        loginResponse = {
          status: response.status,
          data: responseData
        };
      }
      
      if (loginResponse.status === 200) {
        addResult('✅ LOGIN SUCCESS!');
        
        // Step 2: Test session persistence
        addResult('\nSTEP 2: Session Persistence Test');
        
        try {
          let userResponse;
          
          if (isNative) {
            const sessionOptions = {
              url: `${baseUrl}/api/user`,
              method: 'GET',
              headers: {
                'User-Agent': 'Bean Stalker Mobile Debug',
                'Accept': 'application/json'
              },
              connectTimeout: 10000,
              readTimeout: 10000
            };
            
            const sessionNativeResponse = await CapacitorHttp.request(sessionOptions);
            addResult(`🔍 Session test status: ${sessionNativeResponse.status}`);
            addResult(`🔍 Session response: ${JSON.stringify(sessionNativeResponse.data, null, 2)}`);
            
            userResponse = {
              status: sessionNativeResponse.status,
              data: sessionNativeResponse.data
            };
          } else {
            const response = await fetch(`${baseUrl}/api/user`, {
              method: 'GET',
              credentials: 'include'
            });
            
            const userData = await response.json();
            addResult(`🔍 Session test status: ${response.status}`);
            addResult(`🔍 Session response: ${JSON.stringify(userData, null, 2)}`);
            
            userResponse = {
              status: response.status,
              data: userData
            };
          }
          
          if (userResponse.status === 200) {
            addResult('✅ SESSION WORKING - User data retrieved successfully!');
          } else {
            addResult('❌ SESSION FAILED - Login succeeded but session not persisting');
            addResult('🔧 SOLUTION: This indicates cookie/session handling issue in mobile app');
          }
          
        } catch (sessionError) {
          addResult(`❌ SESSION ERROR: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`);
        }
        
      } else if (loginResponse.status === 401) {
        addResult('❌ LOGIN FAILED - Invalid Credentials');
        addResult('🔧 Check: Ensure iamninz/password123 exists in database');
      } else {
        addResult(`❌ LOGIN FAILED - Status: ${loginResponse.status}`);
        addResult(`📝 Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
      }
      
    } catch (error) {
      addResult(`💥 CRITICAL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      addResult(`🔧 SOLUTION NEEDED: Check network connectivity and server status`);
    }
    
    addResult('\n🔍 DEBUG COMPLETE - Analysis above shows exact issue');
    setIsRunning(false);
    
    if (onDebugComplete) {
      onDebugComplete(debugResult);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Mobile Authentication Debug</h3>
      
      <button
        onClick={runAuthDebug}
        disabled={isRunning}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
      >
        {isRunning ? 'Running Debug...' : 'Start Auth Debug'}
      </button>
      
      {debugResult && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Debug Results:</h4>
          <pre className="bg-black text-green-400 p-4 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
            {debugResult}
          </pre>
        </div>
      )}
    </div>
  );
}