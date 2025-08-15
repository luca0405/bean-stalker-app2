# GitHub Secrets Setup for Apple Wallet Integration

## Required GitHub Secrets

Add these secrets to your GitHub repository for the Apple Wallet integration to work in CI/CD:

### 1. APPLE_TEAM_ID
- **Value**: `A43TZWNYA3`
- **Description**: Your Apple Developer Team ID

### 2. APPLE_WALLET_CERT_PASSWORD  
- **Value**: The password you created when exporting the .p12 certificate
- **Description**: Password for the PKCS#12 certificate bundle

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** tab
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact names above

## Certificate Files for CI/CD

The certificate files (`bean_stalker_pass_cert.p12` and `wwdr.pem`) are already uploaded to your Replit project in the `/certs` folder. For GitHub Actions, you have two options:

### Option A: Include Certificate Files in Repository (Recommended)
- Keep the certificate files in your `/certs` folder
- They will be automatically available during the build process

### Option B: Store as Base64 Secrets (More Secure)
If you prefer maximum security, you can store the certificates as base64-encoded secrets:

```bash
# On your local machine, create base64 versions
base64 -i certs/bean_stalker_pass_cert.p12 > cert.p12.base64
base64 -i certs/wwdr.pem > wwdr.pem.base64
```

Then add these as GitHub secrets:
- `APPLE_WALLET_CERT_BASE64`: Content of cert.p12.base64
- `APPLE_WALLET_WWDR_BASE64`: Content of wwdr.pem.base64

## Updated GitHub Workflow

I've updated your working `ios-simple-fix.yml` workflow to include the Apple Wallet environment variables during the build process. The workflow now includes:

1. Environment variables in the Build step:
```yaml
env:
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  APPLE_WALLET_CERT_PASSWORD: ${{ secrets.APPLE_WALLET_CERT_PASSWORD }}
```

2. Verification checks that display the status of Apple Wallet secrets during the build process

## Testing

After adding the secrets, your iOS app builds will have full Apple Wallet functionality, allowing users to add credit balance passes to their iOS Wallet during TestFlight testing.