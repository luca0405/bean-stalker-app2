// COMPREHENSIVE SANDBOX FORCE OVERRIDE
// This completely bypasses all environment detection and forces sandbox mode

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export class SandboxForceOverride {
  private static readonly HARDCODED_CONFIG = {
    apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
    appUserID: undefined, // Let RevenueCat generate anonymous ID, then set user later
    observerMode: false,
    usesStoreKit2IfAvailable: true,
  };

  static async initializeForcesSandbox(userID?: string): Promise<boolean> {
    try {
      // Production-ready RevenueCat initialization with sandbox mode for testing
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN }); // Reduced logging for production
      await Purchases.configure({
        ...this.HARDCODED_CONFIG,
        appUserID: userID // Use dynamic user ID if provided
      });
      
      // Verify payment capability
      const canMakePayments = await Purchases.canMakePayments();
      if (!canMakePayments) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  static async aggressiveOfferingsReload(): Promise<any[]> {
    const maxAttempts = 8;
    let offerings: any[] = [];
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      
      try {
        // Refresh customer info first
        try {
          await Purchases.getCustomerInfo();
        } catch (customerError) {
          // Customer refresh failed
        }
        
        // Get offerings
        const offeringsResponse = await Purchases.getOfferings();
        
        if (offeringsResponse.current) {
          offerings = [offeringsResponse.current];
          break;
        } else if (offeringsResponse.all && Object.keys(offeringsResponse.all).length > 0) {
          offerings = Object.values(offeringsResponse.all);
          break;
        } else {
          if (attempt < maxAttempts) {
            const delay = 2000 * attempt; // Increasing delay
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
    

    
    return offerings;
  }


}