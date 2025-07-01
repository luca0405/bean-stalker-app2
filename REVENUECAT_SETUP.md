# RevenueCat API Key Setup

## Step 1: Get API Key from Dashboard

1. Go to https://app.revenuecat.com
2. Select your project (or create new one)
3. Project Settings → API Keys
4. Copy "Public API Key" (starts with `rcv_`)

## Step 2: Add to Replit Environment

1. In Replit, go to Secrets tab (lock icon)
2. Add new secret:
   - Key: `VITE_REVENUECAT_API_KEY`
   - Value: `rcv_your_actual_key_here`

## Step 3: Configure Your App in RevenueCat

### App Configuration
- Bundle ID: `com.beanstalker.app`
- Platform: iOS
- App Store Connect Integration: Link your Apple Developer account

### Product Setup
1. Products tab → Add Product
2. Product ID: `com.beanstalker.member`
3. Display Name: `Premium Membership`
4. Link to App Store Connect product

## Step 4: Verify Integration

Once you add the API key, your app will automatically:
- Switch from development mode to production RevenueCat
- Use real sandbox testing with Apple
- Show actual purchase flows in RevenueCat dashboard

## Current Status
- ✅ App configured for `com.beanstalker.member`
- ✅ iOS project synced and ready
- ⏳ Waiting for RevenueCat API key
- ⏳ App Store Connect product creation

After adding the API key, you'll see real purchase data in your RevenueCat dashboard during sandbox testing.