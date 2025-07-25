import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { deviceService } from '@/services/device-service';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'wouter';

export function AccountSwitcher() {
  const { logout, user } = useAuth();
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [, navigate] = useNavigate();

  const handleSwitchAccount = async () => {
    if (!Capacitor.isNativePlatform()) {
      await logout();
      navigate('/auth');
      return;
    }

    setIsUnbinding(true);
    try {
      // Logout from current session
      await logout();
      
      // Unbind device (clears all data including biometric credentials)
      await deviceService.unbindDevice();
      
      console.log('Device unbound successfully - ready for new account');
      
      // Navigate to auth page for new account registration
      navigate('/auth');
    } catch (error) {
      console.error('Failed to switch account:', error);
    } finally {
      setIsUnbinding(false);
    }
  };

  if (!user) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LogOut className="h-4 w-4" />
          Switch Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Switch Account
          </AlertDialogTitle>
          <AlertDialogDescription>
            This device is set up for one account only. Switching accounts will:
            <br />
            <br />
            • Log out {user.username || 'current user'}
            <br />
            • Clear all saved data and biometric credentials
            <br />
            • Allow you to register or login with a different account
            <br />
            <br />
            <strong>This action cannot be undone.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSwitchAccount}
            disabled={isUnbinding}
            className="bg-red-600 hover:bg-red-700"
          >
            {isUnbinding ? 'Switching...' : 'Switch Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}