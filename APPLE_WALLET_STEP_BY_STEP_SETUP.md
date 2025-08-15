# Apple Wallet Certificate Setup - Step by Step

## Current Problem: Certificate Shows "Not Trusted"

Your Pass Type ID certificate is showing as "not trusted" because it was installed without the matching private key. Here's how to fix it:

## Step 1: Delete Current Certificate

1. **Open Keychain Access** (Applications → Utilities → Keychain Access)
2. **Find your Pass Type ID certificate** (looks like "Pass Type ID: pass.com.beanstalker...")
3. **Right-click → Delete**
4. **Empty Trash** in Keychain Access (Keychain Access menu → Empty Trash)

## Step 2: Create New Certificate Request (CRITICAL)

1. **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
2. **Fill in details:**
   - User Email Address: Your Apple Developer email
   - Common Name: Your name or "Bean Stalker"
   - Request is: **Saved to disk AND "Let me specify key pair information"** ← IMPORTANT!
3. **Click Continue**
4. **Key Pair Information:**
   - Key Size: **2048 bits**
   - Algorithm: **RSA**
5. **Save** the .certSigningRequest file to Downloads

## Step 3: Create New Pass Type ID Certificate

1. **Go to Apple Developer Portal**: https://developer.apple.com/account/resources/certificates
2. **Click the + button** (Add new certificate)
3. **Select "Pass Type ID"** under Services section
4. **Continue**
5. **Upload your .certSigningRequest file** from Step 2
6. **Continue**
7. **Download** the new certificate (.cer file)

## Step 4: Install New Certificate Properly

1. **Double-click** the downloaded .cer file
2. **Choose "login" keychain** (not System)
3. **Enter your Mac password** when prompted
4. **Verify in Keychain Access:**
   - Certificate should show as **"This certificate is valid"**
   - Should have a **dropdown arrow** showing private key underneath

## Step 5: Export Certificate + Private Key

1. **In Keychain Access**, find your new Pass Type ID certificate
2. **Click the dropdown arrow** to reveal the private key
3. **Select BOTH certificate and private key** (Cmd+click both items)
4. **Right-click → Export 2 items**
5. **Format: Personal Information Exchange (.p12)**
6. **Save as: bean_stalker_pass_cert.p12**
7. **Set a strong password** and remember it!

## Step 6: Get Additional Required Files

### Download Apple WWDR Certificate:
1. **Go to**: https://developer.apple.com/certificationauthority/AppleWWDRCA.cer
2. **Download** and **double-click** to install in Keychain
3. **Export as .pem format:**
   ```bash
   # In Terminal:
   security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" -p > wwdr.pem
   ```

### Get Your Team ID:
1. **Go to**: https://developer.apple.com/account/#/membership
2. **Copy your Team ID** (10-character code like "ABC123DEFG")

## Step 7: Upload to Replit

1. **Upload your files** to Replit:
   - `bean_stalker_pass_cert.p12`
   - `wwdr.pem`

2. **Add to Replit Secrets:**
   - `APPLE_WALLET_CERT_PATH`: `/home/runner/bean_stalker_pass_cert.p12`
   - `APPLE_WALLET_KEY_PATH`: `/home/runner/bean_stalker_pass_cert.p12` (same file)
   - `APPLE_WALLET_WWDR_CERT_PATH`: `/home/runner/wwdr.pem`
   - `APPLE_TEAM_ID`: Your 10-character team ID
   - `APPLE_WALLET_CERT_PASSWORD`: Password you set for .p12 file

## Step 8: Test Integration

Once certificates are uploaded, test the integration:
```bash
curl -X POST "http://localhost:5000/api/test-apple-wallet" -H "Content-Type: application/json"
```

## Troubleshooting

### If certificate still shows "not trusted":
- Make sure you selected "Let me specify key pair information" in Step 2
- The private key must be created with the certificate request

### If export is still grayed out:
- Try creating the certificate request on the same Mac you're using
- Make sure the certificate request was created with key pair info

### If you see "Certificate not valid":
- Check that you're using the correct Apple Developer account
- Verify the Pass Type ID matches your app identifier

Let me know when you've completed these steps and we can test the Apple Wallet integration!