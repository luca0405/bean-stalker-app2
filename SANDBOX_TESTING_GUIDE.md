# Sandbox IAP Testing Guide

## How to Test In-App Purchases in TestFlight

### 1. Sandbox Apple ID Setup
1. **Create Sandbox Apple ID**:
   - Go to App Store Connect → Users & Access → Sandbox Testers
   - Create a new sandbox Apple ID (use different email from real Apple ID)
   - Note: Don't use your real Apple ID for sandbox testing

2. **Sign into Sandbox Account**:
   - On your iPhone: Settings → App Store → Sandbox Account → Sign In
   - Use the sandbox Apple ID you just created
   - Keep your real Apple ID signed in to regular App Store

### 2. TestFlight App Installation
1. **Install from TestFlight**:
   - Download latest Bean Stalker build from TestFlight
   - Ensure you're testing the Debug build (not Release)

2. **Verify Sandbox Environment**:
   - IAP purchases should show sandbox pricing
   - "Sandbox" should appear in purchase dialogs

### 3. Making Sandbox Purchases
1. **Test Credit Packages**:
   - Open Buy Credits page in Bean Stalker app
   - Select any credit package ($25, $50, $100, or $69 membership)
   - Tap "Purchase" button

2. **Sandbox Purchase Flow**:
   - iOS will show purchase dialog with sandbox account
   - Confirm purchase (no real money charged)
   - Purchase should complete and credits added to account

### 4. Debugging IAP Issues
1. **Force Reload RevenueCat**:
   - Use "Force Reload RevenueCat" button in Buy Credits page
   - This retries offerings fetch multiple times
   - Check console logs for detailed error messages

2. **Troubleshooter**:
   - Use "RevenueCat Troubleshooter" for comprehensive diagnostics
   - Shows API key status, offerings, and specific error details

### 5. Common Issues & Solutions

**"0 Products Found"**:
- Ensure you're using Debug build (not Release)
- Check sandbox Apple ID is signed in
- Wait 1-2 hours after changing App Store Connect product status
- Products must be "Ready to Submit" in App Store Connect

**Purchase Dialog Doesn't Appear**:
- Sign out and back into sandbox Apple ID
- Restart Bean Stalker app
- Check App Store → Sandbox Account settings

**Products Show Wrong Prices**:
- You're likely in production mode instead of sandbox
- Ensure Debug build configuration is used

### 6. Current Product Configuration
Your RevenueCat products:
- `com.beanstalker.credit25` - $25 credits (+$4.50 bonus)
- `com.beanstalker.credit50` - $50 credits (+$9.90 bonus)  
- `com.beanstalker.credit100` - $100 credits (+$20.70 bonus)
- `com.beanstalker.membership69` - $69 premium membership

### 7. Verifying Successful Purchases
1. **Bean Stalker App**:
   - Check Available Balance on home page
   - Credits should update immediately after purchase

2. **RevenueCat Dashboard**:
   - Go to RevenueCat → Customers → Find your user ID (32)
   - Purchase events should appear in real-time

3. **App Store Connect**:
   - Sandbox purchases appear in App Store Connect → Analytics
   - May take a few minutes to show up

### 8. Build Configuration Status
✅ **Current Build**: Debug configuration for sandbox testing
✅ **API Key**: Hardcoded fallback active (appl_owLmakOcTeYJOJoxJgScSQZtUQA)
✅ **User ID**: Automatically mapped to "32" for testing
✅ **Environment**: Sandbox mode enabled for IAP testing

### Next Steps
1. Deploy updated Debug build to TestFlight
2. Sign into sandbox Apple ID on test device
3. Test purchases using sandbox account
4. Verify credits are added to Bean Stalker account
5. Check RevenueCat dashboard for purchase events