import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

/**
 * SIMPLE DIRECT FIX: Stop the anonymous ID assignment
 */
export async function forceCorrectUserID(userId: string): Promise<boolean> {
  console.log('USER ID FIX: Forcing RevenueCat to use user ID:', userId);
  
  try {
    // CRITICAL: Always logout first to clear any cached user state
    try {
      console.log('USER ID FIX: Logging out to clear cached state...');
      await Purchases.logOut();
    } catch (logoutError) {
      console.log('USER ID FIX: Logout completed');
    }
    
    // Wait for logout to process
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 1: Configure RevenueCat with the user ID from the start
    console.log('USER ID FIX: Configuring RevenueCat with user ID:', userId);
    await Purchases.configure({
      apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
      appUserID: userId,  // This should prevent anonymous ID
      observerMode: false,
      useStoreKit2IfAvailable: true
    });
    
    // Step 2: Verify it worked
    const { customerInfo } = await Purchases.getCustomerInfo();
    const actualId = customerInfo.originalAppUserId;
    
    console.log('USER ID FIX: Expected user ID:', userId);
    console.log('USER ID FIX: Actual customer ID:', actualId);
    
    if (actualId === userId) {
      console.log('USER ID FIX: SUCCESS - RevenueCat using correct user ID');
      return true;
    } else {
      console.log('USER ID FIX: Configuration failed, trying forced login...');
      
      // Force login with the correct user ID
      const loginResult = await Purchases.logIn({ appUserID: userId });
      const finalId = loginResult.customerInfo.originalAppUserId;
      
      console.log('USER ID FIX: After forced login:', finalId);
      console.log('USER ID FIX: Login created new customer:', loginResult.created);
      
      if (finalId === userId) {
        console.log('USER ID FIX: SUCCESS via forced login');
        return true;
      } else {
        console.error('USER ID FIX: FAILED - Still wrong user ID:', finalId);
        return false;
      }
    }
    
  } catch (error) {
    console.error('USER ID FIX: Critical error:', error);
    return false;
  }
}