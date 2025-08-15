# Next Steps After Creating CSR

## ✅ CSR Created Successfully
The "attribute 0" warning is normal and can be ignored. Your CSR was created properly.

## Step 1: Verify Files Were Created
Check that you have these files in your Downloads folder:
```bash
ls -la ~/Downloads/bean_stalker_pass*
```
You should see:
- `bean_stalker_pass_private.pem` (private key)
- `bean_stalker_pass.csr` (certificate signing request)

## Step 2: Upload CSR to Apple Developer Portal

1. **Open Apple Developer Portal**
   - Go to: https://developer.apple.com/account/resources/certificates
   - Sign in with your Apple Developer account

2. **Create Pass Type ID Certificate**
   - Click the **"+"** button (Add certificate)
   - Under "Services" section, select **"Pass Type ID"**
   - Click **Continue**

3. **Upload Your CSR**
   - Click **"Choose File"**
   - Select `bean_stalker_pass.csr` from Downloads
   - Click **Continue**

4. **Download Certificate**
   - Click **"Download"**
   - Save as `bean_stalker_pass.cer` in Downloads

## Step 3: Create .p12 Bundle

Once you've downloaded the certificate from Apple, run:
```bash
cd ~/Downloads
openssl pkcs12 -export -out bean_stalker_pass_cert.p12 \
  -inkey bean_stalker_pass_private.pem \
  -in bean_stalker_pass.cer \
  -name "Bean Stalker Pass Certificate"
```

When prompted:
- **Enter Export Password**: Create a strong password (e.g., `BeanStalker2025!`)
- **Verify Export Password**: Enter the same password
- **Remember this password** - you'll need it for Replit configuration

## Step 4: Get Apple WWDR Certificate
```bash
curl -o AppleWWDRCA.cer https://developer.apple.com/certificationauthority/AppleWWDRCA.cer
openssl x509 -inform DER -outform PEM -in AppleWWDRCA.cer -out wwdr.pem
```

## Step 5: Upload to Replit

Upload these files to your Replit project root:
- `bean_stalker_pass_cert.p12`
- `wwdr.pem`

Then I'll help you configure the environment variables.

---

**Current Status**: CSR created successfully
**Next Action**: Upload CSR to Apple Developer Portal and download the certificate

Let me know when you've downloaded the certificate from Apple!