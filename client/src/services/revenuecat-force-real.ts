/**
 * REVENUECAT FORCE REAL TRANSACTION - Guarantees real Apple Pay popup
 * This forces RevenueCat to show the actual payment interface
 */

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class RevenueCatForceReal {
  /**
   * Force a REAL RevenueCat transaction with verification
   */
  static async forceRealTransaction(userID: string): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    try {
      console.log('🚀 FORCE REAL: Starting REAL RevenueCat transaction for user:', userID);
      
      // Step 1: Configure with maximum debug logging
      await Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE });
      
      // Step 2: Configure RevenueCat
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userID
      });
      
      // Step 3: Force user login
      const loginResult = await Purchases.logIn({ appUserID: userID });
      console.log('🔍 FORCE REAL: Login result customer ID:', loginResult.customerInfo.originalAppUserId);
      
      // Step 4: Get customer info before purchase
      const beforePurchase = await Purchases.getCustomerInfo();
      console.log('🔍 FORCE REAL: Before purchase - transactions:', beforePurchase.nonSubscriptionTransactions?.length || 0);
      
      // Step 5: Get offerings with retry
      let offerings;
      let attempts = 0;
      while (attempts < 3) {
        try {
          offerings = await Purchases.getOfferings();
          if (offerings.current?.availablePackages?.length > 0) {
            break;
          }
          throw new Error('No packages in current offering');
        } catch (offerError) {
          attempts++;
          console.log(`🔄 FORCE REAL: Retry ${attempts}/3 for offerings:`, offerError);
          if (attempts >= 3) throw offerError;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!offerings.current?.availablePackages) {
        throw new Error('No packages available after retries');
      }
      
      // Step 6: Find membership package
      const membershipPackage = offerings.current.availablePackages.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        console.error('Available packages:', offerings.current.availablePackages.map(p => p.product.identifier));
        throw new Error('Membership package not found');
      }
      
      console.log('🚀 FORCE REAL: Found package:', {
        id: membershipPackage.product.identifier,
        price: membershipPackage.product.price,
        title: membershipPackage.product.title,
        description: membershipPackage.product.description
      });
      
      // Step 7: Check if user can make payments
      const canMakePayments = await Purchases.canMakePayments();
      if (!canMakePayments) {
        throw new Error('Device cannot make payments - check restrictions');
      }
      console.log('✅ FORCE REAL: Device can make payments');
      
      // Step 8: FORCE REAL PURCHASE with maximum verification
      console.log('🚀 FORCE REAL: About to trigger REAL Apple Pay popup...');
      console.log('🚀 FORCE REAL: If you do not see Apple Pay popup, RevenueCat has a configuration issue');
      
      const purchaseResult = await Purchases.purchasePackage({ aPackage: membershipPackage });
      
      // Step 9: Verify the purchase was REAL
      console.log('🔍 FORCE REAL: Purchase completed, verifying...');
      console.log('🔍 FORCE REAL: Customer ID:', purchaseResult.customerInfo.originalAppUserId);
      console.log('🔍 FORCE REAL: Entitlements:', Object.keys(purchaseResult.customerInfo.entitlements.all));
      
      const transactions = purchaseResult.customerInfo.nonSubscriptionTransactions || [];
      console.log('🔍 FORCE REAL: Transaction count:', transactions.length);
      
      if (transactions.length === 0) {
        console.error('❌ FORCE REAL: CRITICAL - No transactions recorded!');
        console.error('❌ FORCE REAL: This indicates RevenueCat sandbox/production configuration mismatch');
        console.error('❌ FORCE REAL: Or App Store Connect products not properly configured');
        throw new Error('Purchase returned success but no transaction recorded - configuration error');
      }
      
      // Get the latest transaction
      const latestTransaction = transactions[transactions.length - 1];
      console.log('✅ FORCE REAL: Transaction verified!', {
        transactionId: latestTransaction.transactionIdentifier,
        productId: latestTransaction.productIdentifier,
        purchaseDate: latestTransaction.purchaseDate
      });
      
      return { 
        success: true, 
        transactionId: latestTransaction.transactionIdentifier 
      };
      
    } catch (error: any) {
      console.error('❌ FORCE REAL: Transaction failed:', error);
      
      // Handle user cancellation
      if (error.message?.toLowerCase().includes('cancel') || 
          error.code === 1 || 
          error.domain === 'SKErrorDomain' && error.code === 2) {
        return { success: false, error: 'Payment cancelled by user' };
      }
      
      // Handle configuration errors
      if (error.message?.includes('configuration') || 
          error.message?.includes('no transaction')) {
        return { 
          success: false, 
          error: 'RevenueCat configuration error - check App Store Connect product setup' 
        };
      }
      
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }
}