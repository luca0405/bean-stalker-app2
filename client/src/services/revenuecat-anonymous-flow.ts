/**
 * REVENUECAT ANONYMOUS FLOW
 * Use RevenueCat's recommended anonymous user flow for single-device apps
 * This eliminates user ID mapping issues entirely
 */

import { Purchases } from '@revenuecat/purchases-capacitor';

export class RevenueCatAnonymousFlow {
  private static isConfigured = false;
  private static anonymousUserId: string | null = null;

  /**
   * Configure RevenueCat with anonymous flow (no app user ID)
   * Let RevenueCat handle the anonymous ID generation
   */
  static async configureAnonymousFlow(): Promise<{ success: boolean; anonymousId?: string; error?: string }> {
    try {
      console.log('🔧 ANONYMOUS FLOW: Configuring RevenueCat without app user ID...');
      
      if (this.isConfigured) {
        console.log('✅ ANONYMOUS FLOW: Already configured with ID:', this.anonymousUserId);
        return { success: true, anonymousId: this.anonymousUserId || undefined };
      }
      
      // Run diagnostic first to identify configuration issues
      const { RevenueCatDiagnostic } = await import('./revenuecat-diagnostic');
      const diagnostic = await RevenueCatDiagnostic.runDiagnostic();
      
      if (!diagnostic.success) {
        console.log('🔍 CONFIGURATION ISSUES FOUND:');
        diagnostic.issues.forEach(issue => console.log('  -', issue));
        console.log('🔧 RECOMMENDED FIXES:');
        diagnostic.fixes.forEach(fix => console.log('  -', fix));
      }
      
      // Configure WITHOUT appUserID - let RevenueCat create anonymous ID
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA',
        // NO appUserID specified - RevenueCat creates anonymous ID
        observerMode: false,
        useStoreKit2IfAvailable: true,
        usesStoreKit2IfAvailable: true // Backup parameter name for compatibility
      });
      
      this.isConfigured = true;
      
      // Get the anonymous ID that RevenueCat created
      const customerInfo = await Purchases.getCustomerInfo();
      this.anonymousUserId = customerInfo.originalAppUserId;
      
      console.log('✅ ANONYMOUS FLOW: RevenueCat configured with anonymous ID:', this.anonymousUserId);
      
      return { success: true, anonymousId: this.anonymousUserId };
      
    } catch (error: any) {
      console.error('💥 ANONYMOUS FLOW: Configuration failed:', error);
      console.error('💥 Error details:', error);
      
      // Run diagnostic on failure to help troubleshoot
      try {
        const { RevenueCatDiagnostic } = await import('./revenuecat-diagnostic');
        const report = await RevenueCatDiagnostic.generateReport();
        console.log('📋 DIAGNOSTIC REPORT:\n', report);
      } catch (diagError) {
        console.error('Failed to generate diagnostic report:', diagError);
      }
      
      return { success: false, error: error.message || 'Configuration failed' };
    }
  }
  
  /**
   * Attempt purchase with anonymous flow
   */
  static async attemptPurchase(): Promise<{ success: boolean; error?: string; purchaseResult?: any }> {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'RevenueCat not configured. Call configureAnonymousFlow first.' };
      }
      
      console.log('💳 ANONYMOUS FLOW: Getting offerings with anonymous user...');
      
      const offerings = await Purchases.getOfferings();
      console.log('💳 OFFERINGS DEBUG:', {
        currentOfferingId: offerings.current?.identifier,
        packagesCount: offerings.current?.availablePackages?.length || 0,
        allOfferings: Object.keys(offerings.all || {})
      });
      
      if (!offerings.current?.availablePackages?.length) {
        console.log('💳 All available offerings:', JSON.stringify(offerings, null, 2));
        return { success: false, error: 'No RevenueCat packages available' };
      }
      
      // Log all available products for debugging
      console.log('💳 Available products:');
      offerings.current.availablePackages.forEach(pkg => {
        console.log(`   - ${pkg.product.identifier}: ${pkg.product.title} (${pkg.product.priceString})`);
      });
      
      // Find membership product with flexible matching
      let membershipPackage = offerings.current.availablePackages.find(
        pkg => pkg.product.identifier === 'com.beanstalker.membership69'
      );
      
      // If exact match not found, try other variations
      if (!membershipPackage) {
        membershipPackage = offerings.current.availablePackages.find(
          pkg => pkg.product.identifier.includes('membership') || 
                 pkg.product.identifier.includes('premium') ||
                 pkg.product.identifier.includes('69')
        );
      }
      
      // If still not found, use the first available product as fallback
      if (!membershipPackage) {
        console.log('⚠️ Exact membership product not found, using first available product');
        membershipPackage = offerings.current.availablePackages[0];
      }
      
      if (!membershipPackage) {
        return { success: false, error: 'No membership product available' };
      }
      
      console.log('💳 ANONYMOUS FLOW: Attempting purchase with anonymous ID:', this.anonymousUserId);
      console.log('💳 ANONYMOUS FLOW: Product:', membershipPackage.product.identifier);
      
      console.log('💳 ANONYMOUS FLOW: Starting purchase with package:', {
        identifier: membershipPackage.product.identifier,
        title: membershipPackage.product.title,
        price: membershipPackage.product.priceString
      });
      
      const purchaseResult = await Purchases.purchasePackage({ aPackage: membershipPackage });
      
      console.log('✅ ANONYMOUS FLOW: Purchase completed successfully!');
      console.log('   - Customer ID:', purchaseResult.customerInfo.originalAppUserId);
      console.log('   - Product purchased:', membershipPackage.product.identifier);
      console.log('   - Active entitlements:', Object.keys(purchaseResult.customerInfo.entitlements.active || {}));
      
      // CRITICAL FIX: Manually trigger webhook to ensure credits are processed
      console.log('🔧 BACKUP WEBHOOK: Ensuring credits are processed...');
      setTimeout(async () => {
        try {
          const webhookResponse = await fetch('/api/revenuecat/webhook', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer bean-stalker-webhook-2025'
            },
            body: JSON.stringify({
              event: {
                type: 'INITIAL_PURCHASE',
                product_id: membershipPackage.product.identifier,
                app_user_id: purchaseResult.customerInfo.originalAppUserId
              }
            })
          });
          
          if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            console.log('✅ BACKUP WEBHOOK: Credits processed successfully:', webhookResult);
          }
        } catch (error) {
          console.log('⚠️ BACKUP WEBHOOK: Will be handled by RevenueCat automatic webhook');
        }
      }, 2000); // Process after 2 seconds
      
      return { success: true, purchaseResult };
      
    } catch (error: any) {
      console.error('💳 ANONYMOUS FLOW: Purchase failed:', error);
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }
  
  /**
   * Alias anonymous ID to real user ID after account creation
   * This connects the anonymous purchase to the real user
   */
  static async aliasToRealUser(realUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔗 ANONYMOUS FLOW: Aliasing anonymous ID to real user:', realUserId);
      console.log('   - Anonymous ID:', this.anonymousUserId);
      console.log('   - Real User ID:', realUserId);
      
      if (!this.isConfigured || !this.anonymousUserId) {
        return { success: false, error: 'No anonymous session to alias' };
      }
      
      // Use logIn to alias the anonymous ID to the real user ID
      const loginResult = await Purchases.logIn({ appUserID: realUserId });
      
      console.log('✅ ANONYMOUS FLOW: Successfully aliased to real user!');
      console.log('   - Created new customer:', loginResult.created);
      console.log('   - Customer ID:', loginResult.customerInfo.originalAppUserId);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('💥 ANONYMOUS FLOW: Aliasing failed:', error);
      return { success: false, error: error.message || 'Aliasing failed' };
    }
  }
  
  /**
   * Get current anonymous user ID
   */
  static getAnonymousUserId(): string | null {
    return this.anonymousUserId;
  }
  
  /**
   * Restore previous purchases after app reinstall
   * This handles the case where user uninstalls/reinstalls app
   */
  static async restorePurchases(): Promise<{ success: boolean; hasActiveSubscription: boolean; error?: string }> {
    try {
      console.log('🔄 RESTORE: Checking for previous purchases...');
      
      if (!this.isConfigured) {
        return { success: false, hasActiveSubscription: false, error: 'RevenueCat not configured' };
      }
      
      // Call restore purchases - this queries Apple/Google for previous purchases
      const customerInfo = await Purchases.restorePurchases();
      
      console.log('🔍 RESTORE: Customer info:', {
        originalAppUserId: customerInfo.originalAppUserId,
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
        nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions.length
      });
      
      // Check if user has active membership
      const hasMembership = 'com.beanstalker.membership69' in customerInfo.activeSubscriptions ||
                           customerInfo.nonSubscriptionTransactions.some(tx => 
                             tx.productIdentifier === 'com.beanstalker.membership69'
                           );
      
      if (hasMembership) {
        console.log('✅ RESTORE: Found previous membership purchase!');
        return { success: true, hasActiveSubscription: true };
      } else {
        console.log('📝 RESTORE: No previous purchases found');
        return { success: true, hasActiveSubscription: false };
      }
      
    } catch (error: any) {
      console.error('💥 RESTORE: Failed to restore purchases:', error);
      return { success: false, hasActiveSubscription: false, error: error.message || 'Restore failed' };
    }
  }
  
  /**
   * Check if user should register or restore
   * Called before showing registration form
   */
  static async checkForExistingPurchases(): Promise<{ shouldRestore: boolean; existingUserId?: string }> {
    try {
      // Configure RevenueCat first
      const configResult = await this.configureAnonymousFlow();
      if (!configResult.success) {
        return { shouldRestore: false };
      }
      
      // Check for existing purchases
      const restoreResult = await this.restorePurchases();
      
      if (restoreResult.hasActiveSubscription) {
        console.log('🔍 EXISTING PURCHASE: User has previous membership');
        return { shouldRestore: true };
      }
      
      return { shouldRestore: false };
      
    } catch (error) {
      console.error('❌ Error checking existing purchases:', error);
      return { shouldRestore: false };
    }
  }
  
  /**
   * Reset configuration state (for testing)
   */
  static reset() {
    this.isConfigured = false;
    this.anonymousUserId = null;
  }
}