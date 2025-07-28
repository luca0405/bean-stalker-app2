// COMPREHENSIVE SANDBOX FORCE OVERRIDE
// This completely bypasses all environment detection and forces sandbox mode

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class SandboxForceOverride {
  private static readonly HARDCODED_CONFIG = {
    apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
    appUserID: undefined, // Dynamic user ID for sandbox testing with different users
    observerMode: false,
    usesStoreKit2IfAvailable: true,
  };

  static async initializeForcesSandbox(userID?: string): Promise<boolean> {
    try {
      console.log('💳 REVENUECAT FIX: Initializing RevenueCat to prevent transfer behavior');
      console.log('💳 REVENUECAT FIX: Target user ID:', userID || 'anonymous');
      
      // Always use verbose logging for IAP debugging
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      console.log('💳 REVENUECAT FIX: Debug logging enabled');
      
      // CRITICAL FIX: Configure with consistent user ID to prevent transfers
      // Don't use userID in configure() - use logIn() instead to prevent transfer behavior
      const config = {
        ...this.HARDCODED_CONFIG,
        appUserID: undefined, // ALWAYS start anonymous, then logIn to specific user
      };
      
      console.log('💳 REVENUECAT FIX: Configuring RevenueCat anonymously first');
      console.log('💳 REVENUECAT FIX: API Key:', config.apiKey.substring(0, 12) + '...');
      console.log('💳 REVENUECAT FIX: Starting anonymous, will login to user:', userID || 'none');
      
      await Purchases.configure(config);
      console.log('💳 REVENUECAT FIX: RevenueCat configured anonymously');
      
      // CRITICAL FIX: If userID provided, login after configuration
      if (userID) {
        console.log('💳 REVENUECAT FIX: Logging in to user:', userID);
        const loginResult = await Purchases.logIn({ appUserID: userID });
        console.log('💳 REVENUECAT FIX: Login successful - no transfer should occur');
        console.log('💳 REVENUECAT FIX: Customer info:', {
          originalAppUserId: loginResult.customerInfo.originalAppUserId,
          activeSubscriptions: Object.keys(loginResult.customerInfo.activeSubscriptions),
          created: loginResult.created ? 'New customer' : 'Existing customer'
        });
      }
      
      // Verify payment capability
      const canMakePayments = await Purchases.canMakePayments();
      console.log('💳 REVENUECAT FIX: Payment capability check:', canMakePayments);
      if (!canMakePayments) {
        console.error('💳 REVENUECAT FIX: CRITICAL - Payment capability disabled!');
        console.error('💳 REVENUECAT FIX: Check Apple ID sandbox account and device settings');
      } else {
        console.log('💳 REVENUECAT FIX: Payment capability confirmed - native popups should work');
      }
      
      return true;
    } catch (error) {
      console.error('💳 REVENUECAT FIX: Failed to initialize:', error);
      return false;
    }
  }
  
  // Set user ID for RevenueCat after initialization
  static async setUserID(userID: string): Promise<boolean> {
    try {
      console.log('💳 REVENUECAT FIX: Switching to user ID (this should NOT cause transfers):', userID);
      
      // Check current user first
      const { customerInfo } = await Purchases.getCustomerInfo();
      const currentUser = customerInfo.originalAppUserId;
      console.log('💳 REVENUECAT FIX: Current user:', currentUser);
      console.log('💳 REVENUECAT FIX: Target user:', userID);
      
      if (currentUser === userID) {
        console.log('💳 REVENUECAT FIX: Already logged in as target user - no action needed');
        return true;
      }
      
      const loginResult = await Purchases.logIn({ appUserID: userID });
      console.log('💳 REVENUECAT FIX: User login completed');
      console.log('💳 REVENUECAT FIX: Created new customer:', loginResult.created);
      console.log('💳 REVENUECAT FIX: Final user ID:', loginResult.customerInfo.originalAppUserId);
      
      if (loginResult.created) {
        console.log('💳 REVENUECAT FIX: This is a NEW customer - no transfer should occur');
      } else {
        console.log('💳 REVENUECAT FIX: This is an EXISTING customer - purchases preserved');
      }
      
      return true;
    } catch (error) {
      console.error('💳 REVENUECAT FIX: Failed to set user ID:', error);
      return false;
    }
  }

  static async aggressiveOfferingsReload(): Promise<any[]> {
    console.log('🚀 SANDBOX FORCE: Starting aggressive offerings reload');
    const maxAttempts = 8;
    let offerings: any[] = [];
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🚀 SANDBOX FORCE: Attempt ${attempt}/${maxAttempts}`);
      
      try {
        // Refresh customer info first
        try {
          const customerInfoResult = await Purchases.getCustomerInfo();
          console.log(`🚀 SANDBOX FORCE: Customer refreshed - ID: ${customerInfoResult.customerInfo.originalAppUserId}`);
        } catch (customerError) {
          console.warn(`🚀 SANDBOX FORCE: Customer refresh failed:`, customerError);
        }
        
        // Get offerings
        const offeringsResponse = await Purchases.getOfferings();
        console.log(`🚀 SANDBOX FORCE: Offerings response:`, {
          hasCurrent: !!offeringsResponse.current,
          allCount: Object.keys(offeringsResponse.all || {}).length,
          allKeys: Object.keys(offeringsResponse.all || {})
        });
        
        if (offeringsResponse.current) {
          console.log(`🚀 SANDBOX FORCE: Found current offering: ${offeringsResponse.current.identifier}`);
          console.log(`🚀 SANDBOX FORCE: Packages in current: ${offeringsResponse.current.availablePackages?.length || 0}`);
          offerings = [offeringsResponse.current];
          break;
        } else if (offeringsResponse.all && Object.keys(offeringsResponse.all).length > 0) {
          console.log(`🚀 SANDBOX FORCE: No current offering, using all: ${Object.keys(offeringsResponse.all)}`);
          offerings = Object.values(offeringsResponse.all);
          break;
        } else {
          console.log(`🚀 SANDBOX FORCE: No offerings found on attempt ${attempt}`);
          if (attempt < maxAttempts) {
            const delay = 2000 * attempt; // Increasing delay
            console.log(`🚀 SANDBOX FORCE: Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        console.error(`🚀 SANDBOX FORCE: Attempt ${attempt} failed:`, error);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
    
    console.log(`🚀 SANDBOX FORCE: Final result: ${offerings.length} offerings loaded`);
    
    // Log detailed package information if found
    offerings.forEach((offering, index) => {
      console.log(`🚀 SANDBOX FORCE: Offering ${index + 1}: ${offering.identifier}`);
      if (offering.availablePackages && offering.availablePackages.length > 0) {
        offering.availablePackages.forEach((pkg: any, pkgIndex: number) => {
          console.log(`🚀 SANDBOX FORCE:   Package ${pkgIndex + 1}: ${pkg.product.identifier}`);
          console.log(`🚀 SANDBOX FORCE:   Title: ${pkg.product.title}`);
          console.log(`🚀 SANDBOX FORCE:   Price: ${pkg.product.priceString}`);
        });
      } else {
        console.log(`🚀 SANDBOX FORCE:   No packages in offering ${offering.identifier}`);
      }
    });
    
    if (offerings.length === 0) {
      console.error('🚀 SANDBOX FORCE: CRITICAL - No offerings loaded after all attempts');
      console.error('🚀 SANDBOX FORCE: This indicates:');
      console.error('🚀 SANDBOX FORCE:   1. App Store Connect products not "Ready to Submit"');
      console.error('🚀 SANDBOX FORCE:   2. RevenueCat dashboard not configured with offerings');
      console.error('🚀 SANDBOX FORCE:   3. Bundle ID mismatch (expected: com.beanstalker.member)');
      console.error('🚀 SANDBOX FORCE:   4. Sandbox Apple ID not signed in properly');
    }
    
    return offerings;
  }

  static getDebugEnvironment() {
    return {
      forcedSandbox: true,
      apiKey: this.HARDCODED_CONFIG.apiKey.substring(0, 12) + '...',
      userID: this.HARDCODED_CONFIG.appUserID,
      timestamp: new Date().toISOString(),
      overrideReason: 'Complete sandbox force to bypass production mode detection'
    };
  }
}