# How to Get Your Provisioning Profile

## Option 1: Apple Developer Portal (Recommended)

### Step 1: Access Apple Developer
1. Go to: https://developer.apple.com/account/resources/profiles/list
2. Sign in with your Apple Developer account

### Step 2: Find Your Profile
1. Look for profiles with Bundle ID: `com.beanstalker.member`
2. Profile Type should be: "iOS App Store" or "App Store Distribution"
3. Status should be: "Active"

### Step 3: Download Profile
1. Click on your Bean Stalker profile
2. Click "Download" button
3. Save the `.mobileprovision` file

### Step 4: Convert to Base64
Open Terminal and run:
```bash
base64 -i YourProfile.mobileprovision | pbcopy
```
This copies the base64 content to your clipboard.

### Step 5: Update GitHub Secret
1. Go to: https://github.com/luca0405/bean-stalker-app2/settings/secrets/actions
2. Find `IOS_PROVISIONING_PROFILE`
3. Click "Update" (pencil icon)
4. Paste the base64 content
5. Click "Update secret"

## Option 2: Xcode (Alternative)

### If you can't find it online:
1. Open Xcode
2. Xcode → Preferences → Accounts
3. Select your Apple ID
4. Click "Download Manual Profiles"
5. Go to: `~/Library/MobileDevice/Provisioning Profiles/`
6. Find profile with `com.beanstalker.member`
7. Convert to base64 as above

## Verify Your Profile

### Check Profile Details:
After downloading, verify it contains:
- **Bundle ID**: `com.beanstalker.member`
- **Team**: A43TZWNYA3
- **Type**: Distribution/App Store
- **Status**: Not expired

### Quick Check Command:
```bash
security cms -D -i YourProfile.mobileprovision | grep -A5 "application-identifier"
```

## Common Issues

### Profile Not Found:
- Check Bundle ID matches exactly: `com.beanstalker.member`
- Ensure you're looking in Distribution profiles, not Development
- Verify your Apple Developer account has access

### Profile Expired:
- Create new App Store Distribution profile
- Use Bundle ID: `com.beanstalker.member`
- Include your Distribution certificate

## Quick Links:
- **Profiles**: https://developer.apple.com/account/resources/profiles/list
- **Certificates**: https://developer.apple.com/account/resources/certificates/list
- **Identifiers**: https://developer.apple.com/account/resources/identifiers/list

Once you update the `IOS_PROVISIONING_PROFILE` secret with a fresh profile, your GitHub Actions build should complete successfully.