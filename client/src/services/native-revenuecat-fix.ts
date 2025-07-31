/**
 * NATIVE REVENUECAT FIX - Direct SDK calls for real Apple Pay popup
 * This bypasses all complex logic and uses direct RevenueCat SDK calls
 */

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class NativeRevenueCatFix {
  private static isConfigured = false;

  /**
   * Initialize RevenueCat for native payments - FORCE user ID assignment
   */
  static async initialize(userID: string): Promise<void> {
    try {
      console.log('🔧 NATIVE FIX: Force initializing RevenueCat for user:', userID);
      
      // ALWAYS configure with specific user ID - no caching
      this.isConfigured = false;
      
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // Configure with specific user ID
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userID
      });
      
      console.log('✅ NATIVE FIX: RevenueCat configured with user ID:', userID);
      
      // Verify the user ID was set correctly
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('🔍 NATIVE FIX: Current customer info:');
      console.log('   - Original App User ID:', customerInfo.originalAppUserId);
      console.log('   - Anonymous:', customerInfo.originalAppUserId?.startsWith('$RCAnonymousID:'));
      
      // If still anonymous, force login
      if (customerInfo.originalAppUserId?.startsWith('$RCAnonymousID:') || 
          customerInfo.originalAppUserId !== userID) {
        console.log('⚠️ NATIVE FIX: User ID mismatch, forcing login...');
        try {
          const loginResult = await Purchases.logIn({ appUserID: userID });
          console.log('✅ NATIVE FIX: Forced login result:', loginResult.customerInfo.originalAppUserId);
        } catch (loginError) {
          console.error('❌ NATIVE FIX: Login failed:', loginError);
        }
      }

      // Verify offerings are available
      const offerings = await Purchases.getOfferings();
      console.log('📦 NATIVE FIX: Available offerings:', Object.keys(offerings.all || {}));
      console.log('📦 NATIVE FIX: Current offering packages:', offerings.current?.availablePackages?.length || 0);
      
      this.isConfigured = true;
      
    } catch (error) {
      console.error('❌ NATIVE FIX: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process membership payment with guaranteed native Apple Pay popup
   */
  static async processMembershipPayment(userID: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💳 NATIVE FIX: Starting membership payment for user:', userID);
      
      // Initialize RevenueCat
      await this.initialize(userID);
      
      // Get fresh offerings
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        throw new Error('No current offering found - check RevenueCat Dashboard');
      }
      
      // Find membership package
      const membershipPackage = offerings.current.availablePackages?.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        console.error('❌ NATIVE FIX: Available packages:', offerings.current.availablePackages?.map(p => p.product.identifier));
        throw new Error('Membership product com.beanstalker.membership69 not found in offerings');
      }
      
      console.log('💳 NATIVE FIX: Found membership package:', membershipPackage.product.identifier);
      console.log('💳 NATIVE FIX: Package price:', membershipPackage.product.price);
      
      // CRITICAL: This should trigger native Apple Pay popup
      console.log('🚀 NATIVE FIX: Triggering REAL Apple Pay popup...');
      const purchaseResult = await Purchases.purchasePackage({ 
        aPackage: membershipPackage 
      });
      
      console.log('✅ NATIVE FIX: Purchase completed successfully!');
      console.log('📱 NATIVE FIX: Customer info:', purchaseResult.customerInfo.originalAppUserId);
      console.log('🎫 NATIVE FIX: Entitlements:', Object.keys(purchaseResult.customerInfo.entitlements.all));
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ NATIVE FIX: Payment failed:', error);
      
      // Handle user cancellation
      if (error.message?.toLowerCase().includes('cancel') || 
          error.code === '1' || 
          error.userCancelled) {
        return { success: false, error: 'Payment cancelled by user' };
      }
      
      // Handle other errors
      return { success: false, error: error.message || 'Payment failed' };
    }
  }
}