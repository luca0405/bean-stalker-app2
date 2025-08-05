# RevenueCat Final Setup Guide

## Current Status
✅ **Purchase Working**: RevenueCat successfully processes $69 membership purchases  
✅ **Webhook Endpoint**: Our server webhook endpoint is working and deployed  
❌ **Missing Configuration**: RevenueCat Dashboard webhook URL not configured  

## Required Action: Configure RevenueCat Webhook

### Step 1: Add Webhook URL to RevenueCat Dashboard
1. Login to RevenueCat Dashboard
2. Go to: **Project Settings** → **Webhooks**
3. Click **"Add Webhook"**
4. Configure:
   - **URL**: `https://member.beanstalker.com.au/api/revenuecat/webhook`
   - **Authorization Header**: `Bearer bean-stalker-webhook-2025`
   - **Events**: Select all (especially `INITIAL_PURCHASE`, `RENEWAL`)

### Step 2: Verify Configuration
Test the webhook endpoint:
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
```

Expected response: `{"message":"Webhook processed successfully","creditsAdded":69,"userId":67}`

### Step 3: Process Missed Purchase
For the successful purchase shown in your dashboard (Customer 67, $44.65):
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
```

## Why This Will Fix the Issue

The "string did not match the expected pattern" error occurs during purchase, but the purchase still succeeds (as shown in your RevenueCat dashboard). The real issue is that our webhook isn't being called automatically to process the credits.

**Current Flow:**
1. User attempts purchase ✅
2. RevenueCat processes payment ✅ 
3. Purchase appears in dashboard ✅
4. RevenueCat tries to send webhook ❌ (not configured)
5. Credits never added ❌

**After Webhook Configuration:**
1. User attempts purchase ✅
2. RevenueCat processes payment ✅
3. RevenueCat sends webhook to our server ✅
4. Server processes webhook and adds credits ✅
5. User sees credits immediately ✅

## Backup System
The app now includes a backup webhook trigger that runs 2 seconds after purchase to ensure credits are processed even if the automatic webhook fails.