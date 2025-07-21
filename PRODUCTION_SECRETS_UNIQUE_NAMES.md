# Production Square Secrets - Unique Names Solution

## The Replit Caching Issue

Replit sometimes caches environment variables between deployments, causing production to use old sandbox values even after updating secrets. 

## Solution: Unique Production Secret Names

To bypass this caching issue, use these **unique secret names** for production:

### Production Secrets (Unique Names)
```
SQUARE_ACCESS_TOKEN_PROD
SQUARE_APPLICATION_ID_PROD
SQUARE_LOCATION_ID_PROD
SQUARE_WEBHOOK_SIGNATURE_KEY_PROD
```

### How to Set Up Production

1. **Keep your existing sandbox secrets** (for development):
   - SQUARE_ACCESS_TOKEN (sandbox)
   - SQUARE_APPLICATION_ID (sandbox)
   - SQUARE_LOCATION_ID (sandbox)
   - SQUARE_WEBHOOK_SIGNATURE_KEY (sandbox)

2. **Add new production secrets** in Replit Secrets panel:
   - SQUARE_ACCESS_TOKEN_PROD → Your live token (sq0atp-...)
   - SQUARE_APPLICATION_ID_PROD → Your production app ID (sq0idp-...)
   - SQUARE_LOCATION_ID_PROD → Your business location ID
   - SQUARE_WEBHOOK_SIGNATURE_KEY_PROD → Production webhook key

### How It Works

The configuration now checks for production secrets first:
- **If production secrets exist** → Uses production Square API
- **If no production secrets** → Falls back to sandbox

### Benefits

- **No caching issues** - unique names bypass Replit environment variable cache
- **Dual environment support** - can switch between sandbox and production
- **Production safety** - sandbox remains available for testing
- **Immediate activation** - production mode activates as soon as you add the _PROD secrets

### Verification

After adding production secrets, you'll see in the logs:
```
🏪 Using PRODUCTION Square credentials (unique secrets)
🔧 Square Config: Location=YOUR_PROD_LOCATION, App=sq0idp-...
```

This solution eliminates the Replit caching problem that prevented production credentials from being recognized.