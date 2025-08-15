# Apple Certificate "Not Trusted" Issue Fix

## Problem: Certificate Shows "Not Trusted" Status

This happens when the certificate is installed without its matching private key.

## Solution: Re-create Certificate with Proper Key Association

### Step 1: Delete Current Certificate
1. **In Keychain Access**, find your Pass Type ID certificate
2. **Right-click → Delete** the untrusted certificate
3. **Empty Trash** in Keychain Access

### Step 2: Create New Certificate Request (Critical Step)
1. **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
2. **User Email**: Your Apple Developer email
3. **Common Name**: Your name or company name
4. **Request is**: Saved to disk AND "Let me specify key pair information"
5. **Key Size**: 2048 bits
6. **Algorithm**: RSA
7. **Save** the .certSigningRequest file

### Step 3: Create New Pass Type ID in Apple Developer
1. **Go to**: https://developer.apple.com/account/resources/certificates
2. **Click +** to create new certificate
3. **Select**: Pass Type ID
4. **Upload** your .certSigningRequest file
5. **Download** the new certificate (.cer file)

### Step 4: Install New Certificate
1. **Double-click** the downloaded .cer file
2. **Install in Login keychain**
3. **Verify**: Certificate should now show as trusted with a dropdown arrow
4. **Export**: Select certificate + private key → Export as .p12

## Alternative: Use Existing Certificate from Another Mac

If you created this certificate on another Mac:
1. **Export from original Mac**: Certificate + private key as .p12
2. **Import on current Mac**: Double-click the .p12 file
3. **Enter password** used during export

## Quick Check: Is This Certificate Working?

After fixing, your certificate should:
- ✅ Show as "Trusted"
- ✅ Have a dropdown arrow revealing private key
- ✅ Allow export to .p12 format

## Immediate Alternative: Focus on SMS First

Since Apple Wallet setup requires certificate troubleshooting, let's implement Twilio SMS first:
- Instant SMS functionality
- No certificates needed
- Can add Apple Wallet later

Would you like to:
1. **Continue fixing certificates** (may take 15-30 minutes)
2. **Implement Twilio SMS first** (working in 5 minutes)
3. **Do both** (SMS now, Apple Wallet later)

Choose option 2 or 3 for immediate results.