# RevenueCat Sandbox Testing Guide - Complete Setup

## Current Status: "Payment system not available" Error

The issue likely stems from incomplete App Store Connect or device configuration. Here's the comprehensive setup needed:

## Step 1: App Store Connect Product Configuration

### Check Product Status
1. Go to App Store Connect → My Apps → Bean Stalker
2. Navigate to Features → In-App Purchases
3. Verify these products exist and are **approved**:
   - `com.beanstalker.credit25` - $25 Credits
   - `com.beanstalker.credit50` - $50 Credits  
   - `com.beanstalker.credit100` - $100 Credits
   - `com.beanstalker.membership69` - Premium Membership

### Product Requirements
- **Status**: Must be "Ready for Review" or "Approved"
- **Bundle ID**: Must match exactly: `com.beanstalker.member`
- **Pricing**: Set for Australia (AUD)
- **Metadata**: All required fields completed

## Step 2: Sandbox Apple ID Setup

### Create Sandbox Tester Account
1. App Store Connect → Users and Roles → Sandbox Testers
2. Create new sandbox Apple ID specifically for testing
3. Use different email than your real Apple ID
4. Set country to Australia (to match AUD pricing)

### Configure Device for Sandbox Testing
1. iPhone Settings → App Store → Sign Out (from real Apple ID)
2. **Important**: Don't sign in with sandbox Apple ID yet
3. Install TestFlight app and Bean Stalker from TestFlight
4. When making first IAP purchase, iOS will prompt for Apple ID
5. **Then** sign in with sandbox Apple ID

## Step 3: RevenueCat Dashboard Configuration

### Verify Integration
1. RevenueCat Dashboard → Project Settings
2. Check App Store Connect integration is active
3. Verify Bundle ID matches: `com.beanstalker.member`
4. Ensure products are synced from App Store Connect

## Step 4: iOS App Configuration Check

### Use Enhanced Diagnostic Tool
The updated Buy Credits page now includes a diagnostic tab:

1. Open Bean Stalker app
2. Go to Buy Credits
3. Tap "Diagnostic" tab
4. Tap "Run Diagnostics"
5. Check results for specific configuration issues

### Expected Diagnostic Results
- ✅ Platform Check: Native iOS
- ✅ RevenueCat API Key: Configured
- ✅ IAP Service Initialization: Success
- ✅ User Login: Success
- ✅ Product Loading: Found 4 products
- ✅ IAP Availability: Available

## Step 5: Common Issue Resolution

### "Payment system not available"
**Causes:**
- Parental controls enabled on device
- Corporate/managed device restrictions
- Not signed out of real Apple ID
- Sandbox Apple ID not properly configured

**Solutions:**
- Check Settings → Screen Time → Content & Privacy Restrictions
- Ensure "iTunes & App Store Purchases" is enabled
- Sign out completely from real Apple ID before testing

### "Products not available"
**Causes:**
- Products still in "Draft" status in App Store Connect
- Bundle ID mismatch
- Products not approved by Apple

**Solutions:**
- Submit products for review in App Store Connect
- Verify Bundle ID exactly matches: `com.beanstalker.member`

### "RevenueCat initialization failed"
**Causes:**
- API key missing or incorrect
- Network connectivity issues
- RevenueCat service outage

**Solutions:**
- Verify VITE_REVENUECAT_API_KEY is set correctly
- Check device network connection
- Test on different device/network

## Step 6: Testing Workflow

### Successful Purchase Flow
1. Tap Buy Credits → Select package → Confirm purchase
2. iOS prompts for sandbox Apple ID password
3. Apple processes fake payment (no real money)
4. RevenueCat receives receipt and validates
5. Webhook triggers and adds credits to Bean Stalker account
6. Success message displays with credit balance update

### Troubleshooting Steps
1. Run diagnostics first to identify specific issues
2. Check App Store Connect product status
3. Verify sandbox Apple ID configuration
4. Test on physical device (never simulator)
5. Check RevenueCat logs for errors

The diagnostic tool will help identify exactly where the configuration is failing.