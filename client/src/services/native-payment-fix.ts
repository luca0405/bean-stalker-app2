/**
 * NATIVE PAYMENT FIX - For Bean Stalker iOS/Android TestFlight app
 * Integrates directly with existing authentication flow
 */

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class NativePaymentFix {
  /**
   * Configure RevenueCat for native app with proper user ID
   */
  static async configureForUser(userID: string): Promise<void> {
    try {
      console.log('🔧 NATIVE PAYMENT: Configuring RevenueCat for user:', userID);
      
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // Configure with specific user ID
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userID
      });
      
      // Verify user ID assignment
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('🔍 NATIVE PAYMENT: Customer info:', customerInfo.originalAppUserId);
      
      // Force login if needed
      if (customerInfo.originalAppUserId !== userID) {
        console.log('⚠️ NATIVE PAYMENT: User ID mismatch, forcing login...');
        const loginResult = await Purchases.logIn({ appUserID: userID });
        console.log('✅ NATIVE PAYMENT: Login result:', loginResult.customerInfo.originalAppUserId);
      }
      
    } catch (error) {
      console.error('❌ NATIVE PAYMENT: Configuration failed:', error);
      throw error;
    }
  }

  /**
   * Process membership payment with native Apple Pay popup
   */
  static async processMembershipPayment(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💳 NATIVE PAYMENT: Processing membership payment...');
      
      // Get offerings
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        throw new Error('No offerings available');
      }
      
      // Find membership package
      const membershipPackage = offerings.current.availablePackages?.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        throw new Error('Membership package not found');
      }
      
      console.log('🚀 NATIVE PAYMENT: Triggering Apple Pay popup...');
      
      // This triggers the native Apple Pay popup
      const result = await Purchases.purchasePackage({ aPackage: membershipPackage });
      
      console.log('✅ NATIVE PAYMENT: Purchase successful!');
      console.log('Customer ID:', result.customerInfo.originalAppUserId);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ NATIVE PAYMENT: Payment failed:', error);
      
      if (error.message?.toLowerCase().includes('cancel') || error.userCancelled) {
        return { success: false, error: 'Payment cancelled' };
      }
      
      return { success: false, error: error.message || 'Payment failed' };
    }
  }
}