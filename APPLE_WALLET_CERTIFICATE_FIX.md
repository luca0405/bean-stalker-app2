# Apple Wallet Certificate Export Fix

## Issue: Pass Type ID Certificate Export Grayed Out

This is a common macOS Keychain issue. Here are several solutions to export your Pass Type ID certificate.

## Solution 1: Export with Private Key (Recommended)

1. **Open Keychain Access**
   - Applications → Utilities → Keychain Access

2. **Find Your Pass Type ID Certificate**
   - Look for certificate named like: "Pass Type ID: pass.com.beanstalker.app"
   - Make sure it shows under "My Certificates" category

3. **Export Certificate + Private Key Together**
   - Click the dropdown arrow next to your certificate
   - You should see the private key underneath
   - **Select BOTH the certificate AND the private key** (Cmd+click)
   - Right-click → Export 2 items
   - Choose format: Personal Information Exchange (.p12)
   - Set a password (remember this!)

## Solution 2: Export from Developer Portal

If Keychain export is still grayed out:

1. **Download from Apple Developer**
   - Go to: https://developer.apple.com/account/resources/certificates
   - Find your Pass Type ID certificate
   - Click "Download"
   - This downloads a .cer file

2. **Install and Re-export**
   - Double-click the .cer file to install in Keychain
   - Follow Solution 1 steps to export as .p12

## Solution 3: Alternative Certificate Creation

If the above doesn't work, create a new certificate:

1. **Create New Certificate Request**
   - Keychain Access → Certificate Assistant → Request Certificate from CA
   - Enter your email and name
   - Save to disk

2. **Upload to Apple Developer**
   - Go to Apple Developer portal
   - Create new Pass Type ID certificate
   - Upload your certificate request

3. **Download and Install**
   - Download the new certificate
   - Install in Keychain
   - Export as .p12

## Solution 4: Command Line Export (Advanced)

If GUI methods fail, use Terminal:

```bash
# Find your certificate
security find-identity -v -p codesigning

# Export to .p12 (replace with your certificate name)
security export -k login.keychain -t identities -f pkcs12 -o pass_cert.p12 "Pass Type ID: pass.com.beanstalker.app"
```

## Temporary Workaround: Disable Apple Wallet

While fixing certificates, we can temporarily disable Apple Wallet features:

1. **Comment out Apple Wallet code**
2. **Focus on core SMS functionality**
3. **Re-enable once certificates are working**

## Required Files for Apple Wallet

Once you can export, you'll need:
- `pass_cert.p12` (certificate + private key)
- `wwdr.pem` (Apple WWDR certificate)
- Your Apple Team ID

## Next Steps

Try Solution 1 first (selecting both certificate and private key). If that doesn't work, let me know and I'll help with the other approaches.

For now, would you like me to:
1. **Help troubleshoot certificate export** (continue with Apple Wallet)
2. **Temporarily disable Apple Wallet** (focus on SMS functionality)
3. **Implement Twilio SMS instead** (bypass certificate issues entirely)

Which approach would you prefer?