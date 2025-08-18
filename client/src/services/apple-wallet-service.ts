/**
 * Apple Wallet Integration Service
 * Manages credit balance passes in Apple Wallet
 */

import { Capacitor } from '@capacitor/core';
// Note: Apple Wallet plugin will be added during native build

export interface CreditPass {
  passTypeIdentifier: string;
  serialNumber: string;
  organizationName: string;
  description: string;
  logoText: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  primaryFields: PassField[];
  secondaryFields: PassField[];
  auxiliaryFields: PassField[];
  backFields: PassField[];
}

export interface PassField {
  key: string;
  label: string;
  value: string;
  textAlignment?: string;
}

export class AppleWalletService {
  private static passTypeIdentifier = 'pass.A43TZWNYA3.beanstalker.credits';
  private static teamIdentifier = 'A43TZWNYA3'; // Apple Developer Team ID
  
  /**
   * Check if Apple Wallet is available on this device
   */
  static async isWalletAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      return false;
    }
    
    try {
      // Check if device supports adding passes to wallet
      return true; // Capacitor PassToWallet handles availability internally
    } catch (error) {
      console.log('PassKit not available:', error);
      return false;
    }
  }
  
  /**
   * Create or update credit balance pass in Apple Wallet
   */
  static async updateCreditPass(userId: number, username: string, currentBalance: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!await this.isWalletAvailable()) {
        return { success: false, error: 'Apple Wallet not available on this device' };
      }
      
      const pass = this.createCreditPass(userId, username, currentBalance);
      
      // Generate the pass on the server
      console.log('🍎 NATIVE: Sending pass data to server for user', userId);
      console.log('🍎 NATIVE: Pass type identifier:', pass.passTypeIdentifier);
      console.log('🍎 NATIVE: Serial number:', pass.serialNumber);
      console.log('🍎 NATIVE: Colors - fg:', pass.foregroundColor, 'bg:', pass.backgroundColor);
      console.log('🍎 NATIVE: Full pass object:', JSON.stringify(pass, null, 2));
      
      const response = await fetch('/api/apple-wallet/generate-pass', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          username,
          currentBalance,
          passData: pass
        })
      });
      
      console.log('🍎 NATIVE: Server response status:', response.status);
      
      if (!response.ok) {
        console.error('🍎 NATIVE: Server error response:', response.status);
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error('🍎 NATIVE: Error data:', errorData);
        return { success: false, error: errorData.error || `Server error: ${response.status}` };
      }
      
      const result = await response.json();
      console.log('🍎 NATIVE: Server result success:', result.success);
      
      if (!result.success) {
        // Log detailed error for native debugging
        console.error('🍎 NATIVE: Apple Wallet generation failed');
        console.error('🍎 NATIVE: Raw error:', result.error);
        
        // Provide helpful error messages for common development issues
        let userFriendlyError = result.error;
        
        if (result.error?.includes('certificates not configured')) {
          userFriendlyError = 'Apple Wallet certificates not configured (missing environment variables)';
          console.error('🍎 NATIVE: Missing APPLE_TEAM_ID or APPLE_WALLET_CERT_PASSWORD');
        } else if (result.error?.includes('certificate files not found')) {
          userFriendlyError = 'Apple Wallet certificate files missing from server';
          console.error('🍎 NATIVE: Missing certificate files in /certs folder');
        } else if (result.error?.includes('string did not match the expected pattern')) {
          userFriendlyError = 'Pass format validation failed - invalid pattern detected';
          console.error('🍎 NATIVE: String pattern error - likely passTypeIdentifier or serialNumber format');
        } else if (result.error?.includes('Pass validation failed')) {
          userFriendlyError = 'Pass data validation failed on server';
          console.error('🍎 NATIVE: Server-side validation rejected pass data');
        }
        
        console.error('🍎 NATIVE: Final error message:', userFriendlyError);
        return { success: false, error: userFriendlyError };
      }
      
      const { passBase64 } = result;
      
      // Add pass to wallet using Capacitor plugin
      // This will work when the app is built for iOS
      if (Capacitor.isNativePlatform() && (window as any).CapacitorPassToWallet) {
        await (window as any).CapacitorPassToWallet.addToWallet({ 
          base64: passBase64 
        });
      } else {
        // For web testing, download the pass
        const blob = new Blob([atob(passBase64)], { type: 'application/vnd.apple.pkpass' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'beanstalker-credits.pkpass';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Apple Wallet integration error:', error);
      return { success: false, error: error.message || 'Failed to add pass to wallet' };
    }
  }
  
  /**
   * Remove credit pass from Apple Wallet
   */
  static async removeCreditPass(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!await this.isWalletAvailable()) {
        return { success: false, error: 'Apple Wallet not available' };
      }
      
      // Note: Capacitor PassToWallet doesn't support removing passes
      // Users can manually remove passes from their wallet
      console.log('Pass removal must be done manually by user in Apple Wallet');
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Remove pass error:', error);
      return { success: false, error: error.message || 'Failed to remove pass' };
    }
  }
  
  /**
   * Create the pass data structure
   */
  private static createCreditPass(userId: number, username: string, currentBalance: number): CreditPass {
    // Apple Wallet serial numbers: alphanumeric only, no special chars except hyphens and periods
    const timestamp = Date.now();
    const serialNumber = `bscredit${userId}t${timestamp}`;
    const formattedBalance = `$${currentBalance.toFixed(2)}`;
    
    return {
      passTypeIdentifier: this.passTypeIdentifier,
      serialNumber,
      organizationName: 'Bean Stalker Coffee',
      description: 'Bean Stalker Credit Balance',
      logoText: 'Bean Stalker',
      foregroundColor: '#FFFFFF',
      backgroundColor: '#228B22', // Forest green matching app theme  
      labelColor: '#FFFFFF',
      primaryFields: [
        {
          key: 'balance',
          label: 'Credit Balance',
          value: formattedBalance,
          textAlignment: 'center'
        }
      ],
      secondaryFields: [
        {
          key: 'username',
          label: 'Account',
          value: username
        },
        {
          key: 'lastUpdated',
          label: 'Last Updated',
          value: new Date().toLocaleDateString()
        }
      ],
      auxiliaryFields: [
        {
          key: 'memberType',
          label: 'Membership',
          value: currentBalance >= 69 ? 'Premium' : 'Standard'
        }
      ],
      backFields: [
        {
          key: 'description',
          label: 'About',
          value: 'Your Bean Stalker credit balance. Use credits to order delicious coffee and food items from our app.'
        },
        {
          key: 'support',
          label: 'Support',
          value: 'For assistance, contact support through the Bean Stalker app.'
        },
        {
          key: 'website',
          label: 'Website',
          value: 'beanstalker.com.au'
        }
      ]
    };
  }
}