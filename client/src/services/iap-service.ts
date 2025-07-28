import { Purchases, PurchasesOffering, PurchasesPackage, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { FALLBACK_REVENUECAT_CONFIG } from './fallback-iap-config';
import { SANDBOX_IAP_CONFIG } from './sandbox-iap-override';
import { SandboxForceOverride } from './sandbox-force-override';
import { APP_CONFIG } from '../config/environment';

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
    CREDITS_25: 'com.beanstalker.credits25', 
    CREDITS_50: 'com.beanstalker.credits50',
    CREDITS_100: 'com.beanstalker.credits100'
  };

  async initialize(): Promise<boolean> {
    const isWebPlatform = !Capacitor.isNativePlatform();
    
    if (isWebPlatform) {
      console.log('IAP: Running in web development mode - simulating IAP functionality');
      this.isInitialized = true;
      return true;
    }
    
    // ===== PRODUCTION IAP WITH SANDBOX TESTING =====
    if (APP_CONFIG.features.enableConsoleLogging) {
      console.log('🔥 IAP: PRODUCTION APP - SANDBOX IAP MODE FOR TESTING');
      console.log('🔥 IAP: App is production-ready but IAP uses sandbox for continued testing');
    }
    
    try {
      // Use comprehensive sandbox force override with dynamic user ID
      const initSuccess = await SandboxForceOverride.initializeForcesSandbox();
      if (!initSuccess) {
        console.error('🔥 IAP: Sandbox force initialization failed');
        return false;
      }
      
      // Use aggressive offerings reload
      const loadedOfferings = await SandboxForceOverride.aggressiveOfferingsReload();
      this.offerings = loadedOfferings;
      
      this.isInitialized = true;
      if (APP_CONFIG.features.enableConsoleLogging) {
        console.log('🔥 IAP: SANDBOX IAP INITIALIZATION COMPLETE');
        console.log('🔥 IAP: Final offerings loaded:', this.offerings.length);
        console.log('🔥 IAP: Debug environment:', SandboxForceOverride.getDebugEnvironment());
      }
      
      return true;
    } catch (error) {
      console.error('IAP: Failed to initialize', error);
      console.error('IAP: Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  async setUserID(userID: string): Promise<void> {
    if (!this.isInitialized) {
      console.error('IAP: Cannot set user ID - service not initialized');
      return;
    }
    
    // Use the fixed RevenueCat user switching logic
    try {
      await SandboxForceOverride.setUserID(userID);
    } catch (error) {
      console.error('IAP: Failed to set user ID via sandbox override:', error);
    }
  }
  
  async initializeWithUserID(userID: string): Promise<boolean> {
    try {
      console.log('💳 IAP: CRITICAL - Re-initializing RevenueCat for native payment popups with user ID:', userID);
      
      // Native mobile app - initialize RevenueCat with specific user ID for native payment popups
      const initSuccess = await SandboxForceOverride.initializeForcesSandbox(userID);
      if (!initSuccess) {
        console.error('💳 IAP: CRITICAL - Sandbox force initialization with user ID failed');
        return false;
      }
      
      const loadedOfferings = await SandboxForceOverride.aggressiveOfferingsReload();
      this.offerings = loadedOfferings;
      
      this.isInitialized = true;
      console.log('💳 IAP: SUCCESS - RevenueCat re-initialized with user ID for native payment popups:', userID);
      console.log('💳 IAP: Offerings loaded:', this.offerings.length, '- Native Apple Pay popups should now work');
      
      return true;
    } catch (error) {
      console.error('💳 IAP: CRITICAL ERROR - Failed to initialize with user ID for native payments:', error);
      return false;
    }
  }

  private async loadOfferings(): Promise<void> {
    try {
      console.log('IAP: Loading offerings from RevenueCat...');
      const offerings = await Purchases.getOfferings();
      
      console.log('IAP: Raw offerings response:', JSON.stringify(offerings, null, 2));
      
      if (offerings.current) {
        this.offerings = [offerings.current];
        console.log('IAP: Using current offering:', offerings.current.identifier);
      } else if (offerings.all && Object.keys(offerings.all).length > 0) {
        this.offerings = Object.values(offerings.all);
        console.log('IAP: No current offering set, using all available offerings:', Object.keys(offerings.all));
        
        // Prefer 'default' offering if it exists
        if (offerings.all.default) {
          this.offerings = [offerings.all.default];
          console.log('IAP: Found and using "default" offering even though not set as current');
        }
      } else {
        console.warn('IAP: No offerings found at all');
        console.warn('IAP: This usually means:');
        console.warn('  1. App Store Connect products are not "Ready for Sale"');
        console.warn('  2. RevenueCat hasn\'t synced with App Store Connect');
        console.warn('  3. Bundle ID mismatch between iOS app and RevenueCat');
        console.warn('  4. No offerings configured in RevenueCat Dashboard');
        this.offerings = [];
      }
      
      console.log('IAP: Loaded', this.offerings.length, 'offerings');
      
      // Log available packages in each offering
      this.offerings.forEach((offering, index) => {
        console.log(`IAP: Offering ${index + 1}: ${offering.identifier}`);
        offering.availablePackages.forEach((pkg, pkgIndex) => {
          console.log(`  Package ${pkgIndex + 1}: ${pkg.product.identifier} - ${pkg.product.title} - ${pkg.product.priceString}`);
        });
      });
      
      if (this.offerings.length === 0) {
        console.error('IAP: ❌ ZERO PRODUCTS FOUND - Common fixes:');
        console.error('  1. Check App Store Connect: Products must be "Ready for Sale"');
        console.error('  2. Check Bundle ID: iOS app (com.beanstalker.member) must match RevenueCat app');
        console.error('  3. Check RevenueCat Dashboard: Create an offering with your products');
        console.error('  4. Wait 1-2 hours after changing App Store Connect status');
        console.error('  5. Verify sandbox Apple ID is signed in on device');
      }
    } catch (error) {
      console.error('IAP: Failed to load offerings', error);
      console.error('IAP: Offerings error details:', JSON.stringify(error, null, 2));
    }
  }

  async getDebugInfo(): Promise<string> {
    const debugLines = [
      `=== Simple RevenueCat Diagnostic ===`,
      `Platform: ${Capacitor.isNativePlatform() ? 'Native (iOS/Android)' : 'Web'}`,
      `API Key Present: ${!!import.meta.env.VITE_REVENUECAT_API_KEY}`,
      `Service Initialized: ${this.isInitialized}`,
      ``,
    ];

    try {
      console.log('IAP: Testing RevenueCat getOfferings...');
      const offerings = await Purchases.getOfferings();
      console.log('IAP: getOfferings successful:', offerings);
      console.log('IAP: All offerings keys:', Object.keys(offerings.all || {}));
      console.log('IAP: Current offering:', offerings.current);
      
      debugLines.push(`✅ RevenueCat API Call: SUCCESS`);
      debugLines.push(`Total offerings found: ${Object.keys(offerings.all || {}).length}`);
      debugLines.push(`Current offering: ${offerings.current?.identifier || 'NONE'}`);
      debugLines.push(`Available offerings: ${Object.keys(offerings.all || {}).join(', ') || 'NONE'}`);
      
      // Platform-specific debugging
      debugLines.push(``, `=== Platform Analysis ===`);
      debugLines.push(`Platform: ${Capacitor.isNativePlatform() ? 'Native iOS/Android' : 'Web Browser'}`);
      debugLines.push(`Bundle ID: ${Capacitor.isNativePlatform() ? 'com.beanstalker.member' : 'Web (no bundle)'}`);
      debugLines.push(`StoreKit Version: ${Capacitor.isNativePlatform() ? 'StoreKit 2 (iOS 15+)' : 'N/A'}`);
      
      // Enhanced debugging for product loading issues
      debugLines.push(``, `=== Detailed Investigation ===`);
      debugLines.push(`Raw offerings object keys: ${Object.keys(offerings).join(', ')}`);
      
      if (offerings.all) {
        Object.entries(offerings.all).forEach(([key, offering]) => {
          debugLines.push(``, `=== Offering: ${key} ===`);
          debugLines.push(`Identifier: ${offering.identifier}`);
          debugLines.push(`Packages count: ${offering.availablePackages?.length || 0}`);
          
          if (offering.availablePackages && offering.availablePackages.length > 0) {
            offering.availablePackages.forEach((pkg, i) => {
              debugLines.push(`${i+1}. Package: ${pkg.identifier}`);
              debugLines.push(`   Product ID: ${pkg.product.identifier}`);
              debugLines.push(`   Title: ${pkg.product.title || 'No title'}`);
              debugLines.push(`   Price: ${pkg.product.priceString || 'No price'}`);
              debugLines.push(`   Description: ${pkg.product.description || 'No description'}`);
            });
          } else {
            debugLines.push(`❌ No packages found in this offering`);
          }
        });
      } else {
        debugLines.push(`❌ offerings.all is null/undefined`);
      }
      
      // Platform-specific issue analysis
      if (Object.keys(offerings.all || {}).length === 0) {
        debugLines.push(``, `=== Native iOS Issues ===`);
        if (Capacitor.isNativePlatform()) {
          debugLines.push(`• Bundle ID mismatch: Check RevenueCat app settings`);
          debugLines.push(`• Sandbox account: Sign out of main Apple ID`);
          debugLines.push(`• Products status: Verify "Ready to Submit" in App Store Connect`);
          debugLines.push(`• In-App Purchase Key: Check RevenueCat dashboard integration`);
          debugLines.push(`• TestFlight sandbox: Ensure using sandbox environment`);
        } else {
          debugLines.push(`• Web testing: Products found - issue is native-specific`);
          debugLines.push(`• Deploy to TestFlight: Test with enhanced native diagnostic`);
        }
      }
      
      if (offerings.current) {
        debugLines.push(``, `=== Current Offering: ${offerings.current.identifier} ===`);
        debugLines.push(`Packages: ${offerings.current.availablePackages?.length || 0}`);
        
        if (offerings.current.availablePackages) {
          offerings.current.availablePackages.forEach((pkg, i) => {
            debugLines.push(`${i+1}. ${pkg.identifier} → ${pkg.product.identifier}`);
          });
        }
      }
      
      // Test product extraction
      const extractedProducts = await this.getAvailableProducts();
      debugLines.push(``, `=== Product Extraction ===`);
      debugLines.push(`Products extracted: ${extractedProducts.length}`);
      
      extractedProducts.forEach((product, i) => {
        debugLines.push(`${i+1}. ${product.id} - ${product.title} - ${product.price}`);
      });
      
    } catch (error) {
      console.error('IAP: RevenueCat API failed:', error);
      debugLines.push(`❌ RevenueCat API Call: FAILED`);
      debugLines.push(`Error: ${error}`);
    }
    
    return debugLines.join('\n');
  }



  async getAvailableProducts(): Promise<IAPProduct[]> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    // Native mobile app - always use RevenueCat
    console.log('IAP: Running in production mode - extracting products from RevenueCat offerings');
    console.log('IAP: Available offerings count:', this.offerings.length);
    
    const products: IAPProduct[] = [];

    for (const offering of this.offerings) {
      console.log(`IAP: Processing offering: ${offering.identifier} with ${offering.availablePackages.length} packages`);
      
      for (const packageObj of offering.availablePackages) {
        const product = packageObj.product;
        
        console.log(`IAP: Processing product: ${product.identifier} - ${product.title} - ${product.priceString}`);
        
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

    console.log('IAP: Total products extracted:', products.length);
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

    console.log('💳 IAP: TRIGGERING NATIVE PAYMENT POPUP for product:', productId);
    
    // Native mobile app - always use RevenueCat
    try {
      // Find the package for this product
      let targetPackage: PurchasesPackage | null = null;
      
      console.log('💳 IAP: Searching for product in', this.offerings.length, 'offerings...');
      for (const offering of this.offerings) {
        console.log('💳 IAP: Checking offering:', offering.identifier, 'with', offering.availablePackages.length, 'packages');
        for (const packageObj of offering.availablePackages) {
          console.log('💳 IAP: Found package product:', packageObj.product.identifier);
          if (packageObj.product.identifier === productId) {
            targetPackage = packageObj;
            console.log('💳 IAP: FOUND TARGET PACKAGE for native payment popup:', productId);
            break;
          }
        }
        if (targetPackage) break;
      }

      if (!targetPackage) {
        console.error('💳 IAP: CRITICAL - Product not found for native payment popup:', productId);
        console.error('💳 IAP: Available products:', this.offerings.flatMap(o => o.availablePackages.map(p => p.product.identifier)));
        throw new Error(`Product ${productId} not found`);
      }

      console.log('💳 IAP: LAUNCHING NATIVE APPLE PAY POPUP...');
      
      // Make the purchase - this should trigger the native Apple Pay popup
      const result = await Purchases.purchasePackage({ 
        aPackage: targetPackage 
      });

      console.log('✅ RevenueCat purchase successful:', {
        productId,
        customerInfo: result.customerInfo,
        transaction: result.transaction,
      });

      // Extract transaction ID from the purchase result
      const transactionId = result.transaction?.transactionIdentifier || 
                           `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('📋 Transaction details for verification:', {
        productId,
        transactionId,
        originalAppUserId: result.customerInfo.originalAppUserId
      });

      return {
        success: true,
        productId,
        transactionId,
        receipt: JSON.stringify({
          customerInfo: result.customerInfo,
          transaction: result.transaction
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
    // Available when properly initialized (web dev mode or native platform)
    const isDevelopmentMode = !Capacitor.isNativePlatform();
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