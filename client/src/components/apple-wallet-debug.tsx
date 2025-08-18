/**
 * Apple Wallet Debug Component
 * Shows certificate status and configuration for development/TestFlight testing
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Apple, Server, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface AppleWalletStatus {
  ready: boolean;
  teamId: string;
  certificates: {
    p12: string;
    wwdr: string;
    valid: boolean;
  };
  files: {
    passGenerator: string;
    status: string;
  };
  error: string | null;
}

export function AppleWalletDebug() {
  const [status, setStatus] = useState<AppleWalletStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/apple-wallet/test');
      const data = await response.json();
      setStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Apple Wallet status check failed:', error);
      setStatus({
        ready: false,
        teamId: 'Unknown',
        certificates: { p12: 'Error', wwdr: 'Error', valid: false },
        files: { passGenerator: 'Error', status: 'Error' },
        error: error instanceof Error ? error.message : 'Failed to check status'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const getStatusIcon = (isGood: boolean) => {
    if (isGood) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: string, isGood: boolean) => {
    return (
      <Badge variant={isGood ? "default" : "destructive"} className="ml-2">
        {status}
      </Badge>
    );
  };

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg">Apple Wallet Debug</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
        </div>
        <CardDescription>
          Verify Apple Wallet certificates and configuration
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Platform Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-gray-600" />
            <span className="font-medium">Platform Information</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Platform:</span>
              <Badge variant="outline">{platform}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Native App:</span>
              <Badge variant={isNative ? "default" : "secondary"}>
                {isNative ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Server Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-gray-600" />
            <span className="font-medium">Server Configuration</span>
          </div>
          
          {status ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Status:</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.ready)}
                  {getStatusBadge(status.ready ? 'Ready' : 'Not Ready', status.ready)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Team ID:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {status.teamId}
                </Badge>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Certificates:</span>
                <div className="ml-4 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>P12 Certificate:</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(status.certificates.p12 !== 'Error')}
                      <span className="text-gray-600">{status.certificates.p12}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>WWDR Certificate:</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(status.certificates.wwdr !== 'Error')}
                      <span className="text-gray-600">{status.certificates.wwdr}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Valid Configuration:</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(status.certificates.valid)}
                      <span className="text-gray-600">
                        {status.certificates.valid ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Pass Generator:</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.files.passGenerator === 'Available')}
                  <span className="text-xs text-gray-600">{status.files.status}</span>
                </div>
              </div>

              {status.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{status.error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500">
                {loading ? 'Checking status...' : 'Status not loaded'}
              </div>
            </div>
          )}
        </div>

        {lastChecked && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}