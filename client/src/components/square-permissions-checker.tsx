import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Settings, Key } from 'lucide-react';

interface PermissionCheck {
  permission: string;
  description: string;
  status: 'success' | 'error' | 'unknown';
  required: boolean;
}

export function SquarePermissionsChecker() {
  const [permissions, setPermissions] = useState<PermissionCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const requiredPermissions = [
    { name: 'MERCHANT_PROFILE_READ', desc: 'Read business locations and info', required: true },
    { name: 'ORDERS_READ', desc: 'Read order data', required: true },
    { name: 'ORDERS_WRITE', desc: 'Create and update orders', required: true },
    { name: 'PAYMENTS_READ', desc: 'Read payment information', required: true },
    { name: 'PAYMENTS_WRITE', desc: 'Process payments', required: true },
    { name: 'ITEMS_READ', desc: 'Read catalog items', required: false },
    { name: 'CUSTOMERS_READ', desc: 'Read customer information', required: false },
  ];

  const checkPermissions = async () => {
    setIsChecking(true);
    
    // Simulate permission checking by testing API endpoints
    const permissionResults: PermissionCheck[] = [];
    
    for (const perm of requiredPermissions) {
      try {
        // Test the API endpoint to see if permission works
        let status: 'success' | 'error' | 'unknown' = 'unknown';
        
        if (perm.name === 'MERCHANT_PROFILE_READ') {
          // Test locations endpoint
          const response = await fetch('/api/debug/square-test');
          const data = await response.json();
          status = data.success ? 'success' : 'error';
        } else {
          // For other permissions, we'd need specific test endpoints
          status = 'unknown';
        }
        
        permissionResults.push({
          permission: perm.name,
          description: perm.desc,
          status,
          required: perm.required
        });
      } catch (error) {
        permissionResults.push({
          permission: perm.name,
          description: perm.desc,
          status: 'error',
          required: perm.required
        });
      }
    }
    
    setPermissions(permissionResults);
    setIsChecking(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">✓</Badge>;
      case 'error':
        return <Badge variant="destructive">✗</Badge>;
      default:
        return <Badge variant="secondary">?</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Square API Permissions Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <strong>Setup Required:</strong> Configure these permissions in your Square Developer Dashboard → Your App → OAuth/Scopes section.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={checkPermissions} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Checking Permissions...' : 'Check API Permissions'}
        </Button>

        {permissions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Required Permissions</h3>
            {permissions.filter(p => p.required).map((perm, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {getStatusIcon(perm.status)}
                  <div>
                    <div className="font-medium">{perm.permission}</div>
                    <div className="text-sm text-gray-600">{perm.description}</div>
                  </div>
                </div>
                {getStatusBadge(perm.status)}
              </div>
            ))}

            <h3 className="font-semibold">Optional Permissions</h3>
            {permissions.filter(p => !p.required).map((perm, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded opacity-75">
                <div className="flex items-center gap-3">
                  {getStatusIcon(perm.status)}
                  <div>
                    <div className="font-medium">{perm.permission}</div>
                    <div className="text-sm text-gray-600">{perm.description}</div>
                  </div>
                </div>
                {getStatusBadge(perm.status)}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">How to Fix Permission Issues:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Go to <strong>Square Developer Dashboard</strong></li>
            <li>Select your <strong>production application</strong></li>
            <li>Find <strong>"OAuth" or "Scopes"</strong> section</li>
            <li>Enable all required permissions above</li>
            <li>Generate <strong>new access token</strong> with updated permissions</li>
            <li>Update <strong>SQUARE_ACCESS_TOKEN_PROD</strong> in Replit Secrets</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}