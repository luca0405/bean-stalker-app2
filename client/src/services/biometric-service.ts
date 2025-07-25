import { NativeBiometric } from 'capacitor-native-biometric';

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
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.log('Biometric authentication not available:', error);
      return false;
    }
  }

  /**
   * Get available biometric types (Face ID, Touch ID, Fingerprint)
   */
  async getBiometricType(): Promise<string> {
    try {
      const result = await NativeBiometric.isAvailable();
      return String(result.biometryType) || 'unknown';
    } catch (error) {
      console.log('Could not determine biometric type:', error);
      return 'unknown';
    }
  }

  /**
   * Save user credentials securely for biometric authentication
   */
  async saveCredentials(username: string, password: string): Promise<boolean> {
    try {
      await NativeBiometric.setCredentials({
        username,
        password,
        server: this.CREDENTIAL_KEY,
      });
      return true;
    } catch (error) {
      console.error('Failed to save biometric credentials:', error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics and retrieve credentials
   */
  async authenticateWithBiometrics(): Promise<BiometricCredentials | null> {
    try {
      console.log('BiometricService: Starting authentication...');
      
      // Check if biometrics are available
      const isAvailable = await this.isAvailable();
      console.log('BiometricService: Is available:', isAvailable);
      
      if (!isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      // Check if credentials are stored
      const hasCredentials = await this.hasStoredCredentials();
      console.log('BiometricService: Has stored credentials:', hasCredentials);
      
      if (!hasCredentials) {
        throw new Error('No biometric credentials stored. Please sign in with your password first.');
      }

      // Get biometric type for customized messaging
      const biometricType = await this.getBiometricType();
      console.log('BiometricService: Biometric type:', biometricType);
      
      const reason = this.getAuthenticationReason(biometricType);

      // Perform biometric authentication
      console.log('BiometricService: Verifying identity...');
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Bean Stalker Authentication',
        subtitle: 'Access your coffee account securely',
        description: 'Use your biometric authentication to sign in'
      });

      console.log('BiometricService: Identity verified, retrieving credentials...');
      
      // If verification successful, retrieve stored credentials
      const credentials = await NativeBiometric.getCredentials({
        server: this.CREDENTIAL_KEY,
      });

      console.log('BiometricService: Credentials retrieved successfully');
      
      return {
        username: credentials.username,
        password: credentials.password,
      };
    } catch (error: any) {
      console.error('BiometricService: Authentication failed:', error);
      
      // Enhance error messages
      if (error.message?.includes('User cancelled') || error.message?.includes('UserCancel')) {
        throw new Error('Authentication was cancelled by user');
      } else if (error.message?.includes('not available')) {
        throw new Error('Biometric authentication is not available on this device');
      } else if (error.message?.includes('no credentials')) {
        throw new Error('No biometric credentials found. Please sign in with your password first.');
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
    
    switch (biometricType.toLowerCase()) {
      case 'faceid':
        return 'Use Face ID to access Bean Stalker';
      case 'touchid':
        return 'Use Touch ID to access Bean Stalker';
      case 'fingerprint':
        return 'Use your fingerprint to access Bean Stalker';
      default:
        return 'Use biometric authentication to access Bean Stalker';
    }
  }

  /**
   * Check if user has biometric credentials saved
   */
  async hasStoredCredentials(): Promise<boolean> {
    try {
      const credentials = await NativeBiometric.getCredentials({
        server: this.CREDENTIAL_KEY,
      });
      return !!(credentials.username && credentials.password);
    } catch (error) {
      return false;
    }
  }
}

export const biometricService = new BiometricService();