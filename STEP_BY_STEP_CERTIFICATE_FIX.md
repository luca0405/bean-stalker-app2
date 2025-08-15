# Step-by-Step Certificate Fix for Apple Wallet

## STEP 1: Clean Up Current Certificate (2 minutes)

1. **Open Keychain Access**
   - Applications → Utilities → Keychain Access

2. **Delete Current Certificate**
   - Find your "Pass Type ID: pass.com.beanstalker..." certificate
   - Right-click → Delete
   - Go to Keychain Access menu → Empty Trash

## STEP 2: Create New Certificate Request (3 minutes)

1. **Start Certificate Request**
   - Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority

2. **Fill Form - CRITICAL SETTINGS:**
   - User Email Address: `your-apple-developer-email@domain.com`
   - Common Name: `Bean Stalker` or your name
   - CA Email Address: Leave blank
   - Request is: **"Saved to disk"** AND **"Let me specify key pair information"** ← MUST CHECK THIS!

3. **Click Continue**

4. **Key Pair Information:**
   - Key Size: **2048 bits**
   - Algorithm: **RSA**

5. **Save File**
   - Save as: `BeanStalkerPassCert.certSigningRequest`
   - Location: Downloads folder

## STEP 3: Create New Pass Type ID (5 minutes)

1. **Go to Apple Developer Portal**
   - Open: https://developer.apple.com/account/resources/certificates
   - Sign in with your Apple Developer account

2. **Create Certificate**
   - Click the **"+"** button (Add new certificate)
   - Under "Services" section, select **"Pass Type ID"**
   - Click **Continue**

3. **Upload Certificate Request**
   - Click **"Choose File"**
   - Select your `BeanStalkerPassCert.certSigningRequest` file
   - Click **Continue**

4. **Download Certificate**
   - Click **"Download"**
   - Save the `.cer` file to Downloads

## STEP 4: Install & Verify (3 minutes)

1. **Install Certificate**
   - Double-click the downloaded `.cer` file
   - It should automatically open Keychain Access
   - Choose **"login"** keychain (not System)

2. **Verify Installation**
   - In Keychain Access, find your new Pass Type ID certificate
   - It should show as **"This certificate is valid"** (green checkmark)
   - Click the dropdown arrow - you should see a private key underneath

## STEP 5: Export Certificate + Private Key (3 minutes)

1. **Select Both Items**
   - In Keychain Access, click the dropdown arrow next to your certificate
   - Hold **Cmd** and click both the certificate AND the private key
   - Both should be selected (highlighted)

2. **Export**
   - Right-click → **"Export 2 items"**
   - File format: **"Personal Information Exchange (.p12)"**
   - Save as: `bean_stalker_pass_cert.p12`
   - Location: Downloads

3. **Set Password**
   - Enter a strong password (remember this!)
   - Example: `BeanStalker2025!`
   - Confirm password

## STEP 6: Get Apple WWDR Certificate (2 minutes)

1. **Download WWDR Certificate**
   - Go to: https://developer.apple.com/certificationauthority/AppleWWDRCA.cer
   - Save to Downloads

2. **Install WWDR Certificate**
   - Double-click `AppleWWDRCA.cer`
   - Install in "login" keychain

3. **Export WWDR as PEM**
   - In Keychain Access, find "Apple Worldwide Developer Relations Certification Authority"
   - Right-click → Export
   - Format: **"Privacy Enhanced Mail (.pem)"**
   - Save as: `wwdr.pem`

## STEP 7: Get Your Team ID (1 minute)

1. **Go to Membership Page**
   - Visit: https://developer.apple.com/account/#/membership
   - Find your **Team ID** (10-character code like "ABC123DEFG")
   - Copy this value

## STEP 8: Upload to Replit (5 minutes)

1. **Upload Files**
   - In Replit, drag and drop these files to the root directory:
     - `bean_stalker_pass_cert.p12`
     - `wwdr.pem`

2. **Configure Replit Secrets**
   - Go to Replit Secrets panel
   - Add these 5 secrets:

```
APPLE_WALLET_CERT_PATH=/home/runner/bean_stalker_pass_cert.p12
APPLE_WALLET_KEY_PATH=/home/runner/bean_stalker_pass_cert.p12
APPLE_WALLET_WWDR_CERT_PATH=/home/runner/wwdr.pem
APPLE_TEAM_ID=ABC123DEFG
APPLE_WALLET_CERT_PASSWORD=BeanStalker2025!
```

Replace `ABC123DEFG` with your actual Team ID and `BeanStalker2025!` with your actual password.

## STEP 9: Test Configuration

Once everything is uploaded, I'll test the configuration with:
```bash
curl -X POST http://localhost:5000/api/test-apple-wallet
```

## Need Help?

Start with **Step 1** and let me know if you get stuck at any point. The most critical step is **Step 2** - making sure you check "Let me specify key pair information" when creating the certificate request.

Ready to begin? Start with Step 1 and work through each step in order.