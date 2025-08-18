import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export interface BiometricCredentials {
  username: string;
  password: string;
}

class BiometricService {
  private readonly CREDENTIAL_KEY = 'bean-stalker-credentials';

  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable(): Promise<boolean> {
    try {
      console.log('🔐 BIOMETRIC: Checking plugin availability...');
      
      // Check if NativeBiometric plugin exists
      if (!NativeBiometric) {
        console.log('🔐 BIOMETRIC: NativeBiometric plugin not loaded');
        return false;
      }
      
      // Check if isAvailable method exists
      if (!NativeBiometric.isAvailable || typeof NativeBiometric.isAvailable !== 'function') {
        console.log('🔐 BIOMETRIC: isAvailable method not available');
        return false;
      }
      
      console.log('🔐 BIOMETRIC: Calling NativeBiometric.isAvailable()...');
      const result = await NativeBiometric.isAvailable();
      console.log('🔐 BIOMETRIC: Availability result:', result);
      
      return result?.isAvailable === true;
    } catch (error) {
      console.error('🔐 BIOMETRIC: Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get available biometric types (Face ID, Touch ID, Fingerprint)
   */
  async getBiometricType(): Promise<string> {
    try {
      const result = await NativeBiometric.isAvailable();
      // Handle different possible return formats safely
      const biometryType = result.biometryType;
      
      if (biometryType) {
        if (typeof biometryType === 'string') {
          return String(biometryType).toLowerCase();
        } else if (typeof biometryType === 'number') {
          // Convert numeric codes to string types
          switch (biometryType) {
            case 1: return 'touchid';
            case 2: return 'faceid';
            case 3: return 'fingerprint';
            default: return 'biometric';
          }
        }
      }
      
      return 'biometric';
    } catch (error) {
      console.log('Could not determine biometric type:', error);
      return 'biometric';
    }
  }

  /**
   * Save user credentials securely for biometric authentication
   */
  async saveCredentials(username: string, password: string): Promise<boolean> {
    try {
      console.log('💾 BIOMETRIC: Saving credentials for user:', username);
      console.log('💾 BIOMETRIC: Using credential key:', this.CREDENTIAL_KEY);
      
      // First check if biometric authentication is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        console.error('💾 BIOMETRIC: Cannot save credentials - biometric authentication not available');
        return false;
      }
      
      await NativeBiometric.setCredentials({
        username,
        password,
        server: this.CREDENTIAL_KEY,
      });
      
      console.log('💾 BIOMETRIC: Credentials saved successfully');
      
      // Verify credentials were saved
      const verifyCredentials = await this.hasCredentials();
      console.log('💾 BIOMETRIC: Verification check:', verifyCredentials);
      
      return verifyCredentials;
    } catch (error) {
      console.error('💾 BIOMETRIC: Failed to save credentials:', error);
      return false;
    }
  }

  /**
   * Check if credentials are saved for biometric authentication
   */
  async hasCredentials(): Promise<boolean> {
    try {
      console.log('🔍 BIOMETRIC: Checking for stored credentials...');
      const credentials = await NativeBiometric.getCredentials({
        server: this.CREDENTIAL_KEY,
      });
      console.log('🔍 BIOMETRIC: Credentials response:', credentials);
      
      // Check if we actually have valid credentials
      const hasValidCredentials = !!(credentials?.username && credentials?.password);
      console.log('🔍 BIOMETRIC: Has valid credentials:', hasValidCredentials);
      console.log('🔍 BIOMETRIC: Username present:', !!credentials?.username);
      console.log('🔍 BIOMETRIC: Password present:', !!credentials?.password);
      
      return hasValidCredentials;
    } catch (error: any) {
      console.log('🔍 BIOMETRIC: No credentials found or error occurred:', error.message || error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics and retrieve credentials
   */
  async authenticateWithBiometrics(): Promise<BiometricCredentials | null> {
    try {
      console.log('🔐 BIOMETRIC: Starting authentication process...');
      
      // Enhanced safety checks with timeout protection
      if (!NativeBiometric) {
        console.error('🔐 BIOMETRIC: NativeBiometric plugin not available');
        throw new Error('Biometric plugin not available');
      }
      
      // Check if biometrics are available with timeout
      console.log('🔐 BIOMETRIC: Checking availability...');
      const isAvailablePromise = this.isAvailable();
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Availability check timeout')), 5000)
      );
      
      const isAvailable = await Promise.race([isAvailablePromise, timeoutPromise]);
      console.log('🔐 BIOMETRIC: Availability result:', isAvailable);
      
      if (!isAvailable) {
        throw new Error('Biometric authentication not available on this device');
      }

      // Check if credentials are stored with timeout protection
      console.log('🔐 BIOMETRIC: Checking stored credentials...');
      const hasCredentialsPromise = this.hasCredentials();
      const credentialsTimeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Credentials check timeout')), 5000)
      );
      
      const hasCredentials = await Promise.race([hasCredentialsPromise, credentialsTimeoutPromise]);
      console.log('🔐 BIOMETRIC: Has stored credentials:', hasCredentials);
      
      if (!hasCredentials) {
        throw new Error('No biometric credentials stored. Please sign in with your password first.');
      }

      // Get biometric type with safe error handling
      let biometricType = 'biometric';
      let reason = 'Use biometric authentication to access Bean Stalker';
      
      try {
        console.log('🔐 BIOMETRIC: Getting biometric type...');
        biometricType = await this.getBiometricType();
        console.log('🔐 BIOMETRIC: Biometric type:', biometricType);
        
        if (biometricType && typeof biometricType === 'string') {
          reason = this.getAuthenticationReason(biometricType);
        }
      } catch (error) {
        console.log('🔐 BIOMETRIC: Could not get biometric type, using default:', error);
        // Continue with default values - not critical
      }

      // Critical safety check before calling verifyIdentity
      if (!NativeBiometric.verifyIdentity || typeof NativeBiometric.verifyIdentity !== 'function') {
        console.error('🔐 BIOMETRIC: verifyIdentity method not available');
        throw new Error('Biometric verification method not available');
      }
      
      console.log('🔐 BIOMETRIC: About to prompt for biometric authentication...');
      console.log('🔐 BIOMETRIC: Authentication reason:', reason);
      
      // Create verification options with fallback values
      const verificationOptions = {
        reason: reason || 'Use biometric authentication to access Bean Stalker',
        title: 'Bean Stalker Authentication',
        subtitle: 'Access your coffee account securely',
        description: 'Use your biometric authentication to sign in'
      };
      
      console.log('🔐 BIOMETRIC: Verification options:', verificationOptions);
      
      // Perform verification with timeout protection
      const verificationPromise = NativeBiometric.verifyIdentity(verificationOptions);
      const verificationTimeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Biometric verification timeout')), 30000) // 30 second timeout
      );
      
      await Promise.race([verificationPromise, verificationTimeoutPromise]);
      console.log('🔐 BIOMETRIC: Identity verification completed successfully');

      // Retrieve credentials with timeout protection
      console.log('🔐 BIOMETRIC: Retrieving stored credentials...');
      
      if (!NativeBiometric.getCredentials || typeof NativeBiometric.getCredentials !== 'function') {
        console.error('🔐 BIOMETRIC: getCredentials method not available');
        throw new Error('Credential retrieval method not available');
      }
      
      const credentialsPromise = NativeBiometric.getCredentials({
        server: this.CREDENTIAL_KEY,
      });
      const getCredentialsTimeoutPromise = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Credential retrieval timeout')), 10000)
      );
      
      const credentials = await Promise.race([credentialsPromise, getCredentialsTimeoutPromise]);
      console.log('🔐 BIOMETRIC: Credentials retrieved successfully');
      
      // Validate credentials
      if (!credentials || !credentials.username || !credentials.password) {
        console.error('🔐 BIOMETRIC: Invalid credentials retrieved');
        throw new Error('Invalid credentials retrieved from biometric storage');
      }
      
      return {
        username: credentials.username,
        password: credentials.password,
      };
    } catch (error: any) {
      console.error('🔐 BIOMETRIC: Authentication failed:', error);
      console.error('🔐 BIOMETRIC: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Enhanced error message handling
      if (error.message?.includes('User cancelled') || error.message?.includes('UserCancel') || 
          error.message?.includes('cancelled') || error.message?.includes('cancel')) {
        throw new Error('Authentication was cancelled by user');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Authentication timed out. Please try again.');
      } else if (error.message?.includes('not available') || error.message?.includes('unavailable')) {
        throw new Error('Biometric authentication is not available on this device');
      } else if (error.message?.includes('no credentials') || error.message?.includes('not found')) {
        throw new Error('No biometric credentials found. Please sign in with your password first.');
      } else if (error.message?.includes('lockout') || error.message?.includes('too many attempts')) {
        throw new Error('Too many failed attempts. Please wait and try again.');
      } else if (error.message?.includes('not available') || error.message?.includes('method not available')) {
        throw new Error('Biometric service is not properly configured');
      }
      
      throw error;
    }
  }

  /**
   * Delete stored biometric credentials
   */
  async deleteCredentials(): Promise<boolean> {
    try {
      await NativeBiometric.deleteCredentials({
        server: this.CREDENTIAL_KEY,
      });
      return true;
    } catch (error) {
      console.error('Failed to delete biometric credentials:', error);
      return false;
    }
  }

  /**
   * Get user-friendly authentication reason based on biometric type
   */
  private getAuthenticationReason(biometricType: string): string {
    if (!biometricType || typeof biometricType !== 'string') {
      return 'Use biometric authentication to access Bean Stalker';
    }
    
    // Normalize the type and handle various formats
    const normalizedType = biometricType.toString().toLowerCase().trim();
    
    switch (normalizedType) {
      case 'faceid':
      case 'face_id':
      case 'face id':
        return 'Use Face ID to access Bean Stalker';
      case 'touchid':
      case 'touch_id':
      case 'touch id':
        return 'Use Touch ID to access Bean Stalker';
      case 'fingerprint':
      case 'fingerprint_sensor':
        return 'Use your fingerprint to access Bean Stalker';
      case 'biometric':
      default:
        return 'Use biometric authentication to access Bean Stalker';
    }
  }

  /**
   * Legacy alias for backward compatibility
   */
  async hasStoredCredentials(): Promise<boolean> {
    return this.hasCredentials();
  }
}

export const biometricService = new BiometricService();