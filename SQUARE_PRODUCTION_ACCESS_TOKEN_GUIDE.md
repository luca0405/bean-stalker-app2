# Square Production Access Token Guide

## Current Status: OAuth Application Requiring Merchant Authorization

Your Square application is correctly configured as an OAuth application, but the access token `EAAAl5wZKM...` needs proper merchant authorization to work.

## Solution: Complete OAuth Authorization Flow

### Step 1: Manual OAuth Authorization URL
Since your application ID is `sq0idp-bE0T8OG5OxpNMLZSqzDvFA`, visit this URL to authorize Bean Stalker:

```
https://connect.squareup.com/oauth2/authorize?client_id=sq0idp-bE0T8OG5OxpNMLZSqzDvFA&scope=PAYMENTS_READ%20PAYMENTS_WRITE%20ORDERS_READ%20ORDERS_WRITE%20MERCHANT_PROFILE_READ%20ITEMS_READ%20INVENTORY_READ&session=false&redirect_uri=https://member.beanstalker.com.au/auth/square/callback&state=beanstalker-oauth
```

### Step 2: What Will Happen
1. **Square Authorization Page**: You'll see a page asking to authorize "Bean Stalker" access to your Square account
2. **Grant Permission**: Click "Allow" or "Authorize"
3. **Redirect**: Square will redirect to `https://member.beanstalker.com.au/auth/square/callback?code=XXXXX`
4. **Authorization Code**: Copy the `code=XXXXX` parameter from the URL
5. **Exchange for Token**: Use this code to get a proper access token

### Step 3: Exchange Code for Access Token
After getting the authorization code, you can exchange it for a proper access token using:

```bash
curl -X POST 'https://connect.squareup.com/oauth2/token' \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "sq0idp-bE0T8OG5OxpNMLZSqzDvFA",
    "client_secret": "[YOUR_APPLICATION_SECRET]",
    "code": "[AUTHORIZATION_CODE_FROM_CALLBACK]",
    "redirect_uri": "https://member.beanstalker.com.au/auth/square/callback",
    "grant_type": "authorization_code"
  }'
```

### Step 4: Update Bean Stalker
Replace `SQUARE_ACCESS_TOKEN_PROD` with the new access token from the OAuth exchange.

## Alternative: Check Current Token Permissions

Your current token `EAAAl5wZKM...` might work but lack proper scopes. Let's test it with a different endpoint.

## Why This is Needed

Modern Square applications require:
1. **OAuth Authorization**: Even for personal use, you must authorize your own app
2. **Proper Scopes**: The token needs specific permissions for orders, payments, etc.
3. **Merchant Consent**: Square requires explicit merchant authorization for all API access

## Expected Result

After completing OAuth authorization, you'll get a new access token that should start with `sq0atp-` and have full permissions for Bean Stalker's Square integration.

## Quick Test Commands

Once you have the new token, test it with:
```bash
curl -H "Authorization: Bearer [NEW_TOKEN]" \
  -H "Square-Version: 2024-06-04" \
  "https://connect.squareup.com/v2/locations"
```

This should return your location details without a 401 error.