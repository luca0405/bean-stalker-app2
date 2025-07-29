import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

export interface DeviceInfo {
  deviceId: string;
  model: string;
  platform: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
}

class DeviceService {
  private readonly DEVICE_KEY = 'bean-stalker-device-id';
  private readonly ACCOUNT_BOUND_KEY = 'bean-stalker-account-bound';

  /**
   * Get unique device identifier
   */
  async getDeviceId(): Promise<string> {
    try {
      const info = await Device.getId();
      return info.identifier;
    } catch (error) {
      console.error('Failed to get device ID:', error);
      // Fallback to stored UUID or generate new one
      return await this.getOrCreateFallbackId();
    }
  }

  /**
   * Get comprehensive device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      const [deviceId, deviceInfo] = await Promise.all([
        this.getDeviceId(),
        Device.getInfo()
      ]);

      return {
        deviceId,
        model: deviceInfo.model,
        platform: deviceInfo.platform,
        osVersion: deviceInfo.osVersion,
        manufacturer: deviceInfo.manufacturer,
        isVirtual: deviceInfo.isVirtual
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      throw new Error('Could not retrieve device information');
    }
  }

  /**
   * Check if device is already bound to an account
   */
  async isDeviceBound(): Promise<boolean> {
    try {
      console.log('🔍 DEVICE BINDING DEBUG: Checking if device is bound...');
      const result = await Preferences.get({ key: this.ACCOUNT_BOUND_KEY });
      console.log('🔍 DEVICE BINDING DEBUG: Raw preferences result:', result);
      console.log('🔍 DEVICE BINDING DEBUG: Bound key:', this.ACCOUNT_BOUND_KEY);
      console.log('🔍 DEVICE BINDING DEBUG: Stored value:', result.value);
      console.log('🔍 DEVICE BINDING DEBUG: Value type:', typeof result.value);
      console.log('🔍 DEVICE BINDING DEBUG: Is bound calculation:', result.value === 'true');
      
      const isCurrentlyBound = result.value === 'true';
      console.log('🔍 DEVICE BINDING DEBUG: Final result:', isCurrentlyBound);
      
      return isCurrentlyBound;
    } catch (error) {
      console.error('❌ DEVICE BINDING ERROR: Failed to check device binding:', error);
      return false;
    }
  }

  /**
   * Bind device to current account
   */
  async bindDeviceToAccount(userId: string): Promise<void> {
    try {
      console.log('🔗 DEVICE BINDING: Starting device binding for user:', userId);
      console.log('🔗 DEVICE BINDING: Setting bound key:', this.ACCOUNT_BOUND_KEY);
      console.log('🔗 DEVICE BINDING: Setting user ID:', userId);
      
      await Preferences.set({
        key: this.ACCOUNT_BOUND_KEY,
        value: 'true'
      });
      
      await Preferences.set({
        key: 'bound-user-id',
        value: userId
      });

      console.log('🔗 DEVICE BINDING: Device binding completed for user:', userId);
      
      // CRITICAL: Verify binding was successful immediately
      const verifyBound = await Preferences.get({ key: this.ACCOUNT_BOUND_KEY });
      const verifyUserId = await Preferences.get({ key: 'bound-user-id' });
      console.log('🔗 DEVICE BINDING VERIFICATION:');
      console.log('🔗 - Bound key stored:', verifyBound.value);
      console.log('🔗 - User ID stored:', verifyUserId.value);
      
      if (verifyBound.value !== 'true' || verifyUserId.value !== userId) {
        console.error('❌ DEVICE BINDING VERIFICATION FAILED!');
        console.error('❌ Expected bound: true, got:', verifyBound.value);
        console.error('❌ Expected user ID:', userId, ', got:', verifyUserId.value);
        throw new Error('Device binding verification failed');
      } else {
        console.log('✅ DEVICE BINDING VERIFICATION: All data stored correctly');
      }
    } catch (error) {
      console.error('Failed to bind device:', error);
      throw new Error('Could not bind device to account');
    }
  }

  /**
   * Get the user ID this device is bound to
   */
  async getBoundUserId(): Promise<string | null> {
    try {
      console.log('🔍 DEVICE BINDING DEBUG: Getting bound user ID...');
      const result = await Preferences.get({ key: 'bound-user-id' });
      console.log('🔍 DEVICE BINDING DEBUG: Raw user ID result:', result);
      console.log('🔍 DEVICE BINDING DEBUG: User ID value:', result.value);
      console.log('🔍 DEVICE BINDING DEBUG: User ID type:', typeof result.value);
      
      const userId = result.value || null;
      console.log('🔍 DEVICE BINDING DEBUG: Final user ID:', userId);
      
      return userId;
    } catch (error) {
      console.error('❌ DEVICE BINDING ERROR: Failed to get bound user ID:', error);
      return null;
    }
  }

  /**
   * Unbind device (for account switching)
   */
  async unbindDevice(): Promise<void> {
    try {
      await Promise.all([
        Preferences.remove({ key: this.ACCOUNT_BOUND_KEY }),
        Preferences.remove({ key: 'bound-user-id' }),
        Preferences.remove({ key: 'bean-stalker-credentials' }), // Clear biometric credentials
        Preferences.clear() // Clear all app data
      ]);

      console.log('Device unbound successfully');
    } catch (error) {
      console.error('Failed to unbind device:', error);
      throw new Error('Could not unbind device');
    }
  }

  /**
   * Generate or retrieve fallback device ID
   */
  private async getOrCreateFallbackId(): Promise<string> {
    try {
      const existing = await Preferences.get({ key: this.DEVICE_KEY });
      if (existing.value) {
        return existing.value;
      }

      // Generate new UUID
      const fallbackId = this.generateUUID();
      await Preferences.set({
        key: this.DEVICE_KEY,
        value: fallbackId
      });

      return fallbackId;
    } catch (error) {
      console.error('Failed to get/create fallback ID:', error);
      return this.generateUUID();
    }
  }

  /**
   * Generate RFC4122 v4 UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Validate device binding on app startup
   */
  async validateDeviceBinding(): Promise<{
    isValid: boolean;
    boundUserId: string | null;
    requiresAuth: boolean;
  }> {
    try {
      const [isBound, boundUserId] = await Promise.all([
        this.isDeviceBound(),
        this.getBoundUserId()
      ]);

      return {
        isValid: isBound && !!boundUserId,
        boundUserId,
        requiresAuth: !isBound || !boundUserId
      };
    } catch (error) {
      console.error('Failed to validate device binding:', error);
      return {
        isValid: false,
        boundUserId: null,
        requiresAuth: true
      };
    }
  }
}

export const deviceService = new DeviceService();