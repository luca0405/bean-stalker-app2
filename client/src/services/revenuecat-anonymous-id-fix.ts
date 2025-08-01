/**
 * REVENUECAT ANONYMOUS ID FIX
 * Handle the case where RevenueCat assigns anonymous ID instead of our user ID
 * Store the mapping between anonymous ID and real user ID for webhook processing
 */

import { Purchases } from '@revenuecat/purchases-capacitor';
import { Preferences } from '@capacitor/preferences';

export class RevenueCatAnonymousIdFix {
  /**
   * Configure RevenueCat and store user mapping for webhook processing
   */
  static async configureWithUserMapping(userID: string): Promise<{ success: boolean; anonymousId?: string }> {
    try {
      console.log('🔄 ANONYMOUS FIX: Configuring RevenueCat with user mapping for:', userID);
      
      // Configure RevenueCat
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userID,
        observerMode: false,
        useStoreKit2IfAvailable: true
      });
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check what RevenueCat actually assigned
      const customerInfo = await Purchases.getCustomerInfo();
      const assignedId = customerInfo.originalAppUserId;
      
      console.log('🔍 ANONYMOUS FIX: RevenueCat assigned ID:', assignedId);
      console.log('🔍 ANONYMOUS FIX: Expected ID:', userID);
      console.log('🔍 ANONYMOUS FIX: Is Anonymous:', assignedId?.startsWith('$RCAnonymousID:'));
      
      // If RevenueCat assigned an anonymous ID, store the mapping
      if (assignedId?.startsWith('$RCAnonymousID:')) {
        console.log('⚠️ ANONYMOUS FIX: RevenueCat assigned anonymous ID, storing mapping...');
        
        // Store mapping locally for webhook processing
        await Preferences.set({
          key: 'revenuecat_anonymous_mapping',
          value: JSON.stringify({
            anonymousId: assignedId,
            realUserId: userID,
            timestamp: Date.now()
          })
        });
        
        // Also send mapping to server for webhook processing
        try {
          await fetch('/api/revenuecat/store-user-mapping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              anonymousId: assignedId,
              realUserId: userID
            })
          });
          console.log('✅ ANONYMOUS FIX: User mapping sent to server');
        } catch (error) {
          console.error('❌ ANONYMOUS FIX: Failed to send mapping to server:', error);
        }
        
        return { success: true, anonymousId: assignedId };
      } else if (assignedId === userID) {
        console.log('✅ ANONYMOUS FIX: RevenueCat correctly assigned user ID');
        return { success: true };
      } else {
        console.log('❌ ANONYMOUS FIX: Unexpected user ID assigned:', assignedId);
        return { success: false };
      }
      
    } catch (error) {
      console.error('💥 ANONYMOUS FIX: Configuration failed:', error);
      return { success: false };
    }
  }
  
  /**
   * Attempt purchase with anonymous ID fallback
   */
  static async attemptPurchaseWithMapping(): Promise<{ success: boolean; error?: string; purchaseResult?: any }> {
    try {
      console.log('💳 ANONYMOUS FIX: Getting offerings...');
      
      const offerings = await Purchases.getOfferings();
      if (!offerings.current?.availablePackages?.length) {
        return { success: false, error: 'No RevenueCat packages available' };
      }
      
      // Find membership product
      const membershipPackage = offerings.current.availablePackages.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      if (!membershipPackage) {
        return { success: false, error: 'Membership product not found' };
      }
      
      console.log('💳 ANONYMOUS FIX: Attempting purchase...');
      const purchaseResult = await Purchases.purchasePackage({ aPackage: membershipPackage });
      
      console.log('✅ ANONYMOUS FIX: Purchase completed!');
      console.log('   - Customer ID:', purchaseResult.customerInfo.originalAppUserId);
      
      return { success: true, purchaseResult };
      
    } catch (error: any) {
      console.error('💳 ANONYMOUS FIX: Purchase failed:', error);
      return { success: false, error: error.message || 'Unknown purchase error' };
    }
  }
}