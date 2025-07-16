import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DebugLog {
  timestamp: string;
  type: 'api' | 'auth' | 'error' | 'info';
  message: string;
  details?: any;
}

export function MobileDebugDisplay() {
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  
  // Only show debug on mobile/native platforms
  const shouldShow = Capacitor.isNativePlatform();
  
  useEffect(() => {
    if (!shouldShow) return;
    
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog(...args);
      
      const message = args.join(' ');
      if (message.includes('API Request') || message.includes('Login') || message.includes('Auth')) {
        addDebugLog('info', message, args[1]);
      }
    };
    
    console.error = (...args) => {
      originalError(...args);
      
      const message = args.join(' ');
      if (message.includes('API') || message.includes('Login') || message.includes('Auth')) {
        addDebugLog('error', message, args[1]);
      }
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [shouldShow]);
  
  const addDebugLog = (type: DebugLog['type'], message: string, details?: any) => {
    const newLog: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    
    setDebugLogs(prev => [...prev.slice(-9), newLog]); // Keep last 10 logs
  };
  
  if (!shouldShow) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2 bg-blue-500 text-white"
      >
        Debug {debugLogs.length > 0 && `(${debugLogs.length})`}
      </Button>
      
      {isVisible && (
        <Card className="w-80 max-h-96 overflow-hidden bg-black/90 text-white border-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex justify-between items-center">
              Mobile Debug Logs
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDebugLogs([])}
                className="text-xs"
              >
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-72 overflow-y-auto text-xs">
            {debugLogs.length === 0 ? (
              <p className="text-gray-400">No debug logs yet</p>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="border-b border-gray-700 pb-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant={log.type === 'error' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {log.type}
                    </Badge>
                    <span className="text-gray-400">{log.timestamp}</span>
                  </div>
                  <p className="text-white">{log.message}</p>
                  {log.details && (
                    <pre className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export a function to manually add debug logs
export const addMobileDebugLog = (type: DebugLog['type'], message: string, details?: any) => {
  // This will be handled by the component's console override
  if (type === 'error') {
    console.error(message, details);
  } else {
    console.log(message, details);
  }
};