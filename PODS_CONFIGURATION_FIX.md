# CocoaPods Provisioning Profile Configuration Fix

## Issue Identified
The build is failing because CocoaPods targets (Capacitor, RevenueCat, etc.) are being assigned the "Beanstalker Membership App" provisioning profile when they should use automatic signing.

## Error Messages
```
Capacitor does not support provisioning profiles, but provisioning profile Beanstalker Membership App has been manually specified.
```

## Root Cause
When you set manual provisioning profiles in Xcode, it applies to ALL targets including CocoaPods dependencies that don't support provisioning profiles.

## Solution Required
Need to set provisioning profiles to "Automatic" for all CocoaPods targets while keeping manual/automatic for the main App target.

## Manual Fix (if needed)
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select each CocoaPods target (Capacitor, Pods-App, RevenueCat, etc.)
3. Go to Build Settings → Signing
4. Set "Provisioning Profile" to "Automatic"
5. Keep only the main "App" target with your provisioning profile

## Automated Fix
The GitHub Actions workflow will now use automatic signing for all targets to avoid this issue.