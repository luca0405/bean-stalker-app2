import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

/**
 * NUCLEAR OPTION: Completely reset RevenueCat to force correct user ID mapping
 * This is the last resort to fix the anonymous ID issue that's been plaguing all users
 */
export class RevenueCatNuclearFix {
  
  /**
   * Nuclear option: Completely reset RevenueCat and force correct user mapping
   * This will work or nothing will
   */
  static async nuclearReset(userId: string): Promise<boolean> {
    console.log('🔥 NUCLEAR REVENUCAT RESET: Starting complete reset for user:', userId);
    
    try {
      // Step 1: Enable maximum debug logging
      await Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE });
      console.log('🔥 NUCLEAR: Debug logging enabled');
      
      // Step 2: Force logout to completely clear any cached state
      try {
        await Purchases.logOut();
        console.log('🔥 NUCLEAR: Forced logout completed');
      } catch (error) {
        console.log('🔥 NUCLEAR: Logout completed (was already logged out)');
      }
      
      // Step 3: Wait a moment for logout to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Reconfigure RevenueCat completely fresh with the user ID
      console.log('🔥 NUCLEAR: Reconfiguring RevenueCat with user ID:', userId);
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        appUserID: userId,
        observerMode: false,
        userDefaultsSuiteName: undefined,
        useStoreKit2IfAvailable: true,
        shouldShowInAppMessagesAutomatically: true
      });
      
      // Step 5: Immediately verify the configuration worked
      const { customerInfo } = await Purchases.getCustomerInfo();
      const actualUserId = customerInfo.originalAppUserId;
      
      console.log('🔥 NUCLEAR: Configuration result:');
      console.log('🔥 NUCLEAR: Expected user ID:', userId);
      console.log('🔥 NUCLEAR: Actual user ID:', actualUserId);
      
      if (actualUserId === userId) {
        console.log('🔥 NUCLEAR: SUCCESS - RevenueCat now using correct user ID');
        return true;
      } else if (actualUserId.startsWith('$RCAnonymous')) {
        console.error('🔥 NUCLEAR: FAILED - Still getting anonymous ID after reset');
        return false;
      } else {
        console.error('🔥 NUCLEAR: FAILED - Got different user ID:', actualUserId);
        return false;
      }
      
    } catch (error) {
      console.error('🔥 NUCLEAR: Complete failure during reset:', error);
      return false;
    }
  }
  
  /**
   * Get the current state for debugging
   */
  static async getCurrentState(): Promise<{
    userId: string;
    isAnonymous: boolean;
    canMakePayments: boolean;
    error?: string;
  }> {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const canMakePayments = await Purchases.canMakePayments();
      
      return {
        userId: customerInfo.originalAppUserId,
        isAnonymous: customerInfo.originalAppUserId.startsWith('$RCAnonymous'),
        canMakePayments
      };
    } catch (error) {
      return {
        userId: 'ERROR',
        isAnonymous: false,
        canMakePayments: false,
        error: String(error)
      };
    }
  }
}