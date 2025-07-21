# RevenueCat Webhook Setup Guide - 2025

## Current RevenueCat Dashboard Layout

RevenueCat has updated their dashboard interface. Here's where to find webhook settings:

### Method 1: App Settings → Integrations
1. Login to RevenueCat Dashboard
2. Select your app project
3. Navigate to **App Settings** (gear icon)
4. Look for **Integrations** or **Third-party Integrations** section
5. Find **Webhooks** or **Custom Webhooks**

### Method 2: Developer Settings
1. Go to **Settings** in the main navigation
2. Look for **Developer** or **API** section
3. Find **Webhooks** configuration

### Method 3: Project Configuration
1. From the main dashboard, click your project name
2. Look for **Configure** or **Settings** tab
3. Check for **Webhooks** under notifications or integrations

## Alternative: Direct API Configuration

If webhook UI isn't available, you can configure via RevenueCat API:

```bash
curl -X POST https://api.revenuecat.com/v1/apps/{your_app_id}/webhooks \
  -H "Authorization: Bearer {your_secret_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://member.beanstalker.com.au/api/revenuecat/webhook",
    "event_types": ["INITIAL_PURCHASE", "RENEWAL", "CANCELLATION"]
  }'
```

## Webhook Configuration Details

**Webhook URL:** `https://member.beanstalker.com.au/api/revenuecat/webhook`

**Events to Enable:**
- INITIAL_PURCHASE (new IAP purchases)
- RENEWAL (subscription renewals)
- CANCELLATION (subscription cancellations)

## Verification

Once configured, test webhook delivery:
1. Make a sandbox IAP purchase
2. Check RevenueCat Dashboard → Customer page for user "32"
3. Verify webhook delivery logs in RevenueCat
4. Confirm credits appear in Bean Stalker app

## Manual Testing Alternative

If webhook setup is difficult, you can manually test the integration:

```bash
# Test webhook locally
curl -X POST http://localhost:5000/api/revenuecat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE",
      "product_id": "com.beanstalker.credit25",
      "app_user_id": "32"
    }
  }'
```

This will simulate a RevenueCat webhook and add credits to user 32's account.