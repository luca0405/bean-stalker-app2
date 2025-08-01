# TestFlight Sandbox Account Fix

## Problem
TestFlight is not using your sandbox Apple ID account for in-app purchase testing, which breaks RevenueCat membership testing.

## Root Cause
TestFlight often defaults to your real Apple ID instead of sandbox account, causing:
- IAP failures in sandbox environment
- RevenueCat receiving production receipts in sandbox mode
- Apple Pay showing real credit cards instead of sandbox

## Solutions

### Method 1: Force Sandbox Account
1. **Sign out of real Apple ID:**
   - Settings → [Your Name] → Media & Purchases → Sign Out
   
2. **Sign into sandbox account:**
   - Settings → App Store → Sandbox Account
   - Use your sandbox tester email/password
   
3. **Restart TestFlight app:**
   - Double-tap home → swipe up on TestFlight
   - Reopen and test again

### Method 2: Development Build Testing
Instead of TestFlight, use Xcode development builds:

1. **Connect iPhone to Mac with Xcode**
2. **Run from Xcode:** Product → Run (⌘R)
3. **This forces sandbox mode** and works reliably with RevenueCat

### Method 3: Simulator Testing
Use iOS Simulator with StoreKit configuration:

1. **Open iOS Simulator**
2. **Load Bean Stalker app**
3. **StoreKit automatically uses sandbox mode**
4. **Test RevenueCat IAP flows**

### Method 4: Web Testing (Fallback)
For rapid iteration, test core flows on web:

1. **Open app in browser:** http://localhost:5000
2. **Test registration without IAP**
3. **Verify RevenueCat configuration**
4. **Move to native for final IAP testing**

## Verification Steps

### Check Sandbox Mode is Active:
1. **RevenueCat Dashboard:** Should show sandbox transactions
2. **Apple Pay:** Should show "Sandbox" watermark
3. **Purchase Receipts:** Should be sandbox format
4. **Console Logs:** Should show sandbox environment

### Test Sequence:
1. Reset test data: `POST /api/admin/reset-test-data`
2. Delete app and reinstall from TestFlight
3. Register with membership purchase
4. Verify webhook receives sandbox receipt
5. Check RevenueCat dashboard for test customer

## Alternative: Direct RevenueCat Testing

If TestFlight continues to fail, we can simulate IAP purchases:

### Simulate Purchase Flow:
```javascript
// Add to app for testing
const simulatePurchase = async () => {
  const mockReceipt = {
    productId: 'com.beanstalker.membership69',
    transactionId: 'sandbox_' + Date.now(),
    purchaseDate: new Date().toISOString()
  };
  
  // Send to webhook directly
  await fetch('/api/revenuecat/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: getCurrentUserId(),
        product_id: 'com.beanstalker.membership69'
      }
    })
  });
};
```

## Recommendation

**For reliable testing:**
1. Use Xcode development builds instead of TestFlight
2. Keep TestFlight for UI/UX testing only
3. Use development builds for IAP/RevenueCat testing
4. Deploy to TestFlight only for final validation

This eliminates the sandbox account issues entirely.