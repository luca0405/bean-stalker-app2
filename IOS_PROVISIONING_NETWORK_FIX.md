# iOS Provisioning Profile Network Capability Fix

## Issue Identified
The Bean Stalker iOS app provisioning profile is missing network-related capabilities required for external API calls to `member.beanstalker.com.au`.

## Current Capabilities (Missing Network Access)
- Access Wi-Fi Information ✅
- Apple Pay Payment Processing ✅
- Communication Notifications ✅
- Data Protection ✅
- Default Carrier Messaging App ✅
- Default Messaging App ✅
- Device Discovery Pairing Access ✅
- In-App Purchase ✅
- Push Notifications ✅
- Sign In with Apple ✅

## Required Additional Capabilities

### Option 1: Add Network Extensions Capability
1. Go to Apple Developer Portal → Certificates, Identifiers & Profiles
2. Find your App ID: `com.beanstalker.member`
3. Edit the App ID configuration
4. Add **"Network Extensions"** capability
5. Regenerate the provisioning profile

### Option 2: Add App Transport Security Exceptions
1. In your App ID capabilities, ensure **"App Transport Security"** is properly configured
2. Add custom domain exceptions for `member.beanstalker.com.au`

### Option 3: Enable "Networking" Capability (if available)
1. Look for general "Networking" or "Internet Access" capability
2. Enable for external API access

## Fix Steps

1. **Update App ID:**
   ```
   App ID: com.beanstalker.member
   Add Capability: Network Extensions
   ```

2. **Regenerate Provisioning Profile:**
   - Profile Name: Beanstalker Membership App
   - Include updated App ID with network capabilities
   - Download new .mobileprovision file

3. **Update GitHub Secrets:**
   - Replace provisioning profile in GitHub Actions
   - Ensure new profile includes network access

## Technical Root Cause
iOS apps require explicit network capabilities in their provisioning profile to make external HTTPS requests. Without proper network entitlements, all fetch() and HTTP requests fail with "Load failed" errors, regardless of the networking code implementation.

The native HTTP implementation we added will work once the provisioning profile includes network access capabilities.

## Expected Result
After adding network capabilities and regenerating the provisioning profile:
- Network Test should show all ✅ green results
- Authentication will work properly
- All API calls to member.beanstalker.com.au will succeed