# Square Kitchen Display Webhook Configuration

This guide explains how to configure Square webhooks for automatic order status sync between Bean Stalker and Square for Restaurants Kitchen Display.

## Current Status
- ✅ Webhook endpoint implemented: `/api/square/webhook`
- ✅ Webhook processing logic ready
- ✅ Push notifications for status changes
- ✅ Manual sync available as fallback
- ⚠️  **Requires Square Developer Dashboard configuration**

## Required Square Developer Dashboard Setup

### 1. Access Square Developer Dashboard
1. Go to https://developer.squareup.com/
2. Sign in with your Square account
3. Navigate to "Applications" and select your app (or create a new one)

### 2. Configure Webhook Settings
1. In your application dashboard, click "Webhooks" in the left sidebar
2. Click "Add Endpoint"
3. Configure the following:

**Webhook URL:**
```
https://254f9cab-c472-4e6a-a994-0f073692b831-00-3hmwwmedkcuw0.spock.replit.dev/api/square/webhook
```

**Subscribe to Events:**
- `order.created` - New orders
- `order.updated` - Status changes
- `order.fulfilled` - Order completion

### 3. Get Webhook Signature Key
1. After creating the webhook, Square will provide a "Signature Key"
2. Copy this key - you'll need to add it as a secret

### 4. Add Secret to Replit
1. In your Replit project, go to "Secrets" tab
2. Add a new secret:
   - Key: `SQUARE_WEBHOOK_SIGNATURE_KEY`
   - Value: [The signature key from Square]

## How It Works

### Current Flow (Manual Sync)
1. Customer places order in Bean Stalker
2. Order automatically syncs to Square Kitchen Display
3. Kitchen staff can see order in Square for Restaurants app
4. Customer clicks "Check Updates" to sync status changes back

### Automatic Flow (After Webhook Setup)
1. Customer places order in Bean Stalker
2. Order automatically syncs to Square Kitchen Display
3. Kitchen staff updates order status in Square for Restaurants
4. **Square automatically sends webhook to Bean Stalker**
5. **Bean Stalker updates order status and sends push notification**
6. **Customer sees real-time status update without manual sync**

## Testing the Webhook

### Test in Square Sandbox
1. Use Square for Restaurants sandbox app
2. Update order status (e.g., mark as "Ready")
3. Check Bean Stalker logs for webhook reception
4. Verify customer receives push notification

### Webhook Payload Example
```json
{
  "merchant_id": "MERCHANT_ID",
  "type": "order.updated",
  "event_id": "EVENT_ID", 
  "created_at": "2025-07-01T08:22:30Z",
  "data": {
    "type": "order",
    "id": "ORDER_ID",
    "object": {
      "order": {
        "id": "SQUARE_ORDER_ID",
        "state": "COMPLETED",
        "fulfillments": [...],
        "line_items": [...]
      }
    }
  }
}
```

## Troubleshooting

### Webhook Not Received
1. Check webhook URL is correct and accessible
2. Verify webhook signature key is set correctly
3. Check Replit logs for webhook processing errors
4. Ensure events are subscribed correctly in Square dashboard

### Status Not Syncing
1. Verify order ID mapping in webhook payload
2. Check Bean Stalker order ID format in Square order notes
3. Confirm push notification service is working

### Manual Sync as Fallback
If webhooks are not configured yet, customers can use the "Check Updates" button to manually sync order status from Square Kitchen Display.

## Benefits of Automatic Webhooks

1. **Real-time Updates**: Instant status sync without manual intervention
2. **Better Customer Experience**: Immediate notifications when orders are ready
3. **Reduced Kitchen Staff Workload**: No need to manually notify customers
4. **Improved Efficiency**: Seamless integration between ordering and kitchen systems

## Next Steps

1. Complete Square Developer Dashboard webhook configuration
2. Add webhook signature key to Replit secrets
3. Test webhook in Square sandbox environment
4. Deploy to production once testing is successful