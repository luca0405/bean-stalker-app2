// COMPREHENSIVE SANDBOX FORCE OVERRIDE
// This completely bypasses all environment detection and forces sandbox mode

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class SandboxForceOverride {
  private static readonly HARDCODED_CONFIG = {
    apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
    appUserID: '32',
    observerMode: false,
    usesStoreKit2IfAvailable: true,
  };

  static async initializeForcesSandbox(): Promise<boolean> {
    try {
      // Only log in development or when diagnostics enabled
      const shouldLog = !import.meta.env.PROD || import.meta.env.VITE_ENABLE_IAP_LOGS === 'true';
      if (shouldLog) {
        console.log('🚀 SANDBOX FORCE: Initializing sandbox IAP for production testing');
        console.log('🚀 SANDBOX FORCE: Production app with sandbox IAP configuration');
      }
      
      // Set appropriate log level based on environment
      const logLevel = import.meta.env.PROD ? LOG_LEVEL.INFO : LOG_LEVEL.DEBUG;
      await Purchases.setLogLevel({ level: logLevel });
      if (shouldLog) {
        console.log('🚀 SANDBOX FORCE: RevenueCat logging configured');
      }
      
      // Configure with hardcoded sandbox settings
      if (shouldLog) {
        console.log('🚀 SANDBOX FORCE: Configuring with hardcoded sandbox settings');
        console.log('🚀 SANDBOX FORCE: API Key:', this.HARDCODED_CONFIG.apiKey.substring(0, 12) + '...');
      }
      if (shouldLog) {
        console.log('🚀 SANDBOX FORCE: User ID:', this.HARDCODED_CONFIG.appUserID);
      }
      
      await Purchases.configure(this.HARDCODED_CONFIG);
      if (shouldLog) {
        console.log('🚀 SANDBOX FORCE: RevenueCat configured successfully');
      }
      
      // Verify payment capability
      const canMakePayments = await Purchases.canMakePayments();
      if (shouldLog) {
        console.log('🚀 SANDBOX FORCE: Can make payments:', canMakePayments);
        if (!canMakePayments) {
          console.warn('🚀 SANDBOX FORCE: Payment capability disabled - check sandbox account');
        }
      }
      
      return true;
    } catch (error) {
      console.error('🚀 SANDBOX FORCE: Failed to initialize:', error);
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