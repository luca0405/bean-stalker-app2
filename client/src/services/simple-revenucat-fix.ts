import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

/**
 * SIMPLE DIRECT FIX: Stop the anonymous ID assignment
 */
export async function forceCorrectUserID(userId: string): Promise<boolean> {
  console.log('SIMPLE FIX: Forcing RevenueCat to use user ID:', userId);
  
  try {
    // Step 1: Configure RevenueCat with the user ID from the start
    await Purchases.configure({
      apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
      appUserID: userId  // This should prevent anonymous ID
    });
    
    // Step 2: Verify it worked
    const { customerInfo } = await Purchases.getCustomerInfo();
    const actualId = customerInfo.originalAppUserId;
    
    console.log('SIMPLE FIX: Expected:', userId);
    console.log('SIMPLE FIX: Got:', actualId);
    
    if (actualId === userId) {
      console.log('SIMPLE FIX: SUCCESS');
      return true;
    } else {
      console.log('SIMPLE FIX: FAILED - trying login method');
      
      // Try login method
      await Purchases.logIn({ appUserID: userId });
      const { customerInfo: newInfo } = await Purchases.getCustomerInfo();
      const newId = newInfo.originalAppUserId;
      
      console.log('SIMPLE FIX: After login:', newId);
      return newId === userId;
    }
    
  } catch (error) {
    console.error('SIMPLE FIX: Error:', error);
    return false;
  }
}