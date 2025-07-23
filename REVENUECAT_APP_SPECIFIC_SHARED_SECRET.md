# RevenueCat App-Specific Shared Secret Setup

## Critical Issue Identified

The RevenueCat troubleshooting guide confirms that **missing App-Specific Shared Secret can prevent products and offerings from being fetched in your app**.

This is very likely the root cause of your "0 products" issue.

## Step 1: Get App-Specific Shared Secret from App Store Connect

1. Go to **App Store Connect** (https://appstoreconnect.apple.com)
2. Select your **Bean Stalker** app (com.beanstalker.member)
3. Go to **App Information** → **App Information** section
4. Find **"App-Specific Shared Secret"**
5. If it doesn't exist, click **"Generate"** to create one
6. Copy the generated secret (should be 32 characters)

## Step 2: Add to RevenueCat Dashboard

1. Go to **RevenueCat Dashboard** → **Project Settings** → **Apps**
2. Select your **Bean Stalker** app
3. Go to the **App Store Connect** section
4. Find **"App Store Connect App-Specific Shared Secret"** field
5. Paste the secret from Step 1
6. Save the configuration

## Step 3: Add In-App Purchase Key (if missing)

While you're there, also verify the **In-App Purchase Key** is uploaded:
1. In the same App Store Connect section
2. Upload your **In-App Purchase Key** (.p8 file) if not already there

## Expected Result

Once both secrets are configured:
- RevenueCat should be able to validate IAP purchases
- Your diagnostic should show 4 products instead of 0
- The "default" offering should work properly
- IAP purchases should process correctly

## Why This Matters

The App-Specific Shared Secret is required for:
- Validating App Store receipts
- Fetching product information from Apple
- Processing subscription and purchase data
- Enabling RevenueCat to communicate with App Store Connect

This is the missing piece that explains why your offering configuration looks perfect but products aren't loading in the app.

## Next Steps

1. Get the App-Specific Shared Secret from App Store Connect
2. Add it to RevenueCat Dashboard
3. Test the diagnostic again in TestFlight
4. Should see 4 products loaded successfully