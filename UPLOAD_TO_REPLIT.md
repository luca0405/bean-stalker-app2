# Upload Apple Wallet Files to Replit

## Files to Upload

You should now have these files in your Downloads folder:
- `bean_stalker_pass_cert.p12` (certificate + private key with password)
- `wwdr.pem` (Apple WWDR certificate)

## Upload Process

### 1. Upload Files to Replit
- Drag and drop both files into your Replit project root directory
- Or use the upload button in Replit file manager

### 2. Configure Replit Secrets
Go to the Secrets panel in Replit and add these 5 environment variables:

```
APPLE_WALLET_CERT_PATH=/home/runner/bean_stalker_pass_cert.p12
APPLE_WALLET_KEY_PATH=/home/runner/bean_stalker_pass_cert.p12
APPLE_WALLET_WWDR_CERT_PATH=/home/runner/wwdr.pem
APPLE_TEAM_ID=YOUR_10_CHAR_TEAM_ID
APPLE_WALLET_CERT_PASSWORD=your_p12_password
```

Replace:
- `YOUR_10_CHAR_TEAM_ID` with your actual Team ID from Apple Developer portal
- `your_p12_password` with the password you set when creating the .p12 file

## Next Steps

Once configured, we'll test the Apple Wallet integration to ensure everything is working correctly.