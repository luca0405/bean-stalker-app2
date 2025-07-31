/**
 * Simple RevenueCat integration - exactly as user specified
 * Flow: signup → save to DB → get user ID → pass to RevenueCat → done
 */

import { Purchases } from '@revenuecat/purchases-capacitor';

export class SimpleRevenueCat {
  /**
   * Step 4: Pass user ID to RevenueCat for payment processing
   */
  static async processPaymentWithUserID(userID: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💳 SIMPLE REVENUECAT: Processing payment for user ID:', userID);

      // Configure RevenueCat with the user ID from database
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userID
      });

      // Get offerings and find membership
      const offerings = await Purchases.getOfferings();
      const membershipPackage = offerings.current?.availablePackages?.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );

      if (!membershipPackage) {
        throw new Error('Membership product not found');
      }

      // Process payment - this triggers native Apple Pay popup
      console.log('💳 SIMPLE REVENUECAT: Triggering native payment popup...');
      const result = await Purchases.purchasePackage({ aPackage: membershipPackage });

      console.log('💳 SIMPLE REVENUECAT: REAL PAYMENT RESULT:', JSON.stringify(result, null, 2));
      console.log('💳 SIMPLE REVENUECAT: Transaction ID:', result.customerInfo?.originalPurchaseDate);
      console.log('💳 SIMPLE REVENUECAT: Entitlements:', Object.keys(result.customerInfo?.entitlements?.all || {}));
      
      // Wait for webhook processing
      console.log('⏳ Waiting 3 seconds for webhook processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('💳 SIMPLE REVENUECAT: Payment completed for user:', userID);
      return { success: true };

    } catch (error: any) {
      console.error('💳 SIMPLE REVENUECAT: Payment failed:', error);
      if (error.message?.includes('cancelled')) {
        return { success: false, error: 'Payment cancelled' };
      }
      return { success: false, error: error.message || 'Payment failed' };
    }
  }
}