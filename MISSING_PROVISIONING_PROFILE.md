# Missing Provisioning Profile Secret

## Issue
Your GitHub Actions build is failing because the `IOS_PROVISIONING_PROFILE` secret is missing from your repository secrets.

## Required Action
You need to add one more secret to your GitHub repository:

### Add This Secret:
**Secret Name:** `IOS_PROVISIONING_PROFILE`  
**Secret Value:** Base64 encoded provisioning profile file

### How to Get the Provisioning Profile:

#### Method 1: Download from Apple Developer
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/profiles/list)
2. Find your "Bean Stalker Distribution" profile for `com.beanstalker.member`
3. Download the `.mobileprovision` file
4. Convert to base64: `base64 -i YourProfile.mobileprovision | pbcopy`
5. Add as `IOS_PROVISIONING_PROFILE` secret in GitHub

#### Method 2: Export from Xcode
1. Open Xcode
2. Window → Devices and Simulators
3. Select your device → Show Provisioning Profiles
4. Find "Bean Stalker Distribution" profile
5. Right-click → Show in Finder
6. Convert to base64: `base64 -i profile.mobileprovision | pbcopy`

### Add to GitHub:
1. Go to: https://github.com/luca0405/bean-stalker-app2/settings/secrets/actions
2. Click "New repository secret"
3. Name: `IOS_PROVISIONING_PROFILE`
4. Value: Paste the base64 content
5. Click "Add secret"

## Current Secrets Status:
✅ APPSTORE_ISSUER_ID  
✅ APPSTORE_KEY_ID  
✅ APPSTORE_PRIVATE_KEY  
✅ IOS_DISTRIBUTION_CERT  
✅ IOS_CERT_PASSWORD  
❌ IOS_PROVISIONING_PROFILE (Missing - add this one)

Once you add this secret, the GitHub Actions workflow will build successfully and upload to TestFlight automatically.