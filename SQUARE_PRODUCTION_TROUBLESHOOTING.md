# Square Production Authentication Troubleshooting

## Current Status
✅ Production credentials detected correctly:
- Location ID: `LW166BYW0A6E0`
- Application ID: `sq0idp-bE0T8OG5OxpNMLZSqzDvFA`
- Access Token: Present but getting 401 Unauthorized

## Possible Issues & Solutions

### 1. Access Token Format
**Check**: Does your production access token start with `sq0atp-`?
- ✅ Production tokens start with: `sq0atp-`
- ❌ Sandbox tokens start with: `sandbox-sq0atb-`

**Solution**: Verify the token format in your Square Dashboard Credentials page.

### 2. Location Permissions
**Issue**: The access token might not have permission for location `LW166BYW0A6E0`

**Solution**: 
1. In Square Dashboard → **Account & Settings** → **Locations**
2. Verify location ID `LW166BYW0A6E0` exists and is active
3. Check if this is your primary business location

### 3. Application Permissions
**Issue**: The application might need additional API permissions

**Solution**: In Square Developer Dashboard:
1. Go to your application settings
2. Check **"Scopes"** or **"Permissions"** section
3. Ensure these permissions are enabled:
   - `ORDERS_READ`
   - `ORDERS_WRITE` 
   - `PAYMENTS_READ`
   - `PAYMENTS_WRITE`
   - `MERCHANT_PROFILE_READ`

### 4. Token Generation Method
**Issue**: Token might be generated incorrectly

**Solutions to Try**:

#### Option A: Personal Access Token
1. Square Dashboard → **Apps & Services** → **Developer Dashboard**
2. Select your application
3. Look for **"Personal Access Tokens"** section
4. Generate a new personal access token
5. Use this token for Bean Stalker

#### Option B: OAuth Access Token  
1. In your application's **OAuth** tab
2. Look for **"Production Access Token"**
3. This appears after merchant authorization
4. Copy this token if available

### 5. Account Type Verification
**Check**: Is this a verified Square business account?
- Personal Square accounts might have API limitations
- Business accounts have full API access

### 6. API Endpoint Testing
**Test**: Try a simple API call to verify authentication

```bash
curl -X GET \
  'https://connect.squareup.com/v2/locations' \
  -H 'Authorization: Bearer YOUR_PRODUCTION_TOKEN' \
  -H 'Square-Version: 2023-10-18'
```

## Recommended Next Steps

1. **Verify token format** (starts with `sq0atp-`)
2. **Check location permissions** in Square Dashboard
3. **Generate a fresh personal access token**
4. **Update SQUARE_ACCESS_TOKEN_PROD** with new token
5. **Test API connectivity** again

## Alternative: Use Different Location
If location `LW166BYW0A6E0` has permission issues:
1. Find your primary location ID in Square Dashboard
2. Update `SQUARE_LOCATION_ID_PROD` with the correct location
3. Ensure the access token has permissions for that location

## Production Checklist
- [ ] Token starts with `sq0atp-`
- [ ] Location ID exists and is active
- [ ] Application has required API permissions
- [ ] Business account (not personal) 
- [ ] Fresh token generated recently
- [ ] Token has access to the specific location

Once these are verified, the 401 authentication error should be resolved.