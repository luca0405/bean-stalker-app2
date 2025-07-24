import { Purchases, PurchasesOffering, PurchasesPackage, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { FALLBACK_REVENUECAT_CONFIG } from './fallback-iap-config';
import { SANDBOX_IAP_CONFIG } from './sandbox-iap-override';
import { SandboxForceOverride } from './sandbox-force-override';

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  type: 'membership' | 'credits';
}

export interface PurchaseResult {
  success: boolean;
  productId: string;
  transactionId?: string;
  receipt?: string;
  purchaseData?: any;
  error?: string;
}

class IAPService {
  private isInitialized = false;
  private offerings: PurchasesOffering[] = [];

  // Product IDs - matching your App Store Connect products
  private readonly PRODUCT_IDS = {
    PREMIUM_MEMBERSHIP: 'com.beanstalker.membership69',
    CREDITS_25: 'com.beanstalker.credit25', 
    CREDITS_50: 'com.beanstalker.credit50',
    CREDITS_100: 'com.beanstalker.credit100'
  };

  async initialize(): Promise<boolean> {
    const isWebPlatform = !Capacitor.isNativePlatform();
    
    if (isWebPlatform) {
      // Web platform uses simulated IAP for development
      this.isInitialized = true;
      return true;
    }
    
    // Production-ready sandbox configuration for TestFlight testing
    
    try {
      // Initialize RevenueCat with sandbox configuration
      // Don't set user ID during initialization - will be set when user logs in
      const initSuccess = await SandboxForceOverride.initializeForcesSandbox();
      if (!initSuccess) {
        return false;
      }
      
      // Load IAP offerings
      const loadedOfferings = await SandboxForceOverride.aggressiveOfferingsReload();
      this.offerings = loadedOfferings;
      
      // Verify we have products available
      if (loadedOfferings.length === 0) {
        throw new Error('No RevenueCat offerings available. Check App Store Connect and RevenueCat Dashboard.');
      }
      
      this.isInitialized = true;
      
      return true;
    } catch (error) {
      // IAP initialization failed
      return false;
    }
  }

  async setUserID(userID: string): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    const isWebPlatform = !Capacitor.isNativePlatform();
    if (isWebPlatform) {
      // Web platform doesn't need user ID management
      return;
    }
    
    try {
      // Log in user with their actual user ID for RevenueCat tracking
      await Purchases.logIn({ appUserID: userID.toString() });
    } catch (error) {
      // IAP user login failed - handled silently for production
    }
  }

  private async loadOfferings(): Promise<void> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        this.offerings = [offerings.current];
      } else if (offerings.all && Object.keys(offerings.all).length > 0) {
        this.offerings = Object.values(offerings.all);
        
        // Prefer 'default' offering if it exists
        if (offerings.all.default) {
          this.offerings = [offerings.all.default];
        }
      } else {
        this.offerings = [];
      }
    } catch (error) {
      // Failed to load offerings - handled silently for production
    }
  }





  async getAvailableProducts(): Promise<IAPProduct[]> {
    if (!this.isInitialized) {
      return [];
    }

    // Only use development mode on actual web platform, never on mobile
    const isWebPlatform = !Capacitor.isNativePlatform();
    
    if (isWebPlatform) {

      return [
        {
          id: this.PRODUCT_IDS.PREMIUM_MEMBERSHIP,
          title: 'Premium Membership',
          description: 'Full access to Bean Stalker premium features',
          price: 'AUD $69.00',
          priceAmountMicros: 69000000,
          priceCurrencyCode: 'AUD',
          type: 'membership'
        },
        {
          id: this.PRODUCT_IDS.CREDITS_25,
          title: '$29.50 Credits',
          description: 'Get $29.50 credits for $25 - $4.50 bonus!',
          price: 'AUD $25.00',
          priceAmountMicros: 25000000,
          priceCurrencyCode: 'AUD',
          type: 'credits'
        },
        {
          id: this.PRODUCT_IDS.CREDITS_50,
          title: '$59.90 Credits',
          description: 'Get $59.90 credits for $50 - $9.90 bonus!',
          price: 'AUD $50.00',
          priceAmountMicros: 50000000,
          priceCurrencyCode: 'AUD',
          type: 'credits'
        },
        {
          id: this.PRODUCT_IDS.CREDITS_100,
          title: '$120.70 Credits',
          description: 'Get $120.70 credits for $100 - $20.70 bonus!',
          price: 'AUD $100.00',
          priceAmountMicros: 100000000,
          priceCurrencyCode: 'AUD',
          type: 'credits'
        }
      ];
    }

    // Mobile platform - use real RevenueCat products
    const products: IAPProduct[] = [];

    // If no offerings loaded, try to load them
    if (this.offerings.length === 0) {
      await this.loadOfferings();
    }

    for (const offering of this.offerings) {
      for (const packageObj of offering.availablePackages) {
        const product = packageObj.product;
        
        products.push({
          id: product.identifier,
          title: product.title,
          description: product.description,
          price: product.priceString,
          priceAmountMicros: product.price * 1000000, // Convert to micros
          priceCurrencyCode: product.currencyCode,
          type: this.getProductType(product.identifier)
        });
      }
    }

    // If still no products, something is wrong with RevenueCat configuration
    if (products.length === 0) {
      throw new Error('No RevenueCat products available. Check App Store Connect and RevenueCat Dashboard configuration.');
    }

    return products;
  }

  private getProductType(productId: string): 'membership' | 'credits' {
    if (productId.includes('membership')) {
      return 'membership';
    }
    return 'credits';
  }

  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      return { success: false, productId, error: 'Service not initialized' };
    }

    // Only simulate purchases on web platform - mobile always uses real RevenueCat
    const isWebPlatform = !Capacitor.isNativePlatform();
    
    if (isWebPlatform) {
      console.log(`IAP: Simulating purchase for ${productId}`);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        productId,
        transactionId: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        receipt: JSON.stringify({
          productId,
          purchaseDate: new Date().toISOString(),
          environment: 'development'
        })
      };
    }

    // Mobile platform - always use real RevenueCat IAP system
    try {
      // Find the package for this product
      let targetPackage: PurchasesPackage | null = null;
      
      for (const offering of this.offerings) {
        for (const packageObj of offering.availablePackages) {
          if (packageObj.product.identifier === productId) {
            targetPackage = packageObj;
            break;
          }
        }
        if (targetPackage) break;
      }

      if (!targetPackage) {
        // If product not found, try to reload offerings once
        await this.loadOfferings();
        
        // Search again after reload
        for (const offering of this.offerings) {
          for (const packageObj of offering.availablePackages) {
            if (packageObj.product.identifier === productId) {
              targetPackage = packageObj;
              break;
            }
          }
          if (targetPackage) break;
        }
        
        if (!targetPackage) {
          throw new Error(`Product ${productId} not available in RevenueCat offerings. Check App Store Connect and RevenueCat Dashboard.`);
        }
      }

      // Make the purchase
      const result = await Purchases.purchasePackage({ 
        aPackage: targetPackage 
      });

      // Generate a unique transaction ID for each purchase attempt to allow multiple purchases
      // Use RevenueCat transaction ID if available, otherwise generate unique ID with timestamp
      const transactionId = result.transaction?.transactionIdentifier || 
                           result.transaction?.revenueCatId || 
                           `rc_${productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        productId,
        transactionId,
        receipt: JSON.stringify({
          customerInfo: result.customerInfo,
          transaction: result.transaction,
          purchaseDate: new Date().toISOString()
        })
      };
    } catch (error: any) {
      console.error('IAP: Purchase failed', error);
      
      // Handle user cancellation
      if (error.code === 'PURCHASE_CANCELLED') {
        return {
          success: false,
          productId,
          error: 'Purchase cancelled by user'
        };
      }

      return {
        success: false,
        productId,
        error: error.message || 'Purchase failed'
      };
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    try {
      const result = await Purchases.restorePurchases();
      console.log('IAP: Purchases restored', result);
      return true;
    } catch (error) {
      console.error('IAP: Failed to restore purchases', error);
      return false;
    }
  }

  isAvailable(): boolean {
    // Available when properly initialized 
    return this.isInitialized;
  }

  // Convert credit amount to product ID
  getCreditsProductId(amount: number): string {
    switch (amount) {
      case 25: return this.PRODUCT_IDS.CREDITS_25;
      case 50: return this.PRODUCT_IDS.CREDITS_50;
      case 100: return this.PRODUCT_IDS.CREDITS_100;
      default: return this.PRODUCT_IDS.CREDITS_25;
    }
  }

  getMembershipProductId(): string {
    return this.PRODUCT_IDS.PREMIUM_MEMBERSHIP;
  }
}

export const iapService = new IAPService();