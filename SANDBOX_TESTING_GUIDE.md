# Sandbox Testing Guide - No Review Required

## Testing IAP Without Apple Review

You can test your `com.beanstalker.member` product immediately using Apple's Sandbox environment - no review submission needed!

### Step 1: Create Sandbox Product (No Review)
1. Go to App Store Connect → My Apps → Bean Stalker → Features → In-App Purchases
2. Create product with ID: `com.beanstalker.member`
3. Set all required fields (name, description, price)
4. **Important**: Do NOT click "Submit for Review"
5. Product status will show "Ready to Submit" - this is perfect for testing

### Step 2: Create Sandbox Test Account
1. In App Store Connect, go to **Users and Access**
2. Click **Sandbox Testers** tab
3. Click **"+"** to create new tester
4. Fill in details:
   - **Email**: Use a NEW email (not associated with any Apple ID)
   - **Password**: Create secure password
   - **First/Last Name**: Any name
   - **Country**: Australia (to match your AUD pricing)
   - **Date of Birth**: 18+ years old

### Step 3: Configure Your Device for Testing
**On your iOS device/simulator:**
1. Go to **Settings → App Store**
2. Sign out of your regular Apple ID
3. Scroll down to **Sandbox Account**
4. Sign in with your new sandbox test account

### Step 4: Build and Install App
```bash
# Build the app
npm run build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### Step 5: Test Purchase Flow
1. Run app on device (not simulator for real IAP testing)
2. Navigate to registration or buy credits
3. Attempt to purchase `com.beanstalker.member`
4. iOS will show sandbox purchase dialog
5. Complete purchase with sandbox account

## What Happens During Sandbox Testing

### Expected Behavior
- Purchase dialog shows "Environment: Sandbox"
- No real money is charged
- Purchase completes successfully
- RevenueCat receives test transaction data
- App receives purchase confirmation

### Debugging Sandbox Issues
**If purchase fails:**
1. Check Xcode console for error messages
2. Verify product ID matches exactly: `com.beanstalker.member`
3. Ensure sandbox account country matches product availability
4. Confirm RevenueCat API key is configured

**Common Sandbox Errors:**
- "Product not found": Product may not be created yet
- "Cannot connect": Check sandbox account setup
- "Purchase failed": Review product configuration

## Environment Setup for Testing

### Required Environment Variables
```bash
# Add to your Replit environment
VITE_REVENUECAT_API_KEY=rcv_xxx... # From RevenueCat dashboard
```

### RevenueCat Dashboard Setup
1. Sign up at revenuecat.com
2. Create new app with bundle ID: `com.beanstalker.app`
3. Add product: `com.beanstalker.member`
4. Copy API key for environment variable

## Testing Checklist

### ✅ Before Testing
- [ ] Product created in App Store Connect (status: "Ready to Submit")
- [ ] Sandbox test account created
- [ ] Device signed out of regular Apple ID
- [ ] Device signed into sandbox account
- [ ] RevenueCat API key added to environment
- [ ] App built and installed on device

### ✅ During Testing
- [ ] Purchase dialog appears with "Sandbox" label
- [ ] Transaction completes without errors
- [ ] App receives purchase confirmation
- [ ] RevenueCat dashboard shows test transaction
- [ ] User account updated with premium status

## Advantages of Sandbox Testing

### No Review Wait Time
- Test immediately after product creation
- Iterate quickly on purchase flow
- Debug issues without delays

### Safe Testing Environment
- No real money involved
- Unlimited test purchases
- Full IAP functionality testing

### Real Transaction Flow
- Authentic purchase experience
- RevenueCat integration testing
- Receipt validation testing

## Next Steps After Successful Testing

1. **Fix any issues** found during sandbox testing
2. **Document working purchase flow**
3. **Prepare for TestFlight** when ready for broader testing
4. **Submit for review** only when completely satisfied

Your app is technically ready for sandbox testing right now - just create the product and sandbox account!