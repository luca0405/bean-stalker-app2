# App Store Connect Product Status Fix

## Issue Identified: Products in Draft Status

Your RevenueCat configuration is perfect:
- ✅ Bundle ID: com.beanstalker.member (matches)
- ✅ App Store Connect API: Configured
- ✅ In-App Purchase Key: Configured

**The issue: Your App Store Connect products are likely in "Draft" status instead of "Ready to Submit".**

RevenueCat can only fetch products that are "Ready to Submit" or "Approved" - products in "Draft" status are invisible to the RevenueCat SDK.

## Required Fix: Submit Products for Review

### Step 1: Go to App Store Connect
1. Login to App Store Connect
2. Go to **Apps → Bean Stalker → Features → In-App Purchases**

### Step 2: Complete Each Product
For each of your 4 products (credit25, credit50, credit100, membership69):

**Required Fields:**
1. **Reference Name**: e.g., "25 Credit Package"
2. **Product ID**: com.beanstalker.credit25 (already set)
3. **Type**: Non-Consumable (for credits) or Non-Renewing Subscription (for membership)
4. **Price**: Select appropriate price tier
5. **Display Name**: "25 Bean Stalker Credits" 
6. **Description**: "Purchase 25 credits to use in the Bean Stalker app"

**Localization (Required):**
- At least one localization must be completed
- Display Name and Description in your primary language

**Review Information:**
- **Screenshot**: Upload a screenshot showing the product in your app
- **Review Notes**: Optional description for Apple reviewers

### Step 3: Submit Each Product
1. Complete all required fields for each product
2. Click **"Submit for Review"** 
3. Status should change from "Draft" → "Waiting for Review" → "Ready to Submit"

### Step 4: Alternative - Set to Ready to Submit
If you don't want to wait for Apple review:
1. Complete all metadata
2. Instead of submitting for review, save as "Ready to Submit"
3. This makes products available to RevenueCat immediately

## Expected Timeline
- **Ready to Submit**: Available to RevenueCat immediately
- **Under Review**: 24-48 hours for Apple review
- **Approved**: Available for production purchases

## Test After Fix
Once products are "Ready to Submit":
1. Wait 10-15 minutes for App Store Connect to propagate changes
2. Run Bean Stalker diagnostic again
3. Should show "Found 4 products"
4. IAP integration will be complete

## Critical Note
**All 4 products must be "Ready to Submit" status** for RevenueCat to detect them:
- com.beanstalker.credit25
- com.beanstalker.credit50  
- com.beanstalker.credit100
- com.beanstalker.membership69

Even one product in "Draft" status can cause the entire offering to fail.