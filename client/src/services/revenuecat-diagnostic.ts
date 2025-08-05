/**
 * REVENUECAT DIAGNOSTIC TOOL
 * Diagnoses and fixes common RevenueCat configuration issues that cause
 * "string did not match the expected pattern" errors
 */

import { Purchases } from '@revenuecat/purchases-capacitor';

export class RevenueCatDiagnostic {
  
  /**
   * Run comprehensive diagnostic on RevenueCat configuration
   */
  static async runDiagnostic(): Promise<{
    success: boolean;
    issues: string[];
    fixes: string[];
    configuration: any;
  }> {
    const issues: string[] = [];
    const fixes: string[] = [];
    let configuration: any = {};
    
    try {
      console.log('🔍 DIAGNOSTIC: Starting RevenueCat configuration check...');
      
      // Step 1: Check if RevenueCat is configured
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        configuration.isConfigured = true;
        configuration.customerId = customerInfo.originalAppUserId;
        console.log('✅ DIAGNOSTIC: RevenueCat is configured with customer ID:', customerInfo.originalAppUserId);
      } catch (error: any) {
        issues.push('RevenueCat not configured or initialization failed');
        fixes.push('Call Purchases.configure() with valid API key');
        configuration.isConfigured = false;
        console.error('❌ DIAGNOSTIC: RevenueCat not configured:', error.message);
      }
      
      // Step 2: Check offerings and products
      try {
        const offerings = await Purchases.getOfferings();
        configuration.offerings = {
          currentOffering: offerings.current?.identifier || null,
          totalOfferings: Object.keys(offerings.all || {}).length,
          availablePackages: offerings.current?.availablePackages?.length || 0
        };
        
        if (!offerings.current?.availablePackages?.length) {
          issues.push('No products available in RevenueCat offerings');
          fixes.push('1. Check App Store Connect: Products must be in "Ready to Submit" status');
          fixes.push('2. Verify Bundle ID matches exactly in Xcode, App Store Connect, and RevenueCat');
          fixes.push('3. Ensure Product IDs match exactly between App Store Connect and RevenueCat Dashboard');
          fixes.push('4. Wait 24 hours after creating products for App Store Connect propagation');
        } else {
          console.log('✅ DIAGNOSTIC: Found offerings with', offerings.current.availablePackages.length, 'products');
          
          // Check for our specific membership product
          const membershipProduct = offerings.current.availablePackages.find(
            pkg => pkg.product.identifier === 'com.beanstalker.membership69'
          );
          
          if (!membershipProduct) {
            issues.push('Membership product com.beanstalker.membership69 not found');
            fixes.push('Add product com.beanstalker.membership69 to RevenueCat Dashboard → Products');
            fixes.push('Ensure exact Product ID match with App Store Connect');
            
            // List available products for debugging
            console.log('📋 DIAGNOSTIC: Available products:');
            offerings.current.availablePackages.forEach(pkg => {
              console.log(`   - ${pkg.product.identifier}: ${pkg.product.title} (${pkg.product.priceString})`);
            });
            configuration.availableProducts = offerings.current.availablePackages.map(pkg => ({
              id: pkg.product.identifier,
              title: pkg.product.title,
              price: pkg.product.priceString
            }));
          } else {
            console.log('✅ DIAGNOSTIC: Membership product found:', membershipProduct.product.identifier);
            configuration.membershipProduct = {
              id: membershipProduct.product.identifier,
              title: membershipProduct.product.title,
              price: membershipProduct.product.priceString
            };
          }
        }
      } catch (error: any) {
        issues.push('Failed to fetch RevenueCat offerings: ' + error.message);
        fixes.push('Check network connection and RevenueCat service status');
        console.error('❌ DIAGNOSTIC: Failed to fetch offerings:', error);
      }
      
      // Step 3: Bundle ID verification (theoretical - we can't access native bundle ID from web context)
      configuration.expectedBundleId = 'com.beanstalker.member';
      fixes.push('MANUAL CHECK: Verify Bundle ID consistency:');
      fixes.push('- Xcode: Target → General → Bundle Identifier = com.beanstalker.member');
      fixes.push('- App Store Connect: App Information → Bundle ID = com.beanstalker.member');
      fixes.push('- RevenueCat Dashboard: App Settings → Bundle ID = com.beanstalker.member');
      
      // Step 4: App Store Connect requirements checklist
      fixes.push('MANUAL CHECK: App Store Connect requirements:');
      fixes.push('- Paid Applications Agreement signed and active');
      fixes.push('- Tax and banking information completed');
      fixes.push('- In-App Purchase products in "Ready to Submit" or "Approved" status');
      fixes.push('- Testing on physical iOS device (not simulator)');
      
      const success = issues.length === 0;
      
      console.log('🏁 DIAGNOSTIC: Completed with', issues.length, 'issues found');
      
      return {
        success,
        issues,
        fixes,
        configuration
      };
      
    } catch (error: any) {
      console.error('💥 DIAGNOSTIC: Fatal error during diagnostic:', error);
      return {
        success: false,
        issues: ['Fatal diagnostic error: ' + error.message],
        fixes: ['Check console logs for detailed error information'],
        configuration: {}
      };
    }
  }
  
  /**
   * Attempt to reconfigure RevenueCat with proper settings
   */
  static async attemptReconfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 RECONFIGURATION: Attempting RevenueCat reconfiguration...');
      
      // Use the correct API key for iOS
      await Purchases.configure({
        apiKey: 'appl_owLmakOcTeYJOJoxJgScSQZtUQA', // iOS API key
        observerMode: false,
        useStoreKit2IfAvailable: true,
        usesStoreKit2IfAvailable: true // Backup parameter name
      });
      
      console.log('✅ RECONFIGURATION: RevenueCat reconfigured successfully');
      
      // Test the configuration
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('✅ RECONFIGURATION: Customer info retrieved:', customerInfo.originalAppUserId);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ RECONFIGURATION: Failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Generate a comprehensive diagnostic report
   */
  static async generateReport(): Promise<string> {
    const diagnostic = await this.runDiagnostic();
    
    let report = '🔍 REVENUECAT DIAGNOSTIC REPORT\n';
    report += '================================\n\n';
    
    report += 'CONFIGURATION STATUS:\n';
    report += `- RevenueCat Configured: ${diagnostic.configuration.isConfigured ? '✅' : '❌'}\n`;
    report += `- Customer ID: ${diagnostic.configuration.customerId || 'Not available'}\n`;
    report += `- Available Products: ${diagnostic.configuration.availablePackages || 0}\n`;
    report += `- Membership Product: ${diagnostic.configuration.membershipProduct ? '✅ Found' : '❌ Missing'}\n\n`;
    
    if (diagnostic.issues.length > 0) {
      report += 'ISSUES FOUND:\n';
      diagnostic.issues.forEach((issue, i) => {
        report += `${i + 1}. ${issue}\n`;
      });
      report += '\n';
    }
    
    report += 'RECOMMENDED FIXES:\n';
    diagnostic.fixes.forEach((fix, i) => {
      report += `${i + 1}. ${fix}\n`;
    });
    
    if (diagnostic.configuration.availableProducts) {
      report += '\nAVAILABLE PRODUCTS:\n';
      diagnostic.configuration.availableProducts.forEach((product: any) => {
        report += `- ${product.id}: ${product.title} (${product.price})\n`;
      });
    }
    
    return report;
  }
}