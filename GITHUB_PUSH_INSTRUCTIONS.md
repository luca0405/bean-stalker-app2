# GitHub Push Instructions for TestFlight Distribution

## Prerequisites
✅ **Bean Stalker iOS project configured** - All Xcode Cloud fixes applied  
✅ **GitHub repository ready** - luca0405/bean-stalker-app2  
✅ **Apple Developer Account** - For TestFlight access  
✅ **App Store Connect setup** - Bundle ID: com.beanstalker.member  

## Step 1: Push Project to GitHub

### Manual Git Setup
```bash
# Initialize if needed
git init

# Add all files
git add .

# Commit with descriptive message
git commit -m "Bean Stalker iOS app with Xcode Cloud TestFlight configuration"

# Add GitHub remote
git remote add origin https://github.com/luca0405/bean-stalker-app2.git

# Push to main branch
git push -u origin main
```

### Alternative: Use Replit Git Interface
1. Open Git tab in Replit sidebar
2. Stage all changes
3. Commit: "Bean Stalker iOS app with Xcode Cloud TestFlight configuration"
4. Connect to GitHub repository: luca0405/bean-stalker-app2
5. Push to main branch

## Step 2: Configure Xcode Cloud in App Store Connect

### Access Xcode Cloud
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app (Bean Stalker - com.beanstalker.member)
3. Navigate to **Xcode Cloud** tab
4. Click **Get Started**

### Connect GitHub Repository
1. **Source Control**: Choose GitHub
2. **Repository**: Select `luca0405/bean-stalker-app2`
3. **Authorization**: Grant App Store Connect access to repository
4. **Branch**: Select `main` branch

### Configure Build Workflow
1. **Workflow Name**: "TestFlight Distribution"
2. **Start Condition**: "On every push to main branch"
3. **Build Configuration**: 
   - **Scheme**: App (auto-detected)
   - **Platform**: iOS
   - **Build Type**: Archive
4. **Post-Actions**: 
   - ✅ **TestFlight Internal Testing**
   - ✅ **Notify when build succeeds**

## Step 3: Verify Build Configuration

### Expected Xcode Cloud Process
```yaml
Build Steps:
1. Clone repository from GitHub
2. Run ci_scripts/ci_post_clone.sh preparation
3. Build web app (npm run build) - 15min timeout
4. Install iOS dependencies (CocoaPods) - Enhanced PATH
5. Archive iOS app (App.xcworkspace → App scheme)
6. Upload to TestFlight automatically

Total Build Time: ~20-30 minutes
```

### Build Configuration Files (Already in Project)
- ✅ `.xcode-cloud.yml` - Complete build workflow
- ✅ `ci_scripts/ci_post_clone.sh` - Preparation script
- ✅ `ios/App/App.xcscheme` - Xcode scheme for building
- ✅ `ios/App/Podfile` - iOS dependencies
- ✅ Enhanced error handling and retry mechanisms

## Step 4: Monitor Build Progress

### Build Status Locations
1. **App Store Connect → Xcode Cloud**: Real-time build logs
2. **GitHub Repository**: Build status badges (optional)
3. **Email Notifications**: Build completion alerts

### Success Indicators
- ✅ **Clone successful**: Repository accessed
- ✅ **Web build complete**: React app compiled
- ✅ **CocoaPods installed**: All xcconfig files generated
- ✅ **iOS archive successful**: App.app created
- ✅ **TestFlight upload**: Build available for testing

### Common Issues & Solutions
| Issue | Solution |
|-------|----------|
| CocoaPods PATH error | Enhanced PATH configuration applied |
| Missing App scheme | App.xcscheme committed to repository |
| Build timeout | Extended timeouts (15min web, 10min iOS) |
| xcconfig missing | Multiple retry mechanisms implemented |

## Step 5: TestFlight Testing

### After Successful Build
1. **App Store Connect → TestFlight**: New build appears
2. **Processing Time**: ~10-15 minutes for App Store review
3. **Internal Testing**: Available immediately after processing
4. **External Testing**: Requires additional review (~24 hours)

### Test Credentials
- **Bundle ID**: com.beanstalker.member
- **Test Account**: iamninz / password123
- **Server**: Production (member.beanstalker.com.au)

### Testing Checklist
- ✅ App launches without crashes
- ✅ Authentication works with test credentials
- ✅ Menu loading from production server
- ✅ In-App Purchases functionality (RevenueCat)
- ✅ Touch ID/Face ID authentication
- ✅ Order placement and Square integration

## Step 6: Distribution Setup

### Internal Testing (Immediate)
- Add internal testers in App Store Connect
- Testers receive TestFlight invitation email
- Install TestFlight app and download Bean Stalker

### External Testing (24-48 hours)
- Submit for external review in TestFlight
- Add external testers (up to 10,000)
- Public TestFlight link generation

### App Store Submission (Future)
- Complete App Store metadata
- Screenshots and app preview videos
- Submit for App Store review
- Public distribution

## Expected Results

### Successful Build Output
```
✅ Repository cloned successfully
✅ Web app built (React + Vite)
✅ iOS dependencies installed (CocoaPods)
✅ App scheme detected and used
✅ iOS archive completed
✅ TestFlight upload successful
📱 Build available for testing in 10-15 minutes
```

### TestFlight Availability
- **Internal testing**: Immediate after processing
- **Bean Stalker app**: Full production functionality
- **IAP testing**: RevenueCat sandbox environment
- **Square integration**: Production Square API

## Next Steps After Push

1. **Push project** to GitHub using commands above
2. **Configure Xcode Cloud** in App Store Connect
3. **Monitor first build** (~30 minutes total)
4. **Test on TestFlight** with provided credentials
5. **Invite additional testers** for beta testing

The Bean Stalker iOS app is fully configured for automated TestFlight distribution!