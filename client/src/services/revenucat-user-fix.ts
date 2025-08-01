import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

/**
 * CRITICAL FIX: Forces RevenueCat to use actual Bean Stalker user IDs
 * instead of anonymous IDs like $RCAnonymousID:ecd0792569940d985ec30aec
 */
export class RevenueCatUserFix {
  private static instance: RevenueCatUserFix | null = null;
  private isConfigured = false;

  static getInstance(): RevenueCatUserFix {
    if (!this.instance) {
      this.instance = new RevenueCatUserFix();
    }
    return this.instance;
  }

  /**
   * CRITICAL: Force RevenueCat to use the actual Bean Stalker user ID
   * This prevents the $RCAnonymousID mapping issue that breaks webhooks
   */
  async forceUserIdMapping(beanStalkerUserId: string): Promise<boolean> {
    try {
      console.log('🚨 REVENUCAT USER FIX: FORCING USER ID MAPPING');
      console.log('🚨 Target Bean Stalker User ID:', beanStalkerUserId);
      
      // Step 1: Enable debug logging
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // Step 2: Configure RevenueCat with the specific user ID
      if (!this.isConfigured) {
        console.log('🚨 CONFIGURING RevenueCat with user ID to prevent anonymous assignment');
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
          appUserID: beanStalkerUserId // CRITICAL: This prevents anonymous ID
        });
        this.isConfigured = true;
      }
      
      // Step 3: Verify current customer ID
      const { customerInfo } = await Purchases.getCustomerInfo();
      const currentCustomerId = customerInfo.originalAppUserId;
      
      console.log('🚨 CUSTOMER ID CHECK:');
      console.log('🚨 - Expected:', beanStalkerUserId);
      console.log('🚨 - Current:', currentCustomerId);
      
      // Step 4: Force login if not correctly mapped
      if (currentCustomerId !== beanStalkerUserId) {
        console.log('🚨 CUSTOMER ID MISMATCH - FORCING LOGIN TO FIX');
        
        if (currentCustomerId.startsWith('$RCAnonymous')) {
          console.log('🚨 ANONYMOUS ID DETECTED - This is the exact problem we need to fix');
        }
        
        // Force logout to clear any cached state
        try {
          await Purchases.logOut();
          console.log('🚨 Logged out to clear cached state');
        } catch (logoutError) {
          console.log('🚨 Logout completed (or was already logged out)');
        }
        
        // Force login with correct user ID
        console.log('🚨 FORCING LOGIN with Bean Stalker user ID:', beanStalkerUserId);
        const loginResult = await Purchases.logIn({ appUserID: beanStalkerUserId });
        
        console.log('🚨 LOGIN RESULT:');
        console.log('🚨 - Created new customer:', loginResult.created);
        console.log('🚨 - Final customer ID:', loginResult.customerInfo.originalAppUserId);
        
        // Final verification
        if (loginResult.customerInfo.originalAppUserId === beanStalkerUserId) {
          console.log('✅ SUCCESS: RevenueCat now properly mapped to Bean Stalker user ID');
          return true;
        } else {
          console.error('❌ FAILED: RevenueCat still not properly mapped');
          console.error('❌ Expected:', beanStalkerUserId);
          console.error('❌ Got:', loginResult.customerInfo.originalAppUserId);
          return false;
        }
      } else {
        console.log('✅ Customer ID already correctly mapped');
        return true;
      }
      
    } catch (error) {
      console.error('🚨 REVENUCAT USER FIX FAILED:', error);
      return false;
    }
  }

  /**
   * Get current RevenueCat customer information for debugging
   */
  async getCustomerDebugInfo(): Promise<{
    customerId: string;
    isAnonymous: boolean;
    canMakePayments: boolean;
    activeSubscriptions: string[];
  }> {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const canMakePayments = await Purchases.canMakePayments();
      
      return {
        customerId: customerInfo.originalAppUserId,
        isAnonymous: customerInfo.originalAppUserId.startsWith('$RCAnonymous'),
        canMakePayments,
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions)
      };
    } catch (error) {
      console.error('Failed to get RevenueCat debug info:', error);
      return {
        customerId: 'ERROR',
        isAnonymous: false,
        canMakePayments: false,
        activeSubscriptions: []
      };
    }
  }

  /**
   * Complete diagnostic check for user ID mapping issues
   */
  async diagnosticCheck(expectedUserId: string): Promise<{
    status: 'SUCCESS' | 'ANONYMOUS_ID' | 'WRONG_ID' | 'ERROR';
    currentId: string;
    message: string;
  }> {
    try {
      const debugInfo = await this.getCustomerDebugInfo();
      
      if (debugInfo.customerId === expectedUserId) {
        return {
          status: 'SUCCESS',
          currentId: debugInfo.customerId,
          message: 'RevenueCat properly mapped to Bean Stalker user ID'
        };
      } else if (debugInfo.isAnonymous) {
        return {
          status: 'ANONYMOUS_ID',
          currentId: debugInfo.customerId,
          message: `Anonymous ID detected: ${debugInfo.customerId}. This prevents Apple Pay and webhooks.`
        };
      } else {
        return {
          status: 'WRONG_ID',
          currentId: debugInfo.customerId,
          message: `Wrong user ID: Expected ${expectedUserId}, got ${debugInfo.customerId}`
        };
      }
    } catch (error) {
      return {
        status: 'ERROR',
        currentId: 'UNKNOWN',
        message: `RevenueCat diagnostic failed: ${error}`
      };
    }
  }
}

export const revenueCatUserFix = RevenueCatUserFix.getInstance();