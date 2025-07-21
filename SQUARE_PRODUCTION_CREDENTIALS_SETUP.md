# How to Add Square Production Credentials in Replit

## Step-by-Step Guide

### 1. Access Replit Secrets Panel
- In your Replit project, look for the **🔒 Secrets** tab in the left sidebar
- Or go to **Tools** → **Secrets** in the top menu

### 2. Add Your Production Square Credentials

Replace your current sandbox secrets with these production ones:

#### Update These Existing Secrets:
```
SQUARE_ACCESS_TOKEN
SQUARE_APPLICATION_ID  
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
```

#### Where to Get Production Credentials:

**From Your Square Dashboard (Live Account):**

1. **SQUARE_ACCESS_TOKEN**
   - Go to **Square Dashboard** → **Apps & Services** → **Developer Dashboard**
   - Select your **production application**
   - Go to **OAuth** tab → **Production Access Token**
   - Copy the token (starts with `sq0atp-`)

2. **SQUARE_APPLICATION_ID**
   - Same location as above
   - Copy **Application ID** (starts with `sq0idp-`)

3. **SQUARE_LOCATION_ID** 
   - Go to **Square Dashboard** → **Account & Settings** → **Locations**
   - Copy the **Location ID** for your business

4. **SQUARE_WEBHOOK_SIGNATURE_KEY**
   - In **Developer Dashboard** → your app → **Webhooks**
   - Set webhook URL: `https://member.beanstalker.com.au/api/square/webhook`
   - Copy the **Signature Key**

### 3. Update Secrets in Replit

In the Secrets panel, update each value:

```
Key: SQUARE_ACCESS_TOKEN
Value: sq0atp-YOUR_PRODUCTION_TOKEN_HERE

Key: SQUARE_APPLICATION_ID  
Value: sq0idp-YOUR_PRODUCTION_APP_ID_HERE

Key: SQUARE_LOCATION_ID
Value: YOUR_ACTUAL_LOCATION_ID_HERE

Key: SQUARE_WEBHOOK_SIGNATURE_KEY
Value: YOUR_PRODUCTION_WEBHOOK_KEY_HERE
```

### 4. Restart Your Application

After updating the secrets:
- The application will automatically restart
- Bean Stalker will now use production Square API
- **Real payments will be processed**

### 5. Test Production Setup

1. **Small Test Order**: Place a $1-2 order to verify
2. **Check Square Dashboard**: Verify real transaction appears
3. **Kitchen Display**: Confirm orders show in production Square for Restaurants
4. **Credit Purchase**: Test with small credit amount first

## Important Notes

⚠️ **Production Environment Warning**:
- All payments will be **real money**
- Customers will be **actually charged**
- Orders will appear in your **live Square for Restaurants**
- Test carefully before announcing to customers

✅ **Ready for Production**:
- Your Bean Stalker app code is already production-ready
- Just needs the credential update
- All integration features will work with live Square API

The Secrets panel is the secure way to store your production API keys without exposing them in code.