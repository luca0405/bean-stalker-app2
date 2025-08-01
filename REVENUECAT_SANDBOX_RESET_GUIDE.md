# RevenueCat Sandbox Testing Reset Guide

## Complete Data Cleanup for Fresh Testing

### 1. RevenueCat Dashboard Cleanup

**Customer Data Reset:**
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Navigate to **Customers** section
3. Find your test customers (search by App User ID like "58", "59", "60")
4. For each customer:
   - Click on customer → **Delete Customer**
   - This removes all purchase history for that customer

**Alternative - Project Reset:**
- Go to **Project Settings** → **General**
- Consider creating a new project for clean testing
- Update your API key in the app if using new project

### 2. Apple Sandbox Account Reset

**Clear Purchase History:**
1. On your iOS device: **Settings** → **App Store** 
2. Scroll down to **Sandbox Account**
3. Sign out of current sandbox account
4. Create new sandbox account OR
5. Contact Apple to reset purchase history (takes 24-48 hours)

**Faster Method - New Sandbox Account:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. **Users and Access** → **Sandbox Testers**
3. Create new sandbox tester account
4. Use this fresh account on device

### 3. App Data Reset

**Complete App Reset:**
1. Delete Bean Stalker app from device
2. Reinstall from TestFlight
3. This clears all RevenueCat anonymous IDs and local data

**Alternative - Reset RevenueCat State:**
```javascript
// Add this to your app for testing
const resetRevenueCat = async () => {
  await Purchases.logOut();
  // Clear any local storage
  await Preferences.clear();
  // Force app restart
  window.location.reload();
};
```

### 4. Server Database Reset (Bean Stalker)

**Clear Test Users:**
1. Use the admin panel or run SQL:
```sql
-- Delete test users (keep real users)
DELETE FROM users WHERE id > 50 AND credits = 0;
DELETE FROM credit_transactions WHERE user_id > 50;
```

**Or use the app's reset endpoint** (if we create one):
```
POST /api/admin/reset-test-data
```

### 5. Testing Workflow Recommendations

**Fresh Test Session:**
1. New sandbox account
2. Delete/reinstall app
3. Clear RevenueCat customers
4. Test registration with membership
5. Verify webhook receives correct data

**Iterative Testing:**
1. Use different sandbox accounts for each test
2. Increment user IDs (58 → 59 → 60)
3. Check RevenueCat dashboard after each purchase
4. Verify webhook logs in server console

### 6. Troubleshooting

**If purchases still appear:**
- Wait 15-30 minutes for Apple sandbox to update
- Try different sandbox account
- Check if RevenueCat is caching data

**If RevenueCat shows old data:**
- Clear browser cache for RevenueCat dashboard
- Check if using correct project/environment
- Verify API keys match current project

### 7. Current Sandbox Account Status

**Check your current setup:**
- Sandbox account email: `[your-sandbox-email]`
- RevenueCat project: `Bean Stalker`
- Last test user ID: `[check database]`

**Recommended reset frequency:**
- Full reset before major testing sessions
- New sandbox account weekly
- RevenueCat customer cleanup after each test

## Quick Reset Commands

**For immediate testing:**
1. New sandbox account
2. Delete/reinstall app
3. Clear RevenueCat test customers
4. Ready for fresh membership test