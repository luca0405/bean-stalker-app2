/**
 * DIRECT REVENUECAT INTEGRATION - No complex wrappers, direct SDK calls
 * This bypasses all previous failed attempts and uses RevenueCat directly
 */

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class DirectRevenueCat {
  /**
   * Configure RevenueCat with user ID and trigger membership payment
   */
  static async configureAndProcessPayment(userID: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚀 DIRECT: Configuring RevenueCat for user:', userID);
      
      // Set debug logging
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // Configure with user ID
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userID
      });
      
      console.log('✅ DIRECT: RevenueCat configured');
      
      // Force login to ensure user ID is set
      await Purchases.logIn({ appUserID: userID });
      console.log('✅ DIRECT: User logged in');
      
      // Get offerings and trigger purchase immediately
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current?.availablePackages) {
        throw new Error('No packages available');
      }
      
      const membershipPackage = offerings.current.availablePackages.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        console.error('Available packages:', offerings.current.availablePackages.map(p => p.product.identifier));
        throw new Error('Membership package not found');
      }
      
      console.log('🚀 DIRECT: Triggering Apple Pay popup for:', membershipPackage.product.identifier);
      
      // TRIGGER NATIVE APPLE PAY POPUP - WITH VERIFICATION
      console.log('🚀 DIRECT: About to call Purchases.purchasePackage...');
      console.log('🚀 DIRECT: Package details:', {
        identifier: membershipPackage.product.identifier,
        price: membershipPackage.product.price,
        title: membershipPackage.product.title
      });
      
      const result = await Purchases.purchasePackage({ aPackage: membershipPackage });
      
      console.log('🔍 DIRECT: Purchase result received:', result);
      console.log('🔍 DIRECT: Customer ID:', result.customerInfo.originalAppUserId);
      console.log('🔍 DIRECT: Active entitlements:', Object.keys(result.customerInfo.entitlements.active));
      console.log('🔍 DIRECT: Non-subscription transactions:', result.customerInfo.nonSubscriptionTransactions?.length || 0);
      
      // CRITICAL: Verify this was a REAL purchase, not a fake success
      if (result.customerInfo.nonSubscriptionTransactions?.length === 0) {
        console.error('❌ DIRECT: NO TRANSACTIONS FOUND - This was a fake purchase!');
        throw new Error('Purchase completed but no transaction recorded - RevenueCat configuration issue');
      }
      
      console.log('✅ DIRECT: REAL Purchase verified with transactions!');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ DIRECT: Payment failed:', error);
      
      if (error.message?.includes('cancel') || error.userCancelled) {
        return { success: false, error: 'Payment cancelled' };
      }
      
      return { success: false, error: error.message || 'Payment failed' };
    }
  }
}