# RevenueCat Dashboard Troubleshooting Guide

## Issue: Real IAP Purchase Not Showing in Dashboard

### Common Reasons Transactions Don't Appear:

1. **App User ID Mismatch**
   - RevenueCat might not be linking purchases to the correct user
   - Check if user ID "32" is being set correctly in the app

2. **Sandbox vs Production Environment**
   - Dashboard might be filtered to show only production purchases
   - Ensure you're viewing sandbox transactions

3. **App Store Connect Integration**
   - RevenueCat needs to be connected to your App Store Connect account
   - Check if App Store integration is properly configured

4. **Purchase Receipt Validation**
   - Apple receipts might not be reaching RevenueCat
   - Check if RevenueCat API key is correctly configured in the iOS app

### Diagnostic Steps:

#### Step 1: Check RevenueCat Dashboard Settings
- Go to Customer section
- Search for user ID "32" or app user ID "32"
- Check if any customers exist with purchases

#### Step 2: Verify App Store Connect Integration
- RevenueCat Dashboard → Project Settings → App Store Connect
- Ensure API key is configured and active
- Verify bundle ID matches: com.beanstalker.member

#### Step 3: Check Environment Filter
- Dashboard might be showing Production only
- Switch to Sandbox environment in dashboard filter

#### Step 4: Verify iOS App Configuration
- Check if VITE_REVENUECAT_API_KEY is set in mobile app
- Ensure RevenueCat.configure() is called with correct API key
- Verify user login: RevenueCat.logIn({ appUserID: "32" })

### Manual Verification Steps:

1. **Check if webhook is receiving events**
2. **Verify user ID mapping in mobile app**
3. **Test with RevenueCat's test event feature**
4. **Check RevenueCat logs for any errors**

### Expected Behavior:
After real IAP purchase:
1. Transaction processed by Apple App Store
2. Receipt sent to RevenueCat
3. RevenueCat validates receipt
4. Customer appears in RevenueCat Dashboard
5. Webhook sent to Bean Stalker (if configured)
6. Credits added to Bean Stalker account