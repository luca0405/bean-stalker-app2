import { useState, useEffect } from 'react';
import { biometricService } from '@/services/biometric-service';
import { useAuth } from '@/hooks/use-auth';
import { useNativeNotifications } from '@/hooks/use-native-notifications';

export interface BiometricAuthState {
  isAvailable: boolean;
  biometricType: string;
  hasStoredCredentials: boolean;
  isLoading: boolean;
}

export function useBiometricAuth() {
  const { loginMutation } = useAuth();
  const { notifySuccess, notifyError } = useNativeNotifications();
  
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
      if (!biometricState.isAvailable) {
        notifyError("Biometric Authentication Unavailable", "Please use your username and password");
        return false;
      }

      if (!biometricState.hasStoredCredentials) {
        notifyError("No Biometric Login Set Up", "Sign in with password first to enable biometric login");
        return false;
      }

      // Perform biometric authentication
      const credentials = await biometricService.authenticateWithBiometrics();
      
      if (credentials) {
        // Use existing login mutation with biometric credentials
        await loginMutation.mutateAsync({
          username: credentials.username,
          password: credentials.password,
        });

        const authType = getBiometricDisplayName(biometricState.biometricType);
        notifySuccess("Authentication Successful", `Signed in with ${authType}`);

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      
      let errorMessage = 'Authentication failed';
      if (error.message?.includes('User cancel')) {
        errorMessage = 'Authentication cancelled';
      } else if (error.message?.includes('not available')) {
        errorMessage = 'Biometric authentication not available';
      }

      notifyError("Authentication Failed", errorMessage);

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

        const authType = getBiometricDisplayName(biometricState.biometricType);
        notifySuccess("Biometric Login Enabled", `You can now sign in with ${authType}`);
      }

      return success;
    } catch (error) {
      console.error('Failed to setup biometric auth:', error);
      notifyError("Setup Failed", "Could not enable biometric authentication");
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

        notifySuccess("Biometric Login Disabled", "Biometric authentication has been turned off");
      }

      return success;
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      notifyError("Error", "Could not disable biometric authentication");
      return false;
    }
  };

  const getBiometricDisplayName = (type: string): string => {
    if (!type || typeof type !== 'string') {
      return 'Biometric authentication';
    }
    
    switch (type.toLowerCase()) {
      case 'faceid':
        return 'Face ID';
      case 'touchid':
        return 'Touch ID';
      case 'fingerprint':
        return 'Fingerprint';
      default:
        return 'Biometric authentication';
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