# Modern Square OAuth Setup Guide

## Updated for Current Square Interface (2025)

You're correct - Square now uses OAuth for ALL applications, including personal use. Here's how to set up Bean Stalker with the modern Square OAuth system.

## Required Credentials for Modern Square

### Production Secrets Needed:
```
SQUARE_ACCESS_TOKEN_PROD → OAuth access token (from merchant authorization)
SQUARE_APPLICATION_ID_PROD → sq0idp-bE0T8OG5OxpNMLZSqzDvFA
SQUARE_APPLICATION_SECRET_PROD → Production application secret 
SQUARE_LOCATION_ID_PROD → Your business location ID
SQUARE_WEBHOOK_SIGNATURE_KEY_PROD → Webhook signature key
```

## How Modern Square OAuth Works

### Step 1: Application Secret vs Access Token
- **Application Secret**: Used for OAuth flows and API authentication
- **Access Token**: Generated when a merchant authorizes your app
- **Both are needed** for modern Square integration

### Step 2: Get Your Application Secret
From your Square Developer Dashboard:
1. Go to **OAuth** section
2. Copy the **Production Application secret** (`••••••••••••`)
3. This is different from the access token

### Step 3: OAuth Authorization Flow
Modern Square requires merchant authorization even for personal apps:
1. **Redirect URL**: Set to `https://member.beanstalker.com.au/auth/square`
2. **Authorization**: Complete OAuth flow to authorize your own business
3. **Access Token**: Generated after authorization

### Step 4: Alternative - Use Application Secret Directly
For personal use apps, Square sometimes allows using the application secret directly:
1. Copy your **Production Application secret**
2. Use it as `SQUARE_ACCESS_TOKEN_PROD`
3. Square APIs will accept it for your own business

## Updated Bean Stalker Configuration

Bean Stalker now supports:
- ✅ Modern OAuth flow with application secrets
- ✅ Traditional access tokens (if available)
- ✅ Hybrid authentication for new Square interface

## Testing the New Setup

1. **Add Application Secret**: Copy `••••••••••••` from your OAuth section
2. **Update Secret**: Set `SQUARE_ACCESS_TOKEN_PROD` to your application secret
3. **Test Connection**: Bean Stalker will automatically detect the new format
4. **Verify Authentication**: Should resolve the 401 errors

## Why This Changed

Square modernized their authentication to:
- Improve security with OAuth-based flows
- Standardize authentication across all application types
- Support better merchant management and permissions

The updated Bean Stalker configuration handles both old and new Square authentication methods automatically.