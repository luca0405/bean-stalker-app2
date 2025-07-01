# Apple Developer Setup - Real IAP Configuration

## Current Status
✅ **Apple Developer Access**: Confirmed
✅ **Product IDs Configured**: `com.beanstalker.member` ready
✅ **Development Mode**: Currently active for testing

## Step 1: Create IAP Product in App Store Connect

### Navigate to Your App
1. Go to App Store Connect → My Apps
2. Find/create "Bean Stalker" app entry
3. Features → In-App Purchases → Create new

### Product Configuration
```
Type: Non-Consumable
Product ID: com.beanstalker.member
Reference Name: Bean Stalker Premium Membership
Price: AUD $69.00 (Tier 42)
```

### Product Information
```
Display Name: Premium Membership
Description: Unlock full access to Bean Stalker's premium coffee ordering experience with exclusive features and benefits.
```

## Step 2: RevenueCat Dashboard Setup

### Create RevenueCat Account
1. Sign up at https://www.revenuecat.com
2. Create new app with bundle ID: `com.beanstalker.app`
3. Add iOS platform configuration

### Link Products
1. Products tab → Add Product
2. Product ID: `com.beanstalker.member`
3. Link to App Store Connect product

### Get API Key
1. Project Settings → API Keys
2. Copy Public API Key (starts with `rcv_`)
3. Add to Replit environment as `VITE_REVENUECAT_API_KEY`

## Step 3: Switch to Production Mode

Once you have the RevenueCat API key, the app will automatically switch from development mode to production IAP testing.

### Add Environment Variable
```bash
# In Replit Secrets
VITE_REVENUECAT_API_KEY=rcv_your_actual_key_here
```

## Step 4: Sandbox Testing

### Create Sandbox Tester
1. App Store Connect → Users and Access → Sandbox Testers
2. Create test Apple ID for Australian region
3. Use this for testing purchases

### Test on Device
```bash
npm run build
npx cap sync ios
npx cap open ios
```

### Device Configuration
- Sign out of regular Apple ID in Settings → App Store
- Install app from Xcode
- Sign in with sandbox Apple ID when prompted for purchase

## Step 5: Verification

### Expected Results
- Purchase dialog shows "Environment: Sandbox"
- AUD $69.00 price displayed correctly
- Transaction completes without real charge
- RevenueCat dashboard shows test transaction
- App grants premium membership access

## Current Development Mode Features

While setting up real IAP, your app currently simulates:
- Premium Membership purchase (AUD $69)
- Credit packages (AUD $10, $25, $50, $100)
- Realistic purchase delays and confirmations
- Transaction ID generation
- Backend credit processing

## Next Steps

1. **Create App Store Connect product** (5 minutes)
2. **Set up RevenueCat dashboard** (10 minutes)  
3. **Add API key to environment** (1 minute)
4. **Test real sandbox purchases** (immediate)

The technical implementation is complete - you just need to configure the external services and add the API key to activate production IAP mode.