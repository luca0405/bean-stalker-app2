# RevenueCat In-App Purchase Sandbox Testing Guide

## Your Current Products Setup ✅

Based on your App Store Connect screenshot, you have these products configured:

| Product ID | Reference Name | Type | Status |
|------------|----------------|------|--------|
| `com.beanstalker.credit25` | $25 Credit | Non-Consumable | Draft ✅ |
| `com.beanstalker.credit50` | $50 Credit | Non-Consumable | Draft ✅ |
| `com.beanstalker.credit100` | $100 Credit | Non-Consumable | Draft ✅ |
| `com.beanstalker.membership69` | Beanstalker Membership | Non-Consumable | Draft ✅ |

**✅ Draft products work perfectly in sandbox testing!**

## Testing Environment Setup

### 1. iOS Sandbox Testing Requirements

**Create Sandbox Test User:**
1. Go to App Store Connect → Users and Access → Sandbox Testers
2. Click the "+" button to add a new sandbox tester
3. Use a **new email address** that's never been used with Apple ID
4. Set password and country to Australia (for AUD pricing)
5. **Important:** Use a different email than your main Apple ID

**Example Sandbox Test User:**
- Email: `beanstalker.test.ios@gmail.com` 
- Password: `TestPass123!`
- Country: Australia
- Birth Date: 01/01/1990

### 2. Device Setup for Testing

**On your iPhone/iPad:**
1. Settings → App Store → Sign Out of your regular Apple ID
2. **DO NOT** sign into sandbox account in Settings
3. Launch Bean Stalker app from TestFlight
4. Try to make a purchase
5. **When prompted for Apple ID**, enter your sandbox test account credentials
6. Complete the purchase flow

**⚠️ Critical:** Never sign into sandbox account in iOS Settings - only during purchase!

## Testing Flow in Bean Stalker App

### Step 1: Access Buy Credits
1. Open Bean Stalker app from TestFlight
2. Login with `iamninz/password123`
3. Navigate to Buy Credits section
4. You should see your 4 products:
   - $25 Credit ($29.50 total with $4.50 bonus)
   - $50 Credit ($59.90 total with $9.90 bonus) - Popular ⭐
   - $100 Credit ($120.70 total with $20.70 bonus)
   - Premium Membership ($69)

### Step 2: Test Purchase Flow
1. **Select any credit package** (start with $25 Credit)
2. **Tap "Buy"** - App Store purchase dialog should appear
3. **When prompted for Apple ID**, enter sandbox test credentials
4. **Confirm purchase** - Sandbox will process payment
5. **Verify success** - Credits should be added to your account

### Step 3: Verify RevenueCat Integration
**Check RevenueCat Dashboard:**
1. Go to RevenueCat Dashboard → Customers
2. Search for customer ID (user ID: 32)
3. Verify purchase appears in customer timeline
4. Check that entitlements are correctly assigned

**Check Bean Stalker Database:**
1. Purchase should update user credits in database
2. Transaction should be logged in purchase history
3. User should see updated credit balance immediately

## Expected Sandbox Behavior

### ✅ What Should Work:
- Purchase dialog appears instantly
- Sandbox payment processes immediately (no real charge)
- Success confirmation shows
- Credits added to Bean Stalker account
- RevenueCat webhook fires to update backend
- Purchase appears in RevenueCat dashboard

### ⚠️ Sandbox-Specific Behaviors:
- **No real money charged** - all payments are simulated
- **Instant processing** - no wait time for payment
- **Unlimited purchases** - same product can be "bought" multiple times
- **Test receipts** - different format than production receipts

## Troubleshooting Common Issues

### Issue: "Cannot connect to iTunes Store"
**Solution:** 
- Sign out of all Apple IDs in Settings
- Use sandbox credentials only during purchase prompt
- Ensure sandbox user email is unique

### Issue: "This Apple ID has not yet been used with the App Store"
**Solution:**
- Use sandbox credentials created specifically for testing
- Never use your main Apple ID for sandbox testing

### Issue: Products not loading
**Solution:**
- Verify bundle ID matches: `com.beanstalker.member`
- Check that products are in "Ready to Submit" or "Draft" status
- Ensure app build has correct RevenueCat configuration

### Issue: Purchase completes but credits not added
**Solution:**
- Check RevenueCat webhook configuration
- Verify backend endpoints are handling purchase verification
- Check network connectivity between app and backend

## Quick Test Checklist

**Before Testing:**
- [ ] Sandbox test user created with unique email
- [ ] Signed out of regular Apple ID on device
- [ ] Bean Stalker app installed via TestFlight
- [ ] App login works (iamninz/password123)

**During Testing:**
- [ ] Products load in Buy Credits section
- [ ] Purchase dialog appears when tapping "Buy"
- [ ] Sandbox credentials work for payment
- [ ] Purchase completes successfully
- [ ] Credits appear in Bean Stalker account
- [ ] Purchase visible in RevenueCat dashboard

**After Testing:**
- [ ] Test different credit packages ($25, $50, $100)
- [ ] Test premium membership purchase
- [ ] Verify restore purchases functionality
- [ ] Check that purchases persist across app restarts

## Next Steps After Successful Testing

1. **Submit products for review** in App Store Connect
2. **Configure production RevenueCat** webhooks
3. **Test on additional devices** with different sandbox users
4. **Prepare for App Store submission** with working IAP

## Technical Notes

**RevenueCat Configuration:**
- iOS API Key: Set in `VITE_REVENUECAT_API_KEY` environment variable
- Product IDs must match exactly between App Store Connect and Bean Stalker code
- Webhook URL: `https://member.beanstalker.com.au/api/revenuecat/webhook`

**Bean Stalker Integration:**
- Purchase verification handled by backend `/api/revenuecat/webhook`
- Credits added automatically with correct bonus amounts:
  - $25 purchase → $29.50 credits ($4.50 bonus)
  - $50 purchase → $59.90 credits ($9.90 bonus) 
  - $100 purchase → $120.70 credits ($20.70 bonus)
- Transaction history stored in database for audit trail

Your setup is perfect for testing! Draft products work exactly like live products in sandbox mode.