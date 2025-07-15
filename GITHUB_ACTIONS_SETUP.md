# GitHub Actions Setup for TestFlight Distribution

## Advantages of GitHub Actions vs Xcode Cloud

### GitHub Actions Benefits
✅ **Faster builds** - Dedicated runners, better resource allocation  
✅ **More control** - Custom build steps and environment configuration  
✅ **Better debugging** - Detailed logs and artifact downloads  
✅ **Cost effective** - Free for public repos, competitive pricing for private  
✅ **Flexible triggers** - Push, PR, manual, scheduled builds  
✅ **Artifact storage** - Download build files for debugging  

### Build Performance Comparison
| Platform | Typical Build Time | Resource Control | Debugging |
|----------|-------------------|------------------|-----------|
| Xcode Cloud | 25-35 minutes | Limited | Basic logs |
| GitHub Actions | 15-25 minutes | Full control | Detailed + artifacts |

## Required Secrets Configuration

### Apple Developer Secrets
Add these secrets in GitHub repository settings (Settings → Secrets → Actions):

#### 1. App Store Connect API
```
APPSTORE_ISSUER_ID: Your App Store Connect Issuer ID
APPSTORE_API_KEY_ID: Your API Key ID  
APPSTORE_API_PRIVATE_KEY: Your private key content
```

#### 2. Code Signing Certificates
```
CERTIFICATES_P12: Base64 encoded .p12 certificate file
CERTIFICATES_PASSWORD: Password for the .p12 file
```

### How to Get These Values

#### App Store Connect API (Required)
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access → Keys**
3. Create new API key with **Admin** access
4. Download the `.p8` file
5. Note the **Issuer ID** and **Key ID**

#### Code Signing Certificate (Required)
1. Open **Keychain Access** on Mac
2. Find your "iPhone Distribution" certificate
3. Export as `.p12` file with password
4. Convert to base64: `base64 -i certificate.p12 | pbcopy`

## Setup Steps

### 1. Configure Secrets in GitHub
```bash
# Go to your repository: https://github.com/luca0405/bean-stalker-app2
# Navigate to Settings → Secrets and variables → Actions
# Add the following secrets:

APPSTORE_ISSUER_ID=your-issuer-id-here
APPSTORE_API_KEY_ID=your-key-id-here  
APPSTORE_API_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
your-private-key-content-here
-----END PRIVATE KEY-----

CERTIFICATES_P12=base64-encoded-p12-content
CERTIFICATES_PASSWORD=your-p12-password
```

### 2. Push Workflow to Repository
The workflow files are ready:
- `.github/workflows/ios-testflight.yml` - Main build workflow
- `.github/workflows/ExportOptions.plist` - Export configuration

### 3. Trigger Build
```bash
# Push to main branch triggers automatic build
git add .
git commit -m "Add GitHub Actions workflow for TestFlight"
git push origin main

# Or trigger manually in GitHub Actions tab
```

## Workflow Process

### Build Steps (15-25 minutes total)
1. **Checkout** - Clone repository (~1 min)
2. **Setup Environment** - Node.js, Ruby, Xcode (~2 min)
3. **Install Dependencies** - npm and CocoaPods (~3-5 min)
4. **Build Web App** - React production build (~3-5 min)
5. **Sync Capacitor** - Web assets to iOS (~1 min)
6. **Code Signing** - Import certificates and profiles (~1 min)
7. **Build Archive** - Xcode archive creation (~5-8 min)
8. **Export IPA** - Create distributable app (~1 min)
9. **Upload TestFlight** - Automatic upload (~1-2 min)

### Build Triggers
- **Push to main/master** - Automatic builds
- **Pull requests** - Build verification (no upload)
- **Manual dispatch** - On-demand builds via GitHub UI
- **Scheduled** - Can be configured for nightly builds

## Monitoring and Debugging

### Build Status
- **GitHub Actions tab** - Real-time build progress
- **Email notifications** - Build success/failure alerts
- **Status badges** - Add to README for quick status check
- **Slack/Discord** - Optional webhook notifications

### Debugging Features
```yaml
Artifact Downloads:
- iOS build files (.xcarchive)
- Export logs and build artifacts
- Crash reports and symbols
- Build timing and performance data
```

### Common Issues and Solutions
| Issue | Solution |
|-------|----------|
| Certificate expired | Update CERTIFICATES_P12 secret |
| Provisioning profile invalid | Regenerate in Apple Developer |
| Build timeout | Check for dependency issues |
| Upload failed | Verify App Store Connect API keys |

## TestFlight Distribution

### After Successful Build
1. **Build appears in App Store Connect** - Within 2-3 minutes
2. **Processing time** - 10-15 minutes for App Store review
3. **TestFlight availability** - Immediate after processing
4. **Internal testing** - Add testers and send invitations

### Testing Access
- **Bundle ID**: com.beanstalker.member
- **Test credentials**: iamninz / password123
- **Server**: Production (member.beanstalker.com.au)
- **Features**: Full IAP, Square integration, biometric auth

## Performance Optimization

### GitHub Actions Optimizations Applied
```yaml
Build Speed Improvements:
- npm cache strategy
- CocoaPods silent install with verbose fallback
- Parallel dependency installation
- Optimized Xcode build settings
- Efficient artifact handling
```

### Resource Efficiency
- **macOS-14 runners** - Latest stable environment
- **Node.js 20** - LTS version with performance improvements
- **Ruby caching** - Faster gem installation
- **Build caching** - npm dependencies cached between builds

## Migration from Xcode Cloud

### If Currently Using Xcode Cloud
1. Keep Xcode Cloud as backup initially
2. Test GitHub Actions workflow thoroughly
3. Compare build times and reliability
4. Gradually migrate to GitHub Actions for primary builds
5. Disable Xcode Cloud once confident

### Hybrid Approach
- **GitHub Actions** - Primary builds and PR verification
- **Xcode Cloud** - Backup or alternative trigger method
- **Manual builds** - Local Xcode for development testing

## Cost Considerations

### GitHub Actions Pricing
- **Public repositories** - Free unlimited minutes
- **Private repositories** - 2,000 free minutes/month
- **Additional minutes** - $0.008 per minute for macOS runners
- **Typical usage** - ~20 minutes per build = ~$0.16 per build

### Expected Usage
```
Estimated Monthly Cost:
- 10 builds/month = ~$1.60
- 50 builds/month = ~$8.00  
- 100 builds/month = ~$16.00
```

## Next Steps

1. **Configure secrets** in GitHub repository settings
2. **Push workflow files** to trigger first build
3. **Monitor build progress** in GitHub Actions tab
4. **Test on TestFlight** once build completes
5. **Optimize further** based on actual performance metrics

Your Bean Stalker iOS app will have faster, more reliable builds with enhanced debugging capabilities using GitHub Actions!