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

  // Check biometric availability on mount with enhanced initialization
  useEffect(() => {
    console.log('🔐 BIOMETRIC: Initializing biometric authentication system...');
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      console.log('🔐 BIOMETRIC: Starting comprehensive biometric availability check...');
      setBiometricState(prev => ({ ...prev, isLoading: true }));

      // Run checks sequentially for better error handling
      console.log('🔐 BIOMETRIC: Step 1 - Checking availability...');
      const isAvailable = await biometricService.isAvailable();
      console.log('🔐 BIOMETRIC: Availability result:', isAvailable);
      
      if (!isAvailable) {
        console.log('🔐 BIOMETRIC: Biometric authentication not available on this device');
        setBiometricState({
          isAvailable: false,
          biometricType: 'unknown',
          hasStoredCredentials: false,
          isLoading: false,
        });
        return;
      }
      
      console.log('🔐 BIOMETRIC: Step 2 - Getting biometric type...');
      const biometricType = await biometricService.getBiometricType();
      console.log('🔐 BIOMETRIC: Biometric type:', biometricType);
      
      console.log('🔐 BIOMETRIC: Step 3 - Checking stored credentials...');
      const hasStoredCredentials = await biometricService.hasCredentials();
      console.log('🔐 BIOMETRIC: Has stored credentials:', hasStoredCredentials);

      const finalState = {
        isAvailable,
        biometricType,
        hasStoredCredentials,
        isLoading: false,
      };
      
      console.log('🔐 BIOMETRIC: Final state:', finalState);
      setBiometricState(finalState);
    } catch (error) {
      console.error('🔐 BIOMETRIC: Error during availability check:', error);
      setBiometricState(prev => ({ 
        ...prev, 
        isLoading: false,
        isAvailable: false 
      }));
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      console.log('🔐 HOOK: Starting biometric authentication process...');
      console.log('🔐 HOOK: Current biometric state:', {
        isAvailable: biometricState.isAvailable,
        biometricType: biometricState.biometricType,
        hasStoredCredentials: biometricState.hasStoredCredentials,
        isLoading: biometricState.isLoading
      });

      // Enhanced safety checks at hook level
      if (!biometricService || typeof biometricService.authenticateWithBiometrics !== 'function') {
        console.error('🔐 HOOK: Biometric service not properly initialized');
        throw new Error('Biometric service is not available');
      }

      // Re-check credentials in real-time in case they were just saved
      console.log('🔐 HOOK: Performing real-time credential check...');
      let hasRealTimeCredentials = false;
      
      try {
        hasRealTimeCredentials = await biometricService.hasCredentials();
        console.log('🔐 HOOK: Real-time credential check result:', hasRealTimeCredentials);
      } catch (credentialsError) {
        console.error('🔐 HOOK: Failed to check credentials:', credentialsError);
        // Continue with stored state value as fallback
        hasRealTimeCredentials = biometricState.hasStoredCredentials;
      }

      if (!biometricState.isAvailable) {
        console.log('🔐 HOOK: Biometric authentication not available');
        notify({
          title: "Biometric Authentication Unavailable",
          description: "Please use your username and password",
          variant: "destructive",
        });
        return false;
      }

      if (!hasRealTimeCredentials) {
        console.log('🔐 HOOK: No stored credentials found');
        notify({
          title: "No Biometric Login Set Up",
          description: "Sign in with password first to enable biometric login",
          variant: "destructive",
        });
        return false;
      }

      // Wrap biometric authentication in additional safety layer
      console.log('🔐 HOOK: Calling biometric service authenticateWithBiometrics...');
      let credentials = null;
      
      try {
        // Create a promise wrapper to catch any uncaught errors
        const authPromise = new Promise<any>((resolve, reject) => {
          biometricService.authenticateWithBiometrics()
            .then(resolve)
            .catch(reject);
        });
        
        // Add an additional timeout at the hook level
        const timeoutPromise = new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Hook-level authentication timeout')), 45000)
        );
        
        credentials = await Promise.race([authPromise, timeoutPromise]);
        console.log('🔐 HOOK: Biometric authentication result:', credentials ? 'success' : 'failed');
      } catch (authError: any) {
        console.error('🔐 HOOK: Biometric authentication failed:', authError);
        throw authError; // Re-throw to be handled by outer catch
      }
      
      if (credentials && credentials.username && credentials.password) {
        console.log('🔐 HOOK: Valid credentials received, attempting login...');
        
        try {
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

          console.log('🔐 HOOK: Login successful');
          return true;
        } catch (loginError: any) {
          console.error('🔐 HOOK: Login failed with biometric credentials:', loginError);
          throw new Error(`Login failed: ${loginError.message || 'Invalid credentials'}`);
        }
      } else {
        console.error('🔐 HOOK: Invalid credentials returned from biometric service');
        throw new Error('Invalid credentials retrieved from biometric authentication');
      }
    } catch (error: any) {
      console.error('🔐 HOOK: Biometric authentication failed:', error);
      console.error('🔐 HOOK: Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        name: error?.name
      });
      
      let errorMessage = 'Authentication failed. Please try again.';
      let errorTitle = 'Authentication Failed';
      
      if (error?.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('cancel') || msg.includes('user cancel')) {
          errorMessage = 'Authentication was cancelled';
          errorTitle = 'Authentication Cancelled';
        } else if (msg.includes('timeout')) {
          errorMessage = 'Authentication timed out. Please try again.';
          errorTitle = 'Authentication Timeout';
        } else if (msg.includes('not available') || msg.includes('unavailable')) {
          errorMessage = 'Biometric authentication is not available';
        } else if (msg.includes('no credentials') || msg.includes('not found')) {
          errorMessage = 'Please sign in with your password first to enable biometric login';
        } else if (msg.includes('lockout') || msg.includes('too many attempts')) {
          errorMessage = 'Too many failed attempts. Please wait and try again.';
        } else if (msg.includes('service') || msg.includes('plugin')) {
          errorMessage = 'Biometric service error. Please restart the app and try again.';
        } else if (msg.includes('login failed')) {
          errorMessage = 'Login failed with biometric credentials. Please sign in with password.';
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