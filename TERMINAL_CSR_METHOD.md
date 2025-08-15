# Alternative: Create CSR Using Terminal

If Keychain Access isn't working properly, you can create the CSR and private key using Terminal commands.

## Step-by-Step Terminal Method

### 1. Open Terminal
```bash
# Navigate to Downloads folder
cd ~/Downloads
```

### 2. Generate Private Key
```bash
# Create a 2048-bit RSA private key
openssl genrsa -out bean_stalker_pass_private.pem 2048
```

### 3. Create Certificate Signing Request
```bash
# Create CSR using the private key (replace with your email)
openssl req -new -key bean_stalker_pass_private.pem -out bean_stalker_pass.csr \
  -subj "/CN=Bean Stalker Pass Certificate/emailAddress=your-apple-dev-email@domain.com/O=Bean Stalker"
```

### 4. Verify Files Were Created
```bash
ls -la *.pem *.csr
# You should see:
# bean_stalker_pass_private.pem (private key)
# bean_stalker_pass.csr (certificate signing request)
```

### 5. Upload CSR to Apple Developer
- Go to: https://developer.apple.com/account/resources/certificates
- Create new Pass Type ID certificate
- Upload `bean_stalker_pass.csr` file

### 6. Download Certificate from Apple
- Download the .cer file from Apple
- Save as `bean_stalker_pass.cer`

### 7. Convert to .p12 Format
```bash
# Convert Apple's certificate + your private key to .p12
openssl pkcs12 -export -out bean_stalker_pass_cert.p12 \
  -inkey bean_stalker_pass_private.pem \
  -in bean_stalker_pass.cer \
  -name "Bean Stalker Pass Certificate"

# You'll be prompted for an export password - remember this!
```

### 8. Get Apple WWDR Certificate
```bash
# Download Apple WWDR certificate
curl -o AppleWWDRCA.cer https://developer.apple.com/certificationauthority/AppleWWDRCA.cer

# Convert to PEM format
openssl x509 -inform DER -outform PEM -in AppleWWDRCA.cer -out wwdr.pem
```

### 9. Verify Final Files
```bash
ls -la *.p12 *.pem
# You should have:
# bean_stalker_pass_cert.p12 (certificate + private key bundle)
# wwdr.pem (Apple WWDR certificate)
```

## Upload to Replit

Upload these files to your Replit project:
- `bean_stalker_pass_cert.p12`
- `wwdr.pem`

Then configure these Replit Secrets:
```
APPLE_WALLET_CERT_PATH=/home/runner/bean_stalker_pass_cert.p12
APPLE_WALLET_KEY_PATH=/home/runner/bean_stalker_pass_cert.p12
APPLE_WALLET_WWDR_CERT_PATH=/home/runner/wwdr.pem
APPLE_TEAM_ID=YOUR_10_CHAR_TEAM_ID
APPLE_WALLET_CERT_PASSWORD=your_p12_password
```

## Advantages of Terminal Method

- ✅ Guaranteed to create private key
- ✅ No GUI issues with Keychain Access
- ✅ More control over the process
- ✅ Works on any macOS version
- ✅ Creates files you can easily verify

This method bypasses any Keychain Access issues and gives you full control over the certificate creation process.