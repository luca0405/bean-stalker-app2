# RevenueCat Webhook Configuration Fix

## Issue Identified
✅ **Purchase successful in RevenueCat dashboard**: Customer 67 bought membership for $44.65  
✅ **Webhook endpoint working**: Manual test successfully added 69 credits  
❌ **Missing automatic webhook**: RevenueCat not sending events to our server

## Root Cause
RevenueCat Dashboard doesn't have our webhook URL configured, so purchase events aren't being sent automatically.

## Immediate Fix Required

### 1. Configure Webhook URL in RevenueCat Dashboard

**Steps:**
1. Go to RevenueCat Dashboard → Project Settings → Webhooks
2. Add webhook URL: `https://member.beanstalker.com.au/api/revenuecat/webhook`
3. Set Authorization Header: `Bearer bean-stalker-webhook-2025`
4. Enable events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`

### 2. Manual Credit Processing (Temporary Solution)

Since the purchase already happened but webhook wasn't triggered, you can manually process it:

```bash
# Process the missed $69 membership purchase for user luca21 (ID: 67)
curl -X POST https://member.beanstalker.com.au/api/revenuecat/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bean-stalker-webhook-2025" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE", 
      "product_id": "com.beanstalker.membership69",
      "app_user_id": "67"
    }
  }'
```

## Verification Tests

### Test 1: Webhook Endpoint Health
```bash
curl -X POST https://member.beanstalker.com.au/api/revenuecat/webhook \
  -H "Content-Type: application/json" \
  -d '{}' 
# Expected: {"message":"Webhook endpoint active"}
```

### Test 2: Full Purchase Processing
```bash
curl -X POST https://member.beanstalker.com.au/api/revenuecat/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bean-stalker-webhook-2025" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE",
      "product_id": "com.beanstalker.membership69", 
      "app_user_id": "67"
    }
  }'
# Expected: {"message":"Webhook processed successfully","creditsAdded":69,"userId":67}
```

## Long-term Solution

### Enhanced Webhook Configuration
Add these webhook events in RevenueCat Dashboard:
- `INITIAL_PURCHASE` - New purchases
- `RENEWAL` - Subscription renewals  
- `CANCELLATION` - Subscription cancellations
- `EXPIRATION` - Subscription expirations

### Webhook Security
- Authorization header: `Bearer bean-stalker-webhook-2025`  
- IP whitelist: RevenueCat webhook IPs
- Request signature verification (optional)

## Current Status
- ✅ Webhook endpoint deployed and functional
- ✅ Credit processing logic working correctly
- ✅ Anonymous ID mapping system operational
- ❌ **ACTION REQUIRED**: Configure webhook URL in RevenueCat Dashboard

## Next Steps
1. **PRIORITY 1**: Add webhook URL in RevenueCat Dashboard
2. **PRIORITY 2**: Process the missed $69 purchase manually  
3. **PRIORITY 3**: Test with a new purchase to verify automatic processing
4. **PRIORITY 4**: Monitor webhook logs for successful events

## Expected Outcome
After webhook configuration:
1. User makes purchase → RevenueCat processes payment
2. RevenueCat sends webhook → Our server receives event automatically  
3. Server processes event → Credits added to user account
4. User sees credits immediately in app