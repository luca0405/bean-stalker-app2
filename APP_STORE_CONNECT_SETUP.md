# App Store Connect API Key Setup Issue

## Problem Identified
Your current GitHub Secrets use the "GitHub Actions iOS Build" key (TYXHD3B57H) which only has **"App Manager"** access. This doesn't include certificate management permissions.

## Your Available Keys:
- ✅ **TestFlight** (8G8SZCTK49) - **Admin access** - Can manage certificates
- ❌ **GitHub Actions iOS Build** (TYXHD3B57H) - **App Manager** - Cannot manage certificates  
- ✅ **RevenueCat** (LSSFSPRGV8) - **Admin access** - Can manage certificates

## Immediate Solution
I've created a workflow that uses your **TestFlight Admin key** (8G8SZCTK49) instead of the GitHub Actions key.

## Option 1: Update GitHub Secrets (Recommended)
If your current `APPSTORE_API_PRIVATE_KEY` secret contains the TestFlight Admin key:
1. **Run "iOS Build - Using TestFlight Admin Key"** workflow
2. This will use the TestFlight key ID (8G8SZCTK49) with Admin permissions

## Option 2: Create New GitHub Secret for TestFlight Key
If your secrets contain the GitHub Actions key instead:
1. Download the **TestFlight** key (.p8 file) from App Store Connect
2. Add new GitHub secret: `TESTFLIGHT_API_PRIVATE_KEY`
3. Update the workflow to use this new secret

## Option 3: Create New Admin API Key
If you want to keep using the GitHub Actions approach:
1. **App Store Connect** → **Users and Access** → **Integrations**
2. Click **"+"** to create new key
3. **Name**: "GitHub Actions iOS Build Admin"
4. **Access**: **Admin** (not App Manager)
5. Download the .p8 file
6. Replace your current `APPSTORE_API_PRIVATE_KEY` with this new key

## Why App Manager Doesn't Work
**App Manager** access only allows:
- App metadata management
- TestFlight uploads (after signing)

**Admin** access includes:
- Certificate management
- Provisioning profile access
- Code signing permissions

The "cloud signing permission error" happens because App Manager keys cannot download certificates for code signing.

## Next Steps
Try the **"iOS Build - Using TestFlight Admin Key"** workflow first. If your current secret contains the TestFlight key, this should work immediately.