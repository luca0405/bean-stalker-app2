# App Store Connect - IAP Product Setup Guide

## Step-by-Step: Creating com.beanstalker.member as Non-Consumable

### Prerequisites
- Active Apple Developer Account ($99/year)
- App created in App Store Connect
- Bundle ID: `com.beanstalker.app` (or your configured bundle ID)

### Step 1: Access App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple Developer credentials
3. Click **"My Apps"**

### Step 2: Navigate to Your App
1. Find and click **"Bean Stalker"** (or your app name)
2. In the left sidebar, click **"Features"**
3. Click **"In-App Purchases"**

### Step 3: Create New In-App Purchase
1. Click the **"+"** button (Create New)
2. Select **"Non-Consumable"** from the dropdown
3. Click **"Create"**

### Step 4: Configure Product Details
Fill in the following information:

**Product ID:**
```
com.beanstalker.member
```

**Reference Name:**
```
Bean Stalker Premium Membership
```

**Cleared for Sale:** ✅ (Toggle ON)

### Step 5: Pricing and Availability
1. Click **"Price Schedule"** or **"Pricing"**
2. Set **Base Country/Region**: Australia
3. Set **Price**: AUD $69.00
   - This should automatically select Tier 42
4. Click **"Next"** or **"Save"**

### Step 6: App Store Information
Add localized information for **English (Australia)**:

**Display Name:**
```
Premium Membership
```

**Description:**
```
Unlock full access to Bean Stalker's premium coffee ordering experience. Enjoy exclusive features, priority support, and access to special menu items with your premium membership.
```

### Step 7: Review Information
**For App Review (Internal Notes):**
```
Premium membership unlocks enhanced features in the Bean Stalker coffee ordering app. Users gain access to exclusive menu items, priority ordering, and premium customer support. This is a one-time purchase that provides ongoing premium access.
```

### Step 8: Submit for Review
1. Click **"Save"** on all sections
2. Click **"Submit for Review"**
3. Wait for Apple approval (typically 24-48 hours)

## Important Notes

### Non-Consumable vs Subscription
- **Non-Consumable**: One-time purchase, permanent access
- **Auto-Renewable Subscription**: Recurring billing

Since you want AUD $69 for permanent premium access, **Non-Consumable** is correct.

### Product Status
- **Created**: Product exists but not live
- **Ready to Submit**: All info complete, needs review
- **Waiting for Review**: Submitted to Apple
- **Approved**: Ready for use in app
- **Rejected**: Needs changes before resubmission

### Testing Requirements
- Product must be **"Approved"** before sandbox testing works
- Sandbox testing requires separate Apple ID
- Production testing requires TestFlight or App Store release

## Troubleshooting

### Common Issues
1. **"Product ID already exists"**: Choose different identifier
2. **"Pricing not available"**: Select Australia as base country first
3. **"Missing screenshot"**: Not required for IAP, only apps
4. **"Review rejected"**: Check review notes for specific issues

### Review Requirements
- Clear product description
- Appropriate pricing for content
- Product name matches functionality
- No misleading information

## After Approval
1. Product status changes to **"Approved"**
2. Copy your RevenueCat API key to Replit environment
3. Test purchase flow with sandbox Apple ID
4. Verify RevenueCat receives transaction data

## Next Steps After IAP Setup
1. Configure RevenueCat dashboard
2. Add `VITE_REVENUECAT_API_KEY` to environment
3. Test purchase flow in development
4. Prepare for TestFlight testing

The app code is already configured for your `com.beanstalker.member` identifier and will work immediately once the product is approved.