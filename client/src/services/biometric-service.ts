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
      return result.biometryType || 'unknown';
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
      // Check if biometrics are available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      // Get biometric type for customized messaging
      const biometricType = await this.getBiometricType();
      const reason = this.getAuthenticationReason(biometricType);

      // Perform biometric authentication
      const result = await NativeBiometric.verifyIdentity({
        reason,
        title: 'Bean Stalker Authentication',
        subtitle: 'Access your coffee account securely',
        description: 'Use your biometric authentication to sign in'
      });

      if (result) {
        // Retrieve stored credentials
        const credentials = await NativeBiometric.getCredentials({
          server: this.CREDENTIAL_KEY,
        });

        return {
          username: credentials.username,
          password: credentials.password,
        };
      }

      return null;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
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