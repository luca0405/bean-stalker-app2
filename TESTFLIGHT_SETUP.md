# TestFlight Setup Guide for Bean Stalker

## Overview
This guide sets up automated iOS builds using GitHub Actions that compile your app in the cloud and distribute it via TestFlight - no local Xcode needed!

## Prerequisites

### 1. Apple Developer Account
- Paid Apple Developer Program membership ($99/year)
- Access to App Store Connect

### 2. Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in details:
   - **Name**: Bean Stalker
   - **Bundle ID**: `com.beanstalker.member`
   - **SKU**: beanstalker-app
   - **Language**: English

## Required Secrets Setup

### Step 1: App Store Connect API Key
1. Go to App Store Connect → Users and Access → Keys
2. Click "Generate API Key"
3. Download the `.p8` file
4. Note the Key ID and Issuer ID

### Step 2: iOS Distribution Certificate
1. Go to Apple Developer → Certificates
2. Create "iOS Distribution" certificate
3. Download the `.cer` file
4. Convert to `.p12`:
   ```bash
   # On Mac with Keychain Access
   # Import .cer file to Keychain
   # Export as .p12 with password
   ```

### Step 3: Provisioning Profile
1. Go to Apple Developer → Profiles
2. Create "App Store" provisioning profile
3. Select your Bundle ID (`com.beanstalker.member`)
4. Download the `.mobileprovision` file

### Step 4: GitHub Secrets
Add these secrets to your GitHub repository:

1. **APPSTORE_ISSUER_ID**: From App Store Connect API Key
2. **APPSTORE_KEY_ID**: From App Store Connect API Key  
3. **APPSTORE_PRIVATE_KEY**: Contents of the `.p8` file (base64 encoded)
4. **IOS_DISTRIBUTION_CERT**: Base64 encoded `.p12` certificate
5. **IOS_CERT_PASSWORD**: Password for the `.p12` file

## How to Add GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret above

## Build Process

Once secrets are configured:

1. **Push to main branch** triggers automatic build
2. **GitHub Actions** compiles iOS app in the cloud
3. **TestFlight** receives the build automatically
4. **Install on iPhone** via TestFlight app

## Testing Features

With TestFlight, you can test:
- ✅ **Real In-App Purchases** (sandbox mode)
- ✅ **Face ID/Touch ID** biometric authentication
- ✅ **Push notifications**
- ✅ **All native Capacitor features**
- ✅ **RevenueCat integration**

## Manual Trigger

You can also trigger builds manually:
1. Go to GitHub Actions tab
2. Select "iOS Build and TestFlight Upload"
3. Click "Run workflow"

## First Build

After setup, the first build will:
1. Take 10-15 minutes to complete
2. Appear in TestFlight within 1 hour
3. Send invitation email to your Apple ID
4. Allow installation on your iPhone via TestFlight app

## Cost
- **GitHub Actions**: Free tier includes 2000 minutes/month
- **Apple Developer**: $99/year (required for TestFlight)
- **TestFlight**: Free with Apple Developer account

## Support
If builds fail, check GitHub Actions logs for detailed error messages. Common issues include certificate expiration or incorrect bundle IDs.