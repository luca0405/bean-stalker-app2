import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

/**
 * ENHANCED REVENUECATFIX: Multiple retry strategies for user ID assignment
 */
export async function forceCorrectUserID(userId: string): Promise<boolean> {
  console.log('🔧 NEW USER REGISTRATION FIX: Starting multi-strategy fix for fresh user ID:', userId);
  console.log('🔧 NOTE: This user ID is brand new from registration, not existing user');
  
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`🔧 USER ID FIX: Attempt ${attempt}/${maxAttempts}`);
    
    try {
      // Strategy 1: Complete logout and fresh configuration
      if (attempt === 1) {
        console.log('🔧 Strategy 1: Fresh configuration with user ID');
        
        try {
          await Purchases.logOut();
          console.log('🔧 Logout completed');
        } catch (logoutError) {
          console.log('🔧 Logout completed (was already logged out)');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
          appUserID: userId,
          observerMode: false,
          useStoreKit2IfAvailable: true
        });
      }
      
      // Strategy 2: NEW USER REGISTRATION SPECIFIC - Anonymous config then forced login  
      else if (attempt === 2) {
        console.log('🔧 Strategy 2: NEW USER REGISTRATION - Anonymous config then forced login for user:', userId);
        
        try {
          await Purchases.logOut();
        } catch {}
        
        // Longer delay for new user registration scenarios
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Configure anonymously first (critical for new user registration)
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
          observerMode: false,
          useStoreKit2IfAvailable: true
        });
        
        // Wait for RevenueCat to initialize completely
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Then force login with the new user ID
        console.log('🔧 NEW USER: Force logging in with fresh user ID:', userId);
        await Purchases.logIn({ appUserID: userId });
        
        // Additional verification for new users
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('🔧 NEW USER: Verifying user ID assignment...');
      }
      
      // Strategy 3: Nuclear reset with extended delays
      else if (attempt === 3) {
        console.log('🔧 Strategy 3: Nuclear reset with extended delays');
        
        try {
          await Purchases.logOut();
        } catch {}
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE });
        
        await Purchases.configure({
          apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
          appUserID: userId,
          observerMode: false,
          useStoreKit2IfAvailable: true
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Double-verify with forced login
        await Purchases.logIn({ appUserID: userId });
      }
      
      // Verify the result
      await new Promise(resolve => setTimeout(resolve, 500));
      const { customerInfo } = await Purchases.getCustomerInfo();
      const actualId = customerInfo.originalAppUserId;
      
      console.log(`🔧 Attempt ${attempt} result: Expected ${userId}, Got ${actualId}`);
      
      if (actualId === userId) {
        console.log(`✅ USER ID FIX: SUCCESS on attempt ${attempt} - RevenueCat using correct user ID`);
        return true;
      } else if (attempt === maxAttempts) {
        console.error('❌ USER ID FIX: FAILED after all attempts. Final user ID:', actualId);
        return false;
      } else {
        console.log(`⚠️ Attempt ${attempt} failed, trying strategy ${attempt + 1}...`);
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} error:`, error);
      if (attempt === maxAttempts) {
        console.error('❌ USER ID FIX: All strategies failed with error:', error);
        return false;
      }
    }
  }
  
  return false;
}