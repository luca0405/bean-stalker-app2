# RevenueCat Products Setup Guide

## Required Products for Bean Stalker App

### App Bundle ID: com.beanstalker.member

### Products to Create in App Store Connect:

#### 1. Premium Membership
- **Product ID:** `com.beanstalker.member`
- **Type:** Non-Renewable Subscription (or In-App Purchase)
- **Price:** AUD $69.00
- **Display Name:** "Premium Membership"
- **Description:** "Full access to Bean Stalker premium features with AUD$69 starting credit"

#### 2. Credit Packages
- **Product ID:** `com.beanstalker.credits10`
- **Type:** Consumable In-App Purchase
- **Price:** AUD $10.00
- **Display Name:** "10 Credits"
- **Description:** "Add 10 credits to your Bean Stalker account"

- **Product ID:** `com.beanstalker.credits25`
- **Type:** Consumable In-App Purchase
- **Price:** AUD $25.00
- **Display Name:** "25 Credits + 2 Bonus"
- **Description:** "Add 25 credits plus 2 bonus credits to your account"

- **Product ID:** `com.beanstalker.credits50`
- **Type:** Consumable In-App Purchase
- **Price:** AUD $50.00
- **Display Name:** "50 Credits + 5 Bonus"
- **Description:** "Add 50 credits plus 5 bonus credits to your account"

- **Product ID:** `com.beanstalker.credits100`
- **Type:** Consumable In-App Purchase
- **Price:** AUD $100.00
- **Display Name:** "100 Credits + 15 Bonus"
- **Description:** "Add 100 credits plus 15 bonus credits to your account"

## App Store Connect Setup Steps:

### 1. Log into App Store Connect
- Go to https://appstoreconnect.apple.com/
- Select your Bean Stalker app

### 2. Create In-App Purchases
- Go to "Features" → "In-App Purchases"
- Click "+" to add new products
- Choose "Consumable" for credit packages
- Choose "Non-Consumable" or "Non-Renewable Subscription" for membership

### 3. Configure Each Product
For each product:
1. Enter the Product ID exactly as listed above
2. Set the pricing in AUD
3. Add display names and descriptions
4. Upload required metadata and screenshots
5. Submit for review

### 4. RevenueCat Dashboard Setup
1. Log into RevenueCat dashboard
2. Go to your Bean Stalker project
3. Navigate to "Products"
4. Add each Product ID from App Store Connect
5. Create Offerings that group related products

### 5. Test with Sandbox Users
1. Create test users in App Store Connect → "Users and Access" → "Sandbox Testers"
2. Test purchases using these sandbox accounts
3. Verify products appear and purchases complete successfully

## Current Status
- **Bundle ID:** ✅ Configured (com.beanstalker.member)
- **RevenueCat Integration:** ✅ Ready
- **Products:** ❌ Need to be created in App Store Connect
- **Testing:** ❌ Requires sandbox setup

## Next Steps
1. Create all products in App Store Connect with exact Product IDs listed above
2. Submit products for Apple review
3. Configure corresponding products in RevenueCat dashboard
4. Test with sandbox users before production release

## Important Notes
- Product IDs must match exactly between App Store Connect and RevenueCat
- All products need Apple approval before they can be purchased
- Sandbox testing requires special test user accounts
- RevenueCat will automatically sync products once they're approved