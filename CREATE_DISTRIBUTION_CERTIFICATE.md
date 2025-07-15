# Create iOS Distribution Certificate

## Current Situation
You have **Development** certificates but need an **iOS Distribution** certificate for App Store builds.

## Option 1: Create via Apple Developer Portal (Recommended)

### Step 1: Go to Apple Developer Portal
1. Visit: https://developer.apple.com/account/resources/certificates/list
2. Click "+" to create new certificate

### Step 2: Select Certificate Type
1. Choose "iOS Distribution" 
2. Click "Continue"

### Step 3: Create Certificate Signing Request (CSR)
On your Mac:
1. Open **Keychain Access**
2. Menu: **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
3. Fill in:
   - **User Email Address**: Your Apple ID email
   - **Common Name**: Your name or company
   - **CA Email**: Leave empty
   - Select: **Save to disk**
4. Save as `CertificateSigningRequest.certSigningRequest`

### Step 4: Upload CSR
1. Upload the `.certSigningRequest` file
2. Click "Continue"
3. Download the certificate (`.cer` file)

### Step 5: Install Certificate
1. Double-click the downloaded `.cer` file
2. It will install in your Keychain

## Option 2: Let GitHub Actions Create It Automatically

The workflow I created (`ios-development-first.yml`) will attempt to automatically create the Distribution certificate using your App Store Connect API credentials.

### How it works:
1. **Builds for Development first** (uses your existing certificates)
2. **Attempts Distribution build** with `-allowProvisioningUpdates`
3. **Apple automatically creates** Distribution certificate if needed

## Option 3: Manual API Creation

If you want to create it via API (advanced):

```bash
# This requires complex JWT token creation with your API key
# The GitHub Actions workflow handles this automatically
```

## Recommended Approach

Try the **"iOS Development Build First"** workflow first. It will:
- ✅ Build successfully with your existing Development certificates
- ✅ Attempt to create Distribution certificate automatically
- ✅ Show you exactly what certificates are available

If that doesn't work, create the Distribution certificate manually via Apple Developer Portal (Option 1).

## After Creating Distribution Certificate

Once you have the Distribution certificate, the regular iOS build workflows will work properly for App Store distribution and TestFlight uploads.