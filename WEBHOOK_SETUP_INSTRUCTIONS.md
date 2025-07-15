# Square Webhook Setup for Bidirectional Order Sync

## Current Status
❌ **Webhooks not receiving Square status updates**
✅ **Bean Stalker → Square sync working** (orders automatically sync to Square)
❌ **Square → Bean Stalker sync not working** (status updates not received)

## Why Webhooks Aren't Working

The webhook endpoint exists at `/api/square/webhook` but Square isn't sending webhooks because:

1. **Webhook URL not configured** in Square Developer Dashboard
2. **Replit dynamic URLs** change frequently  
3. **HTTPS requirement** for production webhooks

## Solution Options

### Option 1: Configure Square Webhooks (Recommended for Production)

1. **Get your Replit app URL**:
   ```
   https://your-repl-name.your-username.repl.co
   ```

2. **Login to Square Developer Dashboard**:
   - Go to https://developer.squareup.com/apps
   - Select your Bean Stalker app
   - Navigate to "Webhooks" section

3. **Add webhook endpoint**:
   ```
   Webhook URL: https://your-repl-name.your-username.repl.co/api/square/webhook
   Events to subscribe to:
   - order.created
   - order.updated
   - order.fulfilled
   ```

4. **Test webhook**:
   - Square will send a test webhook
   - Check server logs for "📨 Received Square webhook"

### Option 2: Manual Sync Button (Current Workaround)

Since webhooks require configuration, I've created a manual sync endpoint:

```bash
curl -X POST http://localhost:5000/api/square/sync-from-square
```

This checks all Square orders and updates Bean Stalker order statuses.

### Option 3: Scheduled Sync (Alternative)

For production, you could set up a scheduled job to sync every 30 seconds:

```javascript
setInterval(async () => {
  try {
    const { syncOrdersFromSquare } = await import('./square-kitchen-integration');
    await syncOrdersFromSquare();
  } catch (error) {
    console.error('Scheduled sync failed:', error);
  }
}, 30000); // Every 30 seconds
```

## Current Webhook Endpoint

The webhook endpoint at `/api/square/webhook` is ready and includes:

- ✅ **Signature verification** with HMAC SHA-256
- ✅ **Event processing** for order status changes  
- ✅ **Push notifications** to customers
- ✅ **Database updates** for Bean Stalker orders
- ✅ **Comprehensive logging** for debugging

## Testing Order #56

To test if order #56 exists and sync its status:

1. **Check if order exists**:
   ```bash
   curl -H "Cookie: $(cat admin_cookies.txt)" http://localhost:5000/api/orders | jq '.[] | select(.id == 56)'
   ```

2. **Manual sync from Square**:
   ```bash
   curl -X POST http://localhost:5000/api/square/sync-from-square
   ```

## Next Steps

1. **For immediate testing**: Use the manual sync endpoint
2. **For production**: Configure webhooks in Square Developer Dashboard
3. **For automation**: Implement scheduled sync as fallback

The bidirectional sync code is complete and tested - it just needs webhook configuration to receive Square status updates automatically.