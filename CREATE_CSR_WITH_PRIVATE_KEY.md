# How to Create Certificate Signing Request WITH Private Key

## The Problem
When you create a CSR without specifying key pair information, macOS doesn't generate the private key locally. This is why your certificate shows "not trusted" and can't be exported to .p12.

## The Solution: Proper CSR Creation

### Method 1: Keychain Access (GUI Method)

1. **Open Keychain Access**
   - Applications → Utilities → Keychain Access

2. **Start Certificate Request**
   - Menu: Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority...

3. **Fill the Form Correctly**
   - User Email Address: `your-apple-dev-email@domain.com`
   - Common Name: `Bean Stalker Pass Certificate`
   - CA Email Address: Leave empty
   - Request is: **"Saved to disk"**
   - **CRITICAL**: Check **"Let me specify key pair information"** ← This creates the private key!

4. **Click Continue**

5. **Specify Key Pair Information**
   - Key Size: **2048 bits**
   - Algorithm: **RSA**
   - Click Continue

6. **Save CSR File**
   - Save as: `BeanStalkerPass.certSigningRequest`
   - Choose location (Downloads folder)

### Method 2: Terminal (Command Line Method)

If GUI method doesn't work, use Terminal:

```bash
# Generate private key
openssl genrsa -out pass_private_key.pem 2048

# Create certificate signing request
openssl req -new -key pass_private_key.pem -out pass_cert.csr -subj "/CN=Bean Stalker Pass Certificate/emailAddress=your-email@domain.com"

# The CSR is now in pass_cert.csr
# The private key is in pass_private_key.pem
```

## What Happens Next

### After Creating CSR:
1. **Upload CSR to Apple Developer Portal**
   - Go to: https://developer.apple.com/account/resources/certificates
   - Create Pass Type ID certificate
   - Upload your .certSigningRequest file

2. **Download Certificate**
   - Apple provides a .cer file
   - This contains the public certificate

3. **Install Certificate**
   - Double-click .cer file to install in Keychain
   - If you created CSR properly, it will automatically associate with your private key

4. **Verify Private Key Association**
   - In Keychain Access, find your Pass Type ID certificate
   - It should show dropdown arrow with private key underneath
   - Status should be "This certificate is valid"

5. **Export to .p12**
   - Select both certificate and private key
   - Right-click → Export 2 items
   - Choose .p12 format

## Quick Check: Did It Work?

After installing the certificate, you should see:
- ✅ Certificate shows as "trusted" (green checkmark)
- ✅ Dropdown arrow reveals private key
- ✅ Can export both items to .p12

If you still see "not trusted" or no dropdown arrow, the CSR wasn't created with the private key.

## Start Over Instructions

1. **Delete current certificate** from Keychain Access
2. **Create new CSR** using Method 1 above (make sure to check "Let me specify key pair information")
3. **Upload new CSR** to Apple Developer Portal
4. **Download and install** new certificate

The key is that checkbox: **"Let me specify key pair information"** - this tells macOS to generate and store the private key locally.

Ready to try again?