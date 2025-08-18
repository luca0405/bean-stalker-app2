/**
 * Apple Wallet Debug Panel
 * Shows detailed debugging information for Apple Wallet integration
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bug, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface DebugLog {
  id: string;
  timestamp: number;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: any;
}

interface AppleWalletDebugProps {
  userId: number;
  username: string;
  currentBalance: number;
}

export function AppleWalletDebugPanel({ userId, username, currentBalance }: AppleWalletDebugProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);

  // Capture console logs for Apple Wallet debugging
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    const addLog = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
      if (message.includes('🍎') || message.includes('Apple Wallet') || message.includes('NATIVE')) {
        const log: DebugLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          level,
          message,
          data
        };
        setLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
      }
    };

    console.log = (...args) => {
      originalConsoleLog(...args);
      addLog('info', args.join(' '));
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      addLog('error', args.join(' '));
    };

    console.warn = (...args) => {
      originalConsoleWarn(...args);
      addLog('warn', args.join(' '));
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  const testConfiguration = async () => {
    setIsTestingConfig(true);
    console.log('🍎 NATIVE: Testing Apple Wallet configuration...');
    
    try {
      const response = await fetch('/api/apple-wallet/test');
      const result = await response.json();
      setConfigStatus(result);
      console.log('🍎 NATIVE: Configuration test result:', result);
    } catch (error) {
      console.error('🍎 NATIVE: Configuration test failed:', error);
      setConfigStatus({ error: 'Failed to test configuration' });
    } finally {
      setIsTestingConfig(false);
    }
  };

  const testPassGeneration = async () => {
    console.log('🍎 NATIVE: Testing pass generation with current user data...');
    console.log('🍎 NATIVE: User ID:', userId, 'Username:', username, 'Balance:', currentBalance);
    
    try {
      // First test the debug endpoint
      console.log('🍎 NATIVE: Testing debug endpoint...');
      const debugResponse = await fetch('/api/apple-wallet/test-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('🍎 NATIVE: Debug endpoint status:', debugResponse.status);
      const debugResult = await debugResponse.json().catch(() => ({ error: 'Invalid JSON response' }));
      console.log('🍎 NATIVE: Debug endpoint result:', debugResult);
      
      // Then test the service directly
      const { AppleWalletService } = await import('@/services/apple-wallet-service');
      const result = await AppleWalletService.updateCreditPass(userId, username, currentBalance);
      console.log('🍎 NATIVE: Service test result:', result);
    } catch (error) {
      console.error('🍎 NATIVE: Pass generation test failed:', error);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    console.log('🍎 NATIVE: Debug logs cleared');
  };

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}${log.data ? '\nData: ' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      console.log('🍎 NATIVE: Logs copied to clipboard');
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
      >
        <Bug className="w-4 h-4 mr-2" />
        Apple Wallet Debug
      </Button>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
      <Card className="h-full">
        <CardHeader className="bg-yellow-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Apple Wallet Debug Panel
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 h-full overflow-auto">
          {/* Configuration Status */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">Configuration Status</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={testConfiguration}
                disabled={isTestingConfig}
              >
                {isTestingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Test Config
              </Button>
            </div>
            
            {configStatus && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>Ready: <Badge variant={configStatus.ready ? "default" : "destructive"}>{configStatus.ready ? "Yes" : "No"}</Badge></div>
                  <div>Team ID: <code className="bg-gray-200 px-1 rounded">{configStatus.teamId || 'Not set'}</code></div>
                  <div>Certificates: <Badge variant={configStatus.configured ? "default" : "destructive"}>{configStatus.configured ? "OK" : "Missing"}</Badge></div>
                  <div>Files: <Badge variant={configStatus.filesExist?.pass_cert && configStatus.filesExist?.wwdr_cert ? "default" : "destructive"}>
                    {configStatus.filesExist?.pass_cert && configStatus.filesExist?.wwdr_cert ? "Present" : "Missing"}
                  </Badge></div>
                </div>
                {configStatus.status && <div className="mt-2 text-gray-600">{configStatus.status}</div>}
                {configStatus.validation && !configStatus.validation.testPassValid && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                    <strong>Validation Errors:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {configStatus.validation.errors.map((error: string, i: number) => (
                        <li key={i} className="text-xs">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Actions */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testPassGeneration}
              >
                Test Pass Generation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
              >
                Clear Logs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLogs}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Logs
              </Button>
            </div>
          </div>

          {/* Platform Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Platform Information</h4>
            <div className="text-sm grid grid-cols-2 gap-2">
              <div>Platform: <code>{Capacitor.getPlatform()}</code></div>
              <div>Native: <code>{Capacitor.isNativePlatform() ? 'Yes' : 'No'}</code></div>
              <div>User Agent: <code className="text-xs">{navigator.userAgent.substring(0, 50)}...</code></div>
            </div>
          </div>

          {/* Debug Logs */}
          <div>
            <h3 className="font-semibold mb-2">Debug Logs ({logs.length})</h3>
            <div className="space-y-2 max-h-64 overflow-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No Apple Wallet debug logs yet. Try using the Apple Wallet button to generate logs.
                </div>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg text-sm ${
                      log.level === 'error' 
                        ? 'bg-red-50 border border-red-200 text-red-800' 
                        : log.level === 'warn'
                        ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-xs text-gray-500 mb-1">
                          {formatTimestamp(log.timestamp)}
                        </div>
                        <div className="break-words">{log.message}</div>
                        {log.data && (
                          <pre className="mt-1 text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {log.level}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}