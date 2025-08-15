# Create .p12 Bundle and Complete Setup

## Step 1: Create .p12 Certificate Bundle

In Terminal, run:
```bash
cd ~/Downloads
openssl pkcs12 -export -out bean_stalker_pass_cert.p12 \
  -inkey bean_stalker_pass_private.pem \
  -in bean_stalker_pass.cer \
  -name "Bean Stalker Pass Certificate"
```

When prompted:
- **Enter Export Password**: Create a strong password (e.g., `BeanStalker2025!`)
- **Verify Export Password**: Enter the same password again
- **Remember this password** - you'll need it for Replit Secrets

## Step 2: Download Apple WWDR Certificate

```bash
cd ~/Downloads
curl -o AppleWWDRCA.cer https://developer.apple.com/certificationauthority/AppleWWDRCA.cer
openssl x509 -inform DER -outform PEM -in AppleWWDRCA.cer -out wwdr.pem
```

These commands will:
1. Download the Apple WWDR certificate (.cer format)
2. Convert it to PEM format that our server can use

## Step 3: Verify All Files

Check you have all required files:
```bash
ls -la bean_stalker_pass_cert.p12 wwdr.pem
```

You should see:
- `bean_stalker_pass_cert.p12` (your certificate + private key bundle)
- `wwdr.pem` (Apple WWDR certificate in PEM format)

## Step 4: Get Your Apple Team ID

1. Go to: https://developer.apple.com/account/#/membership
2. Find your **Team ID** (10-character code like "ABC123DEFG")
3. Copy this value

## Ready for Upload

Once you have:
- ✅ `bean_stalker_pass_cert.p12`
- ✅ `wwdr.pem`  
- ✅ Your Team ID
- ✅ The password you set for the .p12 file

We can upload these to Replit and configure the Apple Wallet integration.