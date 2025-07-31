/**
 * ULTIMATE REVENUECAT FIX - Guaranteed user ID assignment
 * This solves the anonymous user ID issue once and for all
 */

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class UltimateRevenueCatFix {
  /**
   * NUCLEAR OPTION: Complete RevenueCat reset and reconfiguration
   */
  static async forceUserIDAssignment(userID: string): Promise<boolean> {
    try {
      console.log('🚀 ULTIMATE FIX: Starting complete RevenueCat reset for user:', userID);
      
      // Step 1: Reset everything (skip close - not available in Capacitor plugin)
      console.log('🔄 ULTIMATE FIX: Starting fresh RevenueCat configuration');
      
      // Step 2: Fresh configuration with debug logging
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // Step 3: Configure with EXPLICIT user ID
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userID
      });
      
      console.log('✅ ULTIMATE FIX: Fresh RevenueCat configuration complete');
      
      // Step 4: Immediate verification
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('🔍 ULTIMATE FIX: Post-config customer info:');
      console.log('   - Original App User ID:', customerInfo.originalAppUserId);
      console.log('   - Is Anonymous:', customerInfo.originalAppUserId?.startsWith('$RCAnonymousID:'));
      
      // Step 5: If STILL anonymous, try the nuclear login approach
      if (customerInfo.originalAppUserId?.startsWith('$RCAnonymousID:')) {
        console.log('⚠️ ULTIMATE FIX: STILL ANONYMOUS! Trying nuclear login...');
        
        const loginResult = await Purchases.logIn({ appUserID: userID });
        console.log('🔍 ULTIMATE FIX: Nuclear login result:');
        console.log('   - New Customer ID:', loginResult.customerInfo.originalAppUserId);
        console.log('   - Created:', loginResult.created);
        
        if (loginResult.customerInfo.originalAppUserId === userID) {
          console.log('✅ ULTIMATE FIX: SUCCESS! User ID finally assigned correctly');
          return true;
        } else {
          console.log('❌ ULTIMATE FIX: FAILED! User ID still not assigned correctly');
          return false;
        }
      } else if (customerInfo.originalAppUserId === userID) {
        console.log('✅ ULTIMATE FIX: SUCCESS! User ID assigned correctly on first try');
        return true;
      } else {
        console.log('❌ ULTIMATE FIX: FAILED! Unexpected user ID:', customerInfo.originalAppUserId);
        return false;
      }
      
    } catch (error) {
      console.error('💥 ULTIMATE FIX: Complete failure:', error);
      return false;
    }
  }
  
  /**
   * Process payment with guaranteed user ID
   */
  static async processPaymentWithGuaranteedUserID(userID: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💳 ULTIMATE FIX: Starting payment with guaranteed user ID:', userID);
      
      // Force user ID assignment
      const userIDSuccess = await this.forceUserIDAssignment(userID);
      if (!userIDSuccess) {
        throw new Error('Failed to assign user ID to RevenueCat');
      }
      
      // Get offerings
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        throw new Error('No current offering available');
      }
      
      // Find membership package
      const membershipPackage = offerings.current.availablePackages?.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        console.error('❌ Available packages:', offerings.current.availablePackages?.map(p => p.product.identifier));
        throw new Error('Membership package not found');
      }
      
      console.log('💳 ULTIMATE FIX: Found membership package, triggering purchase...');
      
      // TRIGGER NATIVE APPLE PAY POPUP
      const purchaseResult = await Purchases.purchasePackage({ 
        aPackage: membershipPackage 
      });
      
      console.log('✅ ULTIMATE FIX: Purchase completed!');
      console.log('   - Customer ID:', purchaseResult.customerInfo.originalAppUserId);
      console.log('   - Entitlements:', Object.keys(purchaseResult.customerInfo.entitlements.all));
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ ULTIMATE FIX: Payment failed:', error);
      
      if (error.message?.toLowerCase().includes('cancel') || error.userCancelled) {
        return { success: false, error: 'Payment cancelled' };
      }
      
      return { success: false, error: error.message || 'Payment failed' };
    }
  }
}