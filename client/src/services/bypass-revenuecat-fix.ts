/**
 * BYPASS REVENUECAT FIX - Skip user ID verification, proceed directly to Apple Pay
 * Since RevenueCat user ID mapping is problematic, try direct purchase flow
 */

import { Purchases } from '@revenuecat/purchases-capacitor';

export class BypassRevenueCatFix {
  /**
   * Configure RevenueCat without strict user ID verification
   * Let RevenueCat handle the user mapping internally
   */
  static async configureForDirectPayment(userID: string): Promise<boolean> {
    try {
      console.log('🔄 BYPASS FIX: Configuring RevenueCat for direct payment, user:', userID);
      
      // Simple configuration without complex user ID forcing
      try {
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
          appUserID: userID,
          observerMode: false,
          useStoreKit2IfAvailable: true
        });
      } catch (configError) {
        console.log('🔄 BYPASS FIX: Configure failed, trying simple config...');
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA'
        });
      }
      
      // Give RevenueCat time to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ BYPASS FIX: RevenueCat configured, checking customer info...');
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('   - Customer ID:', customerInfo.originalAppUserId);
      console.log('   - Is Anonymous:', customerInfo.originalAppUserId?.startsWith('$RCAnonymousID:'));
      
      return true; // Don't fail on user ID mismatch, proceed anyway
      
    } catch (error) {
      console.error('💥 BYPASS FIX: Configuration failed:', error);
      return false;
    }
  }
  
  /**
   * Attempt direct Apple Pay purchase without strict user ID verification
   */
  static async attemptDirectPurchase(): Promise<{ success: boolean; error?: string; purchaseResult?: any }> {
    try {
      console.log('💳 BYPASS FIX: Getting offerings for direct purchase...');
      
      const offerings = await Purchases.getOfferings();
      console.log('💳 BYPASS FIX: Available packages:', offerings.current?.availablePackages?.length || 0);
      
      if (!offerings.current?.availablePackages?.length) {
        return { success: false, error: 'No RevenueCat packages available - check App Store Connect' };
      }
      
      // Find membership product
      let membershipPackage = offerings.current.availablePackages.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        console.log('💳 BYPASS FIX: Available products:');
        offerings.current.availablePackages.forEach(pkg => {
          console.log(`   - ${pkg.product.identifier}: ${pkg.product.title}`);
        });
        return { success: false, error: 'Membership product com.beanstalker.membership69 not found' };
      }
      
      console.log('💳 BYPASS FIX: Found membership product:', membershipPackage.product.identifier);
      console.log('💳 BYPASS FIX: TRIGGERING APPLE PAY POPUP NOW...');
      
      // Direct purchase attempt
      const purchaseResult = await Purchases.purchasePackage({ aPackage: membershipPackage });
      
      console.log('✅ BYPASS FIX: Apple Pay completed successfully!');
      console.log('   - Customer ID after purchase:', purchaseResult.customerInfo.originalAppUserId);
      console.log('   - Transaction ID:', purchaseResult.customerInfo.originalPurchaseDate);
      
      return { success: true, purchaseResult };
      
    } catch (error: any) {
      console.error('💳 BYPASS FIX: Direct purchase failed:', error);
      return { success: false, error: error.message || 'Unknown purchase error' };
    }
  }
}