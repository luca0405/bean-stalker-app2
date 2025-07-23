# RevenueCat Dashboard Troubleshooting

## Issue: Still "Found 0 Products" After Creating Offering

If you've created the "default" offering with all 4 products but still get "Found 0 products", there are several possible causes:

## Troubleshooting Steps

### 1. Verify Offering Configuration
In RevenueCat Dashboard → Offerings:
- [ ] Offering ID is exactly: `default` (lowercase)
- [ ] Offering contains all 4 packages
- [ ] Each package is properly configured with correct product IDs

### 2. Check Product Status
In RevenueCat Dashboard → Product Catalog:
- [ ] All 4 products show "Active" status (not "Missing Metadata")
- [ ] Product IDs exactly match App Store Connect

### 3. App Store Connect Verification  
In App Store Connect → Features → In-App Purchases:
- [ ] All 4 products exist: com.beanstalker.credit25, credit50, credit100, membership69
- [ ] Products are "Ready to Submit" status
- [ ] Bundle ID matches: com.beanstalker.member

### 4. RevenueCat App Configuration
In RevenueCat Dashboard → Apps:
- [ ] iOS app is configured with bundle ID: com.beanstalker.member
- [ ] App Store Connect integration is properly set up
- [ ] API key matches what's in GitHub secrets

### 5. SDK Configuration Issues
Common problems:
- [ ] Offering might be named something other than "default"
- [ ] Products might be in wrong app configuration
- [ ] API key might be for wrong project/app

## Diagnostic Tool Enhancement
The updated diagnostic will now show detailed RevenueCat information including:
- Total number of offerings found
- Names of all available offerings  
- Packages in each offering
- Product IDs for each package

## Expected Output After Fix
Once properly configured, diagnostic should show:
```
Total offerings: 1
Current offering: default  
Available offerings: default
Current offering packages: 4
  1. credit_25 → com.beanstalker.credit25
  2. credit_50 → com.beanstalker.credit50  
  3. credit_100 → com.beanstalker.credit100
  4. membership → com.beanstalker.membership69
```

## Alternative Solutions

### Option 1: Check Offering Name
If you created offering with different name:
- SDK looks for "default" offering specifically
- Rename your offering to "default" or update SDK code

### Option 2: Force Refresh RevenueCat
- Products might be cached
- Try logging out/in to RevenueCat Dashboard
- Wait 5-10 minutes for changes to propagate

### Option 3: Verify Bundle ID Match
Most common issue:
- RevenueCat app bundle ID: com.beanstalker.member
- App Store Connect bundle ID: must match exactly
- Any mismatch will cause 0 products found