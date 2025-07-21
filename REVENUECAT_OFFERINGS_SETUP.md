# RevenueCat Offerings Setup Guide

## What are RevenueCat Offerings?

Offerings are collections of products that you can present to customers. They make it easy to:
- Group related products together (e.g., "Credit Packages")
- Run A/B tests with different product combinations
- Update product presentation without app updates
- Manage seasonal promotions or special deals

## Setting Up Your Bean Stalker Offerings

### Step 1: Create Credit Package Offering

1. **Go to RevenueCat Dashboard → Product catalog → Offerings**
2. **Click "New offering"**
3. **Configure the offering:**
   - **Identifier**: `credit_packages`
   - **Display name**: `Bean Stalker Credit Packages`
   - **Description**: `Premium coffee credits with bonus rewards`

### Step 2: Add Your Products to the Offering

**Add these products to your `credit_packages` offering:**

1. **$25 Credit Package**
   - Product ID: `com.beanstalker.credit25`
   - Position: 1
   - Package identifier: `credits_25`

2. **$50 Credit Package** 
   - Product ID: `com.beanstalker.credit50`
   - Position: 2 (mark as "Featured" or "Popular")
   - Package identifier: `credits_50`

3. **$100 Credit Package**
   - Product ID: `com.beanstalker.credit100`
   - Position: 3
   - Package identifier: `credits_100`

### Step 3: Create Membership Offering (Optional)

You can also create a separate offering for membership:

1. **Create new offering:**
   - **Identifier**: `premium_membership`
   - **Display name**: `Bean Stalker Premium`
   - **Description**: `Unlock premium features and benefits`

2. **Add membership product:**
   - Product ID: `com.beanstalker.membership69`
   - Package identifier: `membership`

### Step 4: Set Default Offering

- Set `credit_packages` as your **default offering**
- This will be shown to customers by default

## Updated Bean Stalker Integration

With Offerings, Bean Stalker will:
- ✅ Load products from RevenueCat Offerings instead of hardcoded list
- ✅ Get real App Store pricing automatically
- ✅ Support A/B testing different product combinations
- ✅ Allow you to update products without app releases

## Benefits of Using Offerings

1. **Dynamic Product Management**: Change products without app updates
2. **Real Pricing**: Get actual App Store prices instead of hardcoded values
3. **A/B Testing**: Test different product combinations with different user groups
4. **Better Analytics**: Track which offerings perform best
5. **Promotional Flexibility**: Create seasonal or special event offerings

## Testing with Offerings

Once you create the offerings:
1. Bean Stalker app will load products from RevenueCat instead of hardcoded list
2. You'll see real App Store prices in the app
3. Sandbox testing works exactly the same way
4. Purchase flow remains identical for users

## Recommended Structure

```
📦 credit_packages (Default Offering)
├── 💰 credits_25 ($25 → $29.50)
├── ⭐ credits_50 ($50 → $59.90) [Popular]
└── 💎 credits_100 ($100 → $120.70)

📦 premium_membership (Secondary Offering)
└── 👑 membership ($69 Premium Access)
```

This structure gives you maximum flexibility while keeping the user experience simple and clear.