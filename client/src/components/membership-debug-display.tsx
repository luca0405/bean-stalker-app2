import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DebugStep {
  step: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  details: string;
  timestamp: string;
}

interface MembershipDebugDisplayProps {
  debugSteps: DebugStep[];
  isVisible: boolean;
  onClose: () => void;
}

export function MembershipDebugDisplay({ debugSteps, isVisible, onClose }: MembershipDebugDisplayProps) {
  if (!isVisible || debugSteps.length === 0) return null;

  const getStatusIcon = (status: DebugStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: DebugStep['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            RevenueCat Membership Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {debugSteps.map((step, index) => (
            <div key={index} className={`p-3 rounded-lg border ${getStatusColor(step.status)}`}>
              <div className="flex items-start space-x-3">
                {getStatusIcon(step.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.step}</p>
                  <p className="text-xs text-gray-600 mt-1">{step.details}</p>
                  <p className="text-xs text-gray-400 mt-1">{step.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="pt-4">
            <Button onClick={onClose} className="w-full">
              Close Debug Info
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}