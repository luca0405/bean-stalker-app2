# Apple Wallet Quick Start Guide

## Current Status: No Certificates Configured

Your Apple Wallet integration needs proper certificates to generate wallet passes. Here's what you need to do:

## Quick Setup Steps

### 1. Fix Certificate Issue (15 minutes)

**The Problem**: Your current Pass Type ID certificate shows "not trusted" because it lacks the private key.

**The Solution**: Recreate the certificate properly:

1. **Delete Current Certificate**
   - Open Keychain Access → Find Pass Type ID certificate → Delete

2. **Create New Certificate Request**
   - Keychain Access → Certificate Assistant → Request Certificate...
   - ✅ **IMPORTANT**: Check "Let me specify key pair information"
   - Key Size: 2048 bits, Algorithm: RSA

3. **Create New Pass Type ID**
   - Apple Developer Portal → Certificates → + → Pass Type ID
   - Upload your certificate request → Download certificate

4. **Install & Export**
   - Double-click downloaded certificate → Install in Keychain
   - Select certificate + private key → Export as .p12

### 2. Upload Files to Replit (5 minutes)

**Upload these files:**
- `pass_cert.p12` (your exported certificate)
- `wwdr.pem` (Apple WWDR certificate)

**Add to Replit Secrets:**
```
APPLE_WALLET_CERT_PATH=/home/runner/pass_cert.p12
APPLE_WALLET_KEY_PATH=/home/runner/pass_cert.p12
APPLE_WALLET_WWDR_CERT_PATH=/home/runner/wwdr.pem
APPLE_TEAM_ID=ABC123DEFG
APPLE_WALLET_CERT_PASSWORD=your_p12_password
```

### 3. Test Configuration

Run this test to verify everything is working:
```bash
curl -X POST http://localhost:5000/api/test-apple-wallet
```

Expected result:
```json
{
  "configured": true,
  "status": "Ready for Apple Wallet pass generation"
}
```

## What Apple Wallet Does

Once configured, your Bean Stalker app will:
1. **Generate wallet passes** showing current credit balance
2. **Add to Apple Wallet** via native iOS integration
3. **Update balance** automatically via push notifications
4. **Display beautifully** in iOS Wallet app

## Alternative: Skip Apple Wallet (For Now)

If certificate setup is taking too long, you can:
1. **Disable Apple Wallet features** temporarily
2. **Focus on core app functionality** (ordering, payments)
3. **Add Apple Wallet later** when certificates are ready

Would you like to:
- **Fix certificates now** (follow detailed guide)
- **Skip Apple Wallet** and focus on other features
- **Need help with specific certificate step**?

Choose your preferred approach and I'll guide you through it!