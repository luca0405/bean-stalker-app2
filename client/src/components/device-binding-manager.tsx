import { useEffect, useState } from 'react';
import { deviceService } from '@/services/device-service';
import { useAuth } from '@/hooks/use-auth';
import { Capacitor } from '@capacitor/core';

interface DeviceBindingManagerProps {
  children: React.ReactNode;
}

export function DeviceBindingManager({ children }: DeviceBindingManagerProps) {
  const { user } = useAuth();
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setIsValidated(true);
      return;
    }

    const validateBinding = async () => {
      try {
        const validation = await deviceService.validateDeviceBinding();
        
        if (user && 'id' in user && user.id) {
          // User is logged in - ensure device is bound to this user
          if (!validation.isValid || validation.boundUserId !== user.id.toString()) {
            await deviceService.bindDeviceToAccount(user.id.toString());
            console.log('Device bound to current user:', user.id);
          }
        } else if (validation.isValid && validation.boundUserId) {
          // Device is bound but no user logged in - this shouldn't happen in one-account system
          console.log('Device bound to user but no session - maintaining binding');
        }
        
        setIsValidated(true);
      } catch (error) {
        console.error('Device binding validation failed:', error);
        setIsValidated(true); // Continue anyway
      }
    };

    validateBinding();
  }, [user]);

  if (!isValidated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-700 font-medium">Setting up your device...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}