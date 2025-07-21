import { Purchases, PurchasesOffering, PurchasesPackage, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

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
    // Development mode - simulate IAP when not on native platform or no API key
    const isDevelopmentMode = !Capacitor.isNativePlatform() || !import.meta.env.VITE_REVENUECAT_API_KEY;
    
    if (isDevelopmentMode) {
      console.log('IAP: Running in development mode - simulating IAP functionality');
      this.isInitialized = true;
      return true;
    }

    try {
      // Configure RevenueCat for production
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
      await Purchases.configure({
        apiKey,
        appUserID: undefined, // Will be set when user logs in
      });

      // Get available offerings
      await this.loadOfferings();
      
      this.isInitialized = true;
      console.log('IAP: Service initialized successfully');
      return true;
    } catch (error) {
      console.error('IAP: Failed to initialize', error);
      return false;
    }
  }

  async setUserID(userID: string): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await Purchases.logIn({ appUserID: userID });
      console.log('IAP: User ID set', userID);
    } catch (error) {
      console.error('IAP: Failed to set user ID', error);
    }
  }

  private async loadOfferings(): Promise<void> {
    try {
      const offerings = await Purchases.getOfferings();
      this.offerings = offerings.all ? Object.values(offerings.all) : [];
      console.log('IAP: Loaded offerings', this.offerings);
    } catch (error) {
      console.error('IAP: Failed to load offerings', error);
    }
  }

  async getAvailableProducts(): Promise<IAPProduct[]> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    // Development mode - return mock products
    const isDevelopmentMode = !Capacitor.isNativePlatform() || !import.meta.env.VITE_REVENUECAT_API_KEY;
    
    if (isDevelopmentMode) {
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

    // Production mode - use RevenueCat
    const products: IAPProduct[] = [];

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
      throw new Error('IAP service not initialized');
    }

    // Development mode - simulate successful purchase
    const isDevelopmentMode = !Capacitor.isNativePlatform() || !import.meta.env.VITE_REVENUECAT_API_KEY;
    
    if (isDevelopmentMode) {
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

    // Production mode - use RevenueCat
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
        throw new Error(`Product ${productId} not found`);
      }

      // Make the purchase
      const result = await Purchases.purchasePackage({ 
        aPackage: targetPackage 
      });

      return {
        success: true,
        productId,
        transactionId: result.customerInfo.originalAppUserId,
        receipt: JSON.stringify(result.customerInfo)
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
    // Available in development mode or when properly initialized
    const isDevelopmentMode = !Capacitor.isNativePlatform() || !import.meta.env.VITE_REVENUECAT_API_KEY;
    return this.isInitialized && (isDevelopmentMode || Capacitor.isNativePlatform());
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