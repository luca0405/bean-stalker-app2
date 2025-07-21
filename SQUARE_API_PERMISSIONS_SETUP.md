# Square API Permissions Setup for Bean Stalker

## Required Permissions (Scopes)

Bean Stalker needs these specific API permissions to work properly:

### Core Permissions
- **`MERCHANT_PROFILE_READ`** - Read business information and locations
- **`ORDERS_READ`** - Read order data 
- **`ORDERS_WRITE`** - Create and update orders
- **`PAYMENTS_READ`** - Read payment information
- **`PAYMENTS_WRITE`** - Process payments and refunds

### Optional (Recommended)
- **`ITEMS_READ`** - Read catalog items (if using Square inventory)
- **`INVENTORY_READ`** - Read inventory levels
- **`CUSTOMERS_READ`** - Read customer information
- **`CUSTOMERS_WRITE`** - Create and update customers

## How to Set Up Permissions

### Step 1: Access Your Application
1. Go to **Square Developer Dashboard** (developer.squareup.com)
2. Sign in with your Square business account
3. Click on your **production application**

### Step 2: Configure Scopes
1. Look for **"OAuth"** or **"Scopes"** or **"Permissions"** tab
2. Find the **"Production Scopes"** section
3. Enable these checkboxes:
   - ☑️ `MERCHANT_PROFILE_READ`
   - ☑️ `ORDERS_READ`
   - ☑️ `ORDERS_WRITE`
   - ☑️ `PAYMENTS_READ`
   - ☑️ `PAYMENTS_WRITE`

### Step 3: Generate New Access Token
After updating permissions:
1. Go to **"Credentials"** tab
2. Click **"Replace"** next to Production Access Token
3. Generate a new token with updated permissions
4. Copy the new token (starts with `sq0atp-`)

### Step 4: Update Bean Stalker
Update your Replit secret:
```
SQUARE_ACCESS_TOKEN_PROD → NEW_TOKEN_WITH_PERMISSIONS
```

## Common Permission Issues

### Missing MERCHANT_PROFILE_READ
**Error**: Cannot read locations or business info
**Solution**: Enable `MERCHANT_PROFILE_READ` scope

### Missing ORDERS_WRITE  
**Error**: Cannot create orders in Square
**Solution**: Enable `ORDERS_WRITE` scope

### Missing PAYMENTS_WRITE
**Error**: Cannot process credit purchases
**Solution**: Enable `PAYMENTS_WRITE` scope

## Alternative: Personal Access Token

If OAuth scopes are complex, try a **Personal Access Token**:

1. In your Square application dashboard
2. Look for **"Personal Access Tokens"** section
3. Click **"Generate New Token"**
4. Personal tokens typically have broader permissions
5. Use this token for Bean Stalker

## Verification Steps

After setting up permissions:
1. Update `SQUARE_ACCESS_TOKEN_PROD` with new token
2. Restart Bean Stalker app
3. Test API connection: `/api/debug/square-test`
4. Should see successful response instead of 401 error

## What Each Permission Does

- **MERCHANT_PROFILE_READ**: Allows reading your business locations and info
- **ORDERS_READ**: Lets Bean Stalker read existing orders
- **ORDERS_WRITE**: Lets Bean Stalker create new orders in Square
- **PAYMENTS_READ**: Allows reading payment transaction details  
- **PAYMENTS_WRITE**: Enables processing credit purchases through Square

These permissions ensure Bean Stalker can fully integrate with your Square for Restaurants system.