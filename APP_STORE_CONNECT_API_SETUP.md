# App Store Connect API Setup Guide

## Required GitHub Secrets

You need to set up 3 secrets in your GitHub repository for automatic certificate management:

### 1. APPSTORE_ISSUER_ID
**What it is**: Your App Store Connect API issuer identifier

**How to get it**:
1. Go to: https://appstoreconnect.apple.com/access/integrations/api
2. Sign in with your Apple Developer account
3. Look for "Issuer ID" at the top of the page
4. Copy the UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

### 2. APPSTORE_API_KEY_ID  
**What it is**: Your App Store Connect API key identifier

**How to get it**:
1. On the same page (App Store Connect API)
2. Click "Generate API Key" or use existing key
3. Give it a name like "GitHub Actions iOS Build"
4. Select role: "App Manager" (minimum required)
5. Copy the "Key ID" (format: XXXXXXXXXX)

### 3. APPSTORE_API_PRIVATE_KEY
**What it is**: The private key content for API authentication

**How to get it**:
1. After creating the API key, download the .p8 file
2. Open the .p8 file in a text editor
3. Copy the entire content INCLUDING the header and footer:
   ```
   -----BEGIN PRIVATE KEY-----
   [key content]
   -----END PRIVATE KEY-----
   ```

## Setting Up GitHub Secrets

1. Go to your repository: https://github.com/luca0405/bean-stalker-app2/settings/secrets/actions

2. Click "New repository secret" for each:
   - **Name**: `APPSTORE_ISSUER_ID`, **Value**: Your issuer ID
   - **Name**: `APPSTORE_API_KEY_ID`, **Value**: Your key ID  
   - **Name**: `APPSTORE_API_PRIVATE_KEY`, **Value**: Your .p8 file content

## Verification

After setting up the secrets, the automatic workflow will:
- ✅ Download certificates automatically from Apple
- ✅ Download provisioning profiles automatically  
- ✅ Build and sign your app
- ✅ Upload to TestFlight

## Benefits of This Approach

- **No manual certificate management** - Apple handles everything
- **Always up-to-date certificates** - Downloaded fresh each build
- **Secure** - Uses official Apple API authentication
- **Simpler setup** - Only 3 secrets instead of 6
- **Works across team members** - No personal certificates needed

## Troubleshooting

**API Key Not Working?**
- Ensure the key has "App Manager" role or higher
- Check that Bundle ID `com.beanstalker.member` is registered in your Apple Developer account
- Verify the key hasn't expired (keys last 1 year)

**Build Still Failing?**
- Check that your Apple Developer account is in good standing
- Ensure you have an active Apple Developer Program membership
- Verify the Bundle ID exists in App Store Connect

Once you've set up these 3 secrets, run the "iOS Build - Automatic Certificate Management" workflow.