/**
 * REVENUECAT PROPER FIX - Configure ONLY after authentication
 * Based on RevenueCat best practices: Never configure without a known user ID
 */

import { Purchases } from '@revenuecat/purchases-capacitor';

export class RevenueCatProperFix {
  private static isConfigured = false;
  private static currentUserId: string | null = null;

  /**
   * Configure RevenueCat ONLY after user is authenticated
   * This prevents anonymous ID creation
   */
  static async configureAfterAuthentication(userID: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 PROPER FIX: Configuring RevenueCat AFTER authentication for user:', userID);
      
      // CRITICAL: Only configure when we have a known user ID
      if (!userID || userID === 'undefined' || userID === 'null') {
        throw new Error('Cannot configure RevenueCat without valid user ID');
      }
      
      // If already configured for a different user, switch using logIn
      if (this.isConfigured && this.currentUserId !== userID) {
        console.log('🔄 PROPER FIX: Switching from user', this.currentUserId, 'to', userID);
        
        // Don't call logout! Use logIn to switch users
        const loginResult = await Purchases.logIn({ appUserID: userID });
        console.log('✅ PROPER FIX: User switched successfully:', loginResult.customerInfo.originalAppUserId);
        
        this.currentUserId = userID;
        return { success: true };
      }
      
      // If not configured yet, configure with the authenticated user ID
      if (!this.isConfigured) {
        console.log('🔧 PROPER FIX: First-time configuration with authenticated user');
        
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
          appUserID: userID, // ALWAYS provide the known user ID
          observerMode: false,
          useStoreKit2IfAvailable: true
        });
        
        this.isConfigured = true;
        this.currentUserId = userID;
        
        // Verify configuration succeeded
        const customerInfo = await Purchases.getCustomerInfo();
        const assignedId = customerInfo.originalAppUserId;
        
        console.log('🔍 PROPER FIX: Verification - assigned ID:', assignedId);
        console.log('🔍 PROPER FIX: Expected ID:', userID);
        
        if (assignedId === userID) {
          console.log('✅ PROPER FIX: RevenueCat correctly configured with user ID');
          return { success: true };
        } else if (assignedId?.startsWith('$RCAnonymousID:')) {
          console.error('❌ PROPER FIX: RevenueCat still assigned anonymous ID despite proper configuration');
          return { success: false, error: 'RevenueCat assigned anonymous ID despite providing user ID' };
        } else {
          console.error('❌ PROPER FIX: Unexpected user ID assigned:', assignedId);
          return { success: false, error: `Unexpected user ID: ${assignedId}` };
        }
      }
      
      // Already configured for this user
      console.log('✅ PROPER FIX: Already configured for this user');
      return { success: true };
      
    } catch (error: any) {
      console.error('💥 PROPER FIX: Configuration failed:', error);
      return { success: false, error: error.message || 'Configuration failed' };
    }
  }
  
  /**
   * Attempt purchase with properly configured RevenueCat
   */
  static async attemptPurchase(): Promise<{ success: boolean; error?: string; purchaseResult?: any }> {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'RevenueCat not configured. Must authenticate first.' };
      }
      
      console.log('💳 PROPER FIX: Getting offerings with authenticated user...');
      
      const offerings = await Purchases.getOfferings();
      if (!offerings.current?.availablePackages?.length) {
        return { success: false, error: 'No RevenueCat packages available' };
      }
      
      // Find membership product
      const membershipPackage = offerings.current.availablePackages.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        console.log('💳 Available products:');
        offerings.current.availablePackages.forEach(pkg => {
          console.log(`   - ${pkg.product.identifier}: ${pkg.product.title}`);
        });
        return { success: false, error: 'Membership product com.beanstalker.membership69 not found' };
      }
      
      console.log('💳 PROPER FIX: Attempting purchase with authenticated user:', this.currentUserId);
      console.log('💳 PROPER FIX: Product:', membershipPackage.product.identifier);
      
      const purchaseResult = await Purchases.purchasePackage({ aPackage: membershipPackage });
      
      console.log('✅ PROPER FIX: Purchase completed successfully!');
      console.log('   - Customer ID:', purchaseResult.customerInfo.originalAppUserId);
      console.log('   - Expected ID:', this.currentUserId);
      
      return { success: true, purchaseResult };
      
    } catch (error: any) {
      console.error('💳 PROPER FIX: Purchase failed:', error);
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }
  
  /**
   * Reset configuration state (for testing)
   */
  static reset() {
    this.isConfigured = false;
    this.currentUserId = null;
  }
}