import { useState, useEffect } from 'react';
import { biometricService } from '@/services/biometric-service';
import { useAuth } from '@/hooks/use-auth';
import { useNativeNotification } from '@/services/native-notification-service';

export interface BiometricAuthState {
  isAvailable: boolean;
  biometricType: string;
  hasStoredCredentials: boolean;
  isLoading: boolean;
}

export function useBiometricAuth() {
  const { loginMutation } = useAuth();
  const { notify } = useNativeNotification();
  
  const [biometricState, setBiometricState] = useState<BiometricAuthState>({
    isAvailable: false,
    biometricType: 'unknown',
    hasStoredCredentials: false,
    isLoading: true,
  });

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      setBiometricState(prev => ({ ...prev, isLoading: true }));

      const [isAvailable, biometricType, hasStoredCredentials] = await Promise.all([
        biometricService.isAvailable(),
        biometricService.getBiometricType(),
        biometricService.hasStoredCredentials(),
      ]);

      setBiometricState({
        isAvailable,
        biometricType,
        hasStoredCredentials,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricState(prev => ({ 
        ...prev, 
        isLoading: false,
        isAvailable: false 
      }));
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      console.log('Starting biometric authentication process...');
      console.log('Biometric state:', {
        isAvailable: biometricState.isAvailable,
        biometricType: biometricState.biometricType,
        hasStoredCredentials: biometricState.hasStoredCredentials
      });

      if (!biometricState.isAvailable) {
        notify({
          title: "Biometric Authentication Unavailable",
          description: "Please use your username and password",
          variant: "destructive",
        });
        return false;
      }

      if (!biometricState.hasStoredCredentials) {
        notify({
          title: "No Biometric Login Set Up",
          description: "Sign in with password first to enable biometric login",
          variant: "destructive",
        });
        return false;
      }

      // Perform biometric authentication with enhanced error handling
      console.log('Calling biometric service authenticate...');
      const credentials = await biometricService.authenticateWithBiometrics();
      console.log('Biometric authentication result:', credentials ? 'success' : 'failed');
      
      if (credentials && credentials.username && credentials.password) {
        console.log('Attempting login with biometric credentials...');
        
        // Use existing login mutation with biometric credentials (don't save again)
        await loginMutation.mutateAsync({
          username: credentials.username,
          password: credentials.password,
          saveBiometric: false // Don't save credentials again for biometric login
        });

        const authType = getBiometricDisplayName(biometricState.biometricType || 'biometric');
        notify({
          title: "Authentication Successful",
          description: `Signed in with ${authType}`,
        });

        return true;
      } else {
        console.error('Invalid credentials returned from biometric service');
        notify({
          title: "Authentication Failed",
          description: "Invalid credentials retrieved",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      let errorMessage = 'Authentication failed. Please try again.';
      let errorTitle = 'Authentication Failed';
      
      if (error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('cancel') || msg.includes('user cancel')) {
          errorMessage = 'Authentication was cancelled';
          errorTitle = 'Authentication Cancelled';
        } else if (msg.includes('not available') || msg.includes('unavailable')) {
          errorMessage = 'Biometric authentication is not available';
        } else if (msg.includes('no credentials') || msg.includes('not found')) {
          errorMessage = 'Please sign in with your password first to enable biometric login';
        } else if (msg.includes('lockout') || msg.includes('too many attempts')) {
          errorMessage = 'Too many failed attempts. Please wait and try again.';
        }
      }

      notify({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });

      return false;
    }
  };

  const setupBiometricAuth = async (username: string, password: string): Promise<boolean> => {
    try {
      if (!biometricState.isAvailable) {
        return false;
      }

      const success = await biometricService.saveCredentials(username, password);
      
      if (success) {
        setBiometricState(prev => ({ 
          ...prev, 
          hasStoredCredentials: true 
        }));

        const authType = getBiometricDisplayName(biometricState.biometricType || 'biometric');
        notify({
          title: "Biometric Login Enabled",
          description: `You can now sign in with ${authType}`,
        });
      }

      return success;
    } catch (error) {
      console.error('Failed to setup biometric auth:', error);
      notify({
        title: "Setup Failed",
        description: "Could not enable biometric authentication",
        variant: "destructive",
      });
      return false;
    }
  };

  const disableBiometricAuth = async (): Promise<boolean> => {
    try {
      const success = await biometricService.deleteCredentials();
      
      if (success) {
        setBiometricState(prev => ({ 
          ...prev, 
          hasStoredCredentials: false 
        }));

        notify({
          title: "Biometric Login Disabled",
          description: "Biometric authentication has been turned off",
        });
      }

      return success;
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      notify({
        title: "Error",
        description: "Could not disable biometric authentication",
        variant: "destructive",
      });
      return false;
    }
  };

  const getBiometricDisplayName = (type: string): string => {
    if (!type || typeof type !== 'string') {
      return 'Biometric Authentication';
    }
    
    // Normalize the type to handle various formats
    const normalizedType = type.toString().toLowerCase();
    
    switch (normalizedType) {
      case 'faceid':
      case 'face_id':
      case 'face id':
        return 'Face ID';
      case 'touchid':
      case 'touch_id':
      case 'touch id':
        return 'Touch ID';
      case 'fingerprint':
      case 'fingerprint_sensor':
        return 'Fingerprint';
      case 'biometric':
        return 'Biometric Authentication';
      default:
        return 'Biometric Authentication';
    }
  };

  const getBiometricIcon = (type: string): string => {
    if (!type || typeof type !== 'string') {
      return '🔐'; // Generic biometric icon
    }
    
    switch (type.toLowerCase()) {
      case 'faceid':
        return '🔒'; // Face ID icon
      case 'touchid':
        return '👆'; // Touch ID icon
      case 'fingerprint':
        return '👆'; // Fingerprint icon
      default:
        return '🔐'; // Generic biometric icon
    }
  };

  return {
    biometricState,
    authenticateWithBiometrics,
    setupBiometricAuth,
    disableBiometricAuth,
    checkBiometricAvailability,
    getBiometricDisplayName,
    getBiometricIcon,
    isAuthenticating: loginMutation.isPending,
  };
}