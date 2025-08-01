# CRITICAL TESTFLIGHT REVENUECAT FIX

## Issue Confirmed
User 55 (luca) has 0 credits despite attempting purchases in TestFlight app.
Webhook testing shows backend is working perfectly:
- Manual webhook test → User 55 now has 98.5 credits
- Backend processes com.beanstalker.membership69 and com.beanstalker.credits25 correctly

## Root Cause
RevenueCat in TestFlight app is not sending webhooks to server after purchases.
This indicates:
1. Purchases may be completing in Apple's sandbox but not triggering RevenueCat webhooks
2. RevenueCat webhook URL may not be configured correctly
3. User ID mapping may be incorrect in RevenueCat

## Immediate Fixes Required

### 1. RevenueCat Webhook URL Configuration
Webhook URL should be: `https://member.beanstalker.com.au/api/revenuecat/webhook`
Authorization: `Bearer bean-stalker-webhook-2025`

### 2. User ID Synchronization
RevenueCat must use actual Bean Stalker user IDs (55, 40, etc.) not hardcoded values

### 3. Product ID Verification
App must find exact products: com.beanstalker.membership69, com.beanstalker.credits25, etc.

## Next Steps
1. Deploy fixed RevenueCat configuration to TestFlight
2. Test with user 55 account
3. Verify webhooks are triggered from real purchases
4. Confirm credits are added automatically

The backend is proven working. The issue is RevenueCat → webhook communication.