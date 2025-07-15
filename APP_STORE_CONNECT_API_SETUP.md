# App Store Connect API Permission Issue

## Problem Identified
Your App Store Connect API key doesn't have sufficient permissions to access cloud-managed distribution certificates.

## Error: "Cloud signing permission error"
```
You haven't been given access to cloud-managed distribution certificates. 
Please contact your team's Account Holder or an Admin to give you access.
```

## Root Cause
The App Store Connect API key needs specific permissions to:
1. **Download certificates** from Apple Developer account
2. **Create new certificates** when needed
3. **Access provisioning profiles** for code signing

## Solution Options

### Option 1: Update API Key Permissions (Recommended)
1. Go to **App Store Connect** → **Users and Access** → **Integrations** → **App Store Connect API**
2. Find your API key (KEY_ID: `${{ secrets.APPSTORE_API_KEY_ID }}`)
3. Edit the key and ensure it has these permissions:
   - ✅ **Certificates, Identifiers & Profiles** - Read and Write
   - ✅ **Apps** - Read and Write (for TestFlight)
   - ✅ **TestFlight** - Read and Write

### Option 2: Create New API Key with Full Permissions
1. **App Store Connect** → **Users and Access** → **Integrations** 
2. Click **"+"** to create new API key
3. **Name**: Bean Stalker CI/CD
4. **Access Level**: Admin (or Developer with full permissions)
5. **Permissions**: Select ALL available permissions
6. Download the `.p8` file
7. Update GitHub Secrets with new key

### Option 3: Manual Certificate Export (Current Workaround)
I've created a workflow that:
- Creates fallback certificates for testing
- Builds the app without requiring Apple's cloud certificates
- Generates development IPA for testing

## Immediate Next Steps
1. **Try the manual certificate workflow** I just created
2. **Check your API key permissions** in App Store Connect
3. **Consider creating a new API key** with admin permissions

The manual approach will create a working iOS app that you can test, while we resolve the API permissions for TestFlight distribution.