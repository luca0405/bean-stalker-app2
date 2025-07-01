# Bean Stalker IAP Setup Guide

## Current Status
✅ **Identifier Configured**: `com.beanstalker.member` 
✅ **RevenueCat Integration**: Complete with proper product IDs
✅ **Mobile App Ready**: IAP system integrated and ready for testing

## Product Identifiers Configured

### Premium Membership
- **Product ID**: `com.beanstalker.member`
- **Type**: Non-consumable subscription/membership
- **Price**: AUD $69.00
- **Description**: Premium Bean Stalker membership with full app access

### Credit Packages (Optional for Phase 2)
- **com.beanstalker.credits10**: AUD $10 → 10 credits
- **com.beanstalker.credits25**: AUD $25 → 27 credits (2 bonus)
- **com.beanstalker.credits50**: AUD $50 → 55 credits (5 bonus) 
- **com.beanstalker.credits100**: AUD $100 → 115 credits (15 bonus)

## Next Steps for App Store Connect Setup

### 1. App Store Connect Configuration
1. **Navigate to**: https://appstoreconnect.apple.com
2. **Go to**: My Apps → Bean Stalker → Features → In-App Purchases
3. **Create New IAP** with these details:
   - **Type**: Non-Consumable (for membership)
   - **Product ID**: `com.beanstalker.member`
   - **Reference Name**: Bean Stalker Premium Membership
   - **Price**: AUD $69.00 (Tier 42 in Australian pricing)

### 2. Product Information
```
Display Name: Premium Membership
Description: Unlock full access to Bean Stalker's premium coffee ordering experience with exclusive features and benefits.

Review Notes: 
Premium membership provides users with enhanced coffee ordering features, priority support, and access to exclusive menu items.
```

### 3. RevenueCat Dashboard Setup
1. **Create RevenueCat Account**: https://www.revenuecat.com
2. **Add App**: Configure for iOS with bundle ID `com.beanstalker.app`
3. **Create Product**: Link `com.beanstalker.member` to RevenueCat
4. **Get API Key**: Copy the public API key for app configuration

## Required Environment Variables

Add these to your Replit environment:
```bash
VITE_REVENUECAT_API_KEY=rcv_xxx... (from RevenueCat dashboard)
```

## Testing Process

### Phase 1: Sandbox Testing
1. **Create Sandbox User**:
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create test Apple ID for IAP testing

2. **Build and Test**:
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```

3. **Test Purchase Flow**:
   - Install app on device/simulator
   - Sign out of real Apple ID
   - Sign in with sandbox Apple ID
   - Test membership purchase

### Phase 2: TestFlight Distribution
1. **Upload to TestFlight**:
   - Archive app in Xcode
   - Upload to App Store Connect
   - Configure TestFlight testing

2. **Invite Testers**:
   - Add internal/external testers
   - Test full purchase flow
   - Verify RevenueCat integration

### Phase 3: App Store Submission
1. **Final Review**:
   - Test all IAP functionality
   - Verify pricing and descriptions
   - Ensure compliance with App Store guidelines

2. **Submit for Review**:
   - Complete app metadata
   - Submit for Apple review
   - Monitor review status

## Technical Implementation Status

### ✅ Completed
- IAP service with RevenueCat integration
- Product ID configuration matching your identifier
- Mobile-optimized purchase interface
- Error handling and user feedback
- Purchase validation system

### ⚡ Ready for Testing
- Sandbox testing with your `com.beanstalker.member` identifier
- iOS device testing via Xcode
- Purchase flow validation
- RevenueCat receipt verification

## Troubleshooting

### Common Issues
1. **"Product not found"**: Ensure product is created in App Store Connect and approved
2. **"Cannot connect to iTunes Store"**: Check sandbox user configuration
3. **RevenueCat errors**: Verify API key and product linking

### Debug Steps
1. Check Xcode console for IAP errors
2. Verify RevenueCat dashboard shows test purchases
3. Confirm sandbox user is properly configured
4. Test on real device (not simulator for production IAP)

## Next Immediate Action
1. **Set up App Store Connect** with `com.beanstalker.member` product
2. **Configure RevenueCat** and get API key
3. **Test purchase flow** in sandbox environment

The technical implementation is complete and ready for your App Store Connect configuration!