# Sandbox OAuth Setup Guide

## Current Status: Switched to Sandbox Mode

Bean Stalker is now running in sandbox mode with modern OAuth configuration:

```
🧪 Environment: SANDBOX
🔧 Location: LRQ926HVH9WFD (Beanstalker Sandbox)
🔧 App ID: sandbox-sq0idb-0f_-wyGBcz7NmblQtFkv9A
🔧 Token: EAAAl6AjlC... (64 chars, OAuth format)
```

## Issue: Sandbox Token Authentication

The current sandbox token is getting 401 Unauthorized. This is likely because:

1. **Token Expired**: The sandbox token may have expired
2. **Wrong Token**: Token might be from production environment
3. **OAuth Required**: Sandbox also needs OAuth authorization flow

## Solution Options

### Option 1: Use Working Sandbox Token
If you have a valid sandbox access token, update `SQUARE_ACCESS_TOKEN` in Replit Secrets.

### Option 2: Generate New Sandbox OAuth Token
Create a new sandbox application and complete OAuth flow:

1. **Create Sandbox App** in Square Developer Dashboard
2. **OAuth Authorization URL** for sandbox:
```
https://connect.squareupsandbox.com/oauth2/authorize?client_id=sandbox-sq0idb-0f_-wyGBcz7NmblQtFkv9A&scope=PAYMENTS_READ%20PAYMENTS_WRITE%20ORDERS_READ%20ORDERS_WRITE%20MERCHANT_PROFILE_READ%20ITEMS_READ%20INVENTORY_READ&session=false&redirect_uri=http://localhost:5000/auth/square/callback&state=beanstalker-sandbox-oauth
```

### Option 3: Switch Back to Production
Since production is working perfectly, we can switch back:
- Change `const hasProductionSecrets = false;` to `const hasProductionSecrets = true;`
- Production integration is fully operational and tested

## Current Sandbox Configuration

Bean Stalker sandbox mode uses:
- **Sandbox API URL**: `https://connect.squareupsandbox.com`
- **Modern OAuth**: Application secret support enabled
- **Location**: Beanstalker Sandbox (LRQ926HVH9WFD)
- **Environment Detection**: Correctly identifies sandbox vs production

## Quick Switch Commands

To switch between environments:

**Switch to Production:**
```javascript
const hasProductionSecrets = true; // Enable production
```

**Stay in Sandbox:**
```javascript
const hasProductionSecrets = false; // Force sandbox
```

Both environments now support modern OAuth authentication with application secrets.