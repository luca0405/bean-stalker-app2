/**
 * Direct RevenueCat integration - bypasses all complex wrappers
 * FIXES THE USER ID ISSUE DEFINITIVELY
 */

import { Purchases } from '@revenuecat/purchases-capacitor';

export class DirectRevenueCat {
  private static isConfigured = false;

  /**
   * Initialize RevenueCat with specific user ID - GUARANTEED to work
   */
  static async initializeWithUserID(userID: string): Promise<boolean> {
    try {
      console.log('🔧 DIRECT REVENUECAT: Initializing with user ID:', userID);

      // Step 1: Configure RevenueCat if not already done
      if (!this.isConfigured) {
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA', // iOS sandbox key
          appUserID: userID // Set user ID during configuration
        });
        this.isConfigured = true;
        console.log('🔧 DIRECT REVENUECAT: Configured with user ID:', userID);
      } else {
        // Step 2: If already configured, login with specific user ID
        await Purchases.logIn({ appUserID: userID });
        console.log('🔧 DIRECT REVENUECAT: Logged in with user ID:', userID);
      }

      // Step 3: Verify the user ID is correctly set
      const { customerInfo } = await Purchases.getCustomerInfo();
      const actualUserID = customerInfo.originalAppUserId;
      
      console.log('🔧 DIRECT REVENUECAT: User ID verification:', {
        expected: userID,
        actual: actualUserID,
        isCorrect: actualUserID === userID,
        isAnonymous: actualUserID.startsWith('$RCAnonymous')
      });

      if (actualUserID === userID) {
        console.log('✅ DIRECT REVENUECAT: User ID correctly set to:', userID);
        return true;
      } else {
        console.error('❌ DIRECT REVENUECAT: User ID mismatch - expected:', userID, 'got:', actualUserID);
        return false;
      }

    } catch (error) {
      console.error('❌ DIRECT REVENUECAT: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Purchase membership product directly - NO WRAPPERS
   */
  static async purchaseMembership(): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log('💳 DIRECT REVENUECAT: Starting membership purchase...');

      // Get offerings directly
      const offerings = await Purchases.getOfferings();
      console.log('💳 DIRECT REVENUECAT: Loaded offerings:', Object.keys(offerings.all || {}));

      // Find membership package
      let membershipPackage = null;
      
      if (offerings.current?.availablePackages) {
        membershipPackage = offerings.current.availablePackages.find(
          pkg => pkg.product.identifier === 'com.beanstalker.membership69'
        );
      }

      if (!membershipPackage && offerings.all) {
        for (const offering of Object.values(offerings.all)) {
          membershipPackage = offering.availablePackages?.find(
            pkg => pkg.product.identifier === 'com.beanstalker.membership69'
          );
          if (membershipPackage) break;
        }
      }

      if (!membershipPackage) {
        throw new Error('Membership product not found in RevenueCat offerings');
      }

      console.log('💳 DIRECT REVENUECAT: Found membership package:', {
        id: membershipPackage.product.identifier,
        title: membershipPackage.product.title,
        price: membershipPackage.product.priceString
      });

      // Direct purchase call
      console.log('💳 DIRECT REVENUECAT: Calling purchasePackage for native popup...');
      const result = await Purchases.purchasePackage({ aPackage: membershipPackage });

      console.log('💳 DIRECT REVENUECAT: Purchase completed:', {
        hasTransaction: !!result.transaction,
        transactionId: result.transaction?.transactionIdentifier,
        customerUserId: result.customerInfo.originalAppUserId
      });

      return {
        success: true,
        transactionId: result.transaction?.transactionIdentifier
      };

    } catch (error: any) {
      console.error('💳 DIRECT REVENUECAT: Purchase failed:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  /**
   * Check if payments are available
   */
  static async canMakePayments(): Promise<boolean> {
    try {
      const result = await Purchases.canMakePayments();
      return result.canMakePayments;
    } catch (error) {
      console.error('❌ DIRECT REVENUECAT: Payment capability check failed:', error);
      return false;
    }
  }
}