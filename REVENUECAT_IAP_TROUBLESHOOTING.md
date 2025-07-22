# RevenueCat IAP Troubleshooting Guide

## Current Issue: "VITE_REVENUECAT_API_KEY not set" Error

### Root Cause
The RevenueCat API key is not being properly passed to the iOS build environment, causing the "Payment system not available" error in the TestFlight app.

### ✅ Fixed GitHub Actions Workflow
The workflow has been updated to properly export the environment variable for all build steps:

```yaml
- name: Build
  env:
    VITE_REVENUECAT_API_KEY: ${{ secrets.VITE_REVENUECAT_API_KEY }}
  run: |
    # Export environment variable for all subsequent steps
    echo "VITE_REVENUECAT_API_KEY=${{ secrets.VITE_REVENUECAT_API_KEY }}" >> $GITHUB_ENV
```

### 🔧 Required GitHub Secret Configuration

**CRITICAL: You must update your GitHub secret with the exact API key:**

1. Go to GitHub repository: `luca0405/bean-stalker-app2`
2. Navigate to: Settings → Secrets and variables → Actions
3. Find or create secret: `VITE_REVENUECAT_API_KEY`
4. Set the value to: `appl_owLmakOcTeYJOJoxJgScSQZtUQA`

**Important:** Make sure there are no extra spaces or characters when copying the API key.

### 📱 Testing Process

#### 1. Deploy Updated iOS App
```bash
git add .
git commit -m "Fix RevenueCat API key configuration for iOS IAP"
git push origin main
```

#### 2. Run GitHub Actions
- Go to Actions tab in your GitHub repository
- Click "Run workflow" on "iOS Build - Simple Fix"
- Monitor build logs for: "Building with RevenueCat API Key: CONFIGURED"

#### 3. Verify with Diagnostic Tool
Once TestFlight build is installed:
1. Open Bean Stalker app
2. Login with: `iamninz` / `password123`
3. Go to **Buy Credits** → **Diagnostic** tab
4. Tap **"Run Diagnostics"**

**Expected Success Results:**
```
✅ Platform Check: Native iOS
✅ RevenueCat API Key: Configured
✅ IAP Service Initialization: Success
✅ User Login: Success (User ID: 32)
✅ Product Loading: Found 4 products
✅ IAP Availability: Available
```

#### 4. Sandbox Purchase Test
After diagnostics pass:
1. Sign out from real Apple ID: Settings → App Store → Sign Out
2. Open Bean Stalker app → Buy Credits
3. Try purchasing any credit package
4. When prompted, sign in with sandbox Apple ID
5. Complete test purchase (no real money charged)
6. Credits should appear in your account balance

### 🔍 Troubleshooting

#### If diagnostics still show "VITE_REVENUECAT_API_KEY not set":
1. Check GitHub secret value is exactly: `appl_owLmakOcTeYJOJoxJgScSQZtUQA`
2. Verify build logs show "Building with RevenueCat API Key: CONFIGURED"
3. Ensure no trailing spaces or hidden characters in the GitHub secret

#### If products don't load:
1. Verify App Store Connect has products: `com.beanstalker.credit25`, `com.beanstalker.credit50`, `com.beanstalker.credit100`
2. Check RevenueCat Dashboard has matching product identifiers
3. Ensure products are in "Ready to Submit" status in App Store Connect

#### If purchase fails:
1. Verify sandbox Apple ID is properly created and verified
2. Check RevenueCat Dashboard → Customer → User ID 32 for transaction logs
3. Monitor webhook endpoint: `https://member.beanstalker.com.au/api/revenuecat/webhook`

### 📊 Current Configuration Status
- ✅ RevenueCat Dashboard: Configured with correct API key
- ✅ GitHub Actions Workflow: Updated with environment variable fixes
- ✅ Diagnostic Tool: Integrated and ready for testing
- ✅ Webhook Handler: Operational and tested with manual requests
- ⏳ GitHub Secret: Requires verification/update with exact API key value
- ⏳ iOS Build: Awaiting deployment with corrected configuration

### 🎯 Success Criteria
The integration is complete when:
1. Diagnostic tool shows all ✅ checkmarks
2. Credit packages can be purchased with sandbox Apple ID
3. Credits automatically appear in Bean Stalker account balance
4. RevenueCat Dashboard shows successful transactions for User ID 32

Once these steps are verified, your iOS IAP integration will be fully operational for TestFlight distribution.