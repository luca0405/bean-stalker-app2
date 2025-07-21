# RevenueCat Configuration Diagnostic

## Checking Your Setup...

### ✅ Environment Configuration
- **RevenueCat API Key**: Configured and available
- **Bundle ID**: com.beanstalker.member (should match App Store Connect)

### 📋 RevenueCat Dashboard Checklist

To verify your configuration, please check these items in your RevenueCat Dashboard:

#### 1. App Configuration
**Go to RevenueCat Dashboard → Project Settings → Apps**
- [ ] iOS app configured with bundle ID: `com.beanstalker.member`
- [ ] App Store Connect integration enabled
- [ ] API key matches the one in Bean Stalker secrets

#### 2. App Store Connect Integration
**In RevenueCat Dashboard → Project Settings → App Store Connect**
- [ ] App Store Connect API key configured
- [ ] Issuer ID set correctly
- [ ] Key ID matches your App Store Connect API key
- [ ] "Sync purchases" enabled

#### 3. Products Configuration
**In RevenueCat Dashboard → Product catalog → Products**
- [ ] `com.beanstalker.credit25` - imported from App Store Connect
- [ ] `com.beanstalker.credit50` - imported from App Store Connect  
- [ ] `com.beanstalker.credit100` - imported from App Store Connect
- [ ] `com.beanstalker.membership69` - imported from App Store Connect
- [ ] All products show "Active" status

#### 4. Test Your API Key
Run this command in Bean Stalker to test the connection:
```bash
# This will test if your API key can fetch offerings
curl -H "Authorization: Bearer sk_YOUR_API_KEY" \
     https://api.revenuecat.com/v1/subscribers/test-user/offerings
```

### 🔧 Common Configuration Issues

#### Issue: Products not appearing
**Cause**: App Store Connect API not properly connected
**Solution**: 
1. Generate new App Store Connect API key with "Developer" role
2. Add key to RevenueCat with correct Issuer ID and Key ID
3. Enable "Sync purchases" in RevenueCat

#### Issue: "Product not found" errors
**Cause**: Product IDs don't match between App Store Connect and RevenueCat
**Solution**:
1. Verify bundle ID matches exactly: `com.beanstalker.member`
2. Check product IDs are identical in both platforms
3. Ensure products are in "Ready to Submit" or "Developer Action Needed" status

#### Issue: Purchases fail in sandbox
**Cause**: Sandbox test user configuration
**Solution**:
1. Create dedicated sandbox test user
2. Never sign into sandbox account in iOS Settings
3. Only use sandbox credentials during purchase flow

### 🧪 Live Test Results

Run this diagnostic in Bean Stalker app to check real-time configuration: