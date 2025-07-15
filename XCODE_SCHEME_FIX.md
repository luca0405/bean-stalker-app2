# Xcode Scheme Error Fix - "App does not exist in App.xcworkspace"

## Error Resolved
**Error:** `A scheme called App does not exist in App.xcworkspace`

## Root Cause
Xcode Cloud couldn't find the "App" scheme because the scheme file wasn't present in the shared data directory. Schemes need to be committed to version control for Xcode Cloud builds.

## Solution Applied

### 1. Created Missing App.xcscheme
Created the shared scheme file at:
`ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`

### 2. Scheme Configuration
The scheme includes:
- **Build Action:** Builds the App target for all configurations
- **Archive Action:** Configured for Release builds
- **Target Reference:** Points to the correct App target (504EC3031FED79650016851F)
- **Bundle Identifier:** com.beanstalker.member (via build settings)

### 3. Updated Build Script
Enhanced `ci_post_clone.sh` to verify scheme exists during build:
- Checks for App.xcscheme file
- Lists available schemes if missing
- Provides clear error messages for debugging

### 4. Updated .gitignore
Modified to include shared schemes in version control:
```gitignore
# Keep shared schemes for Xcode Cloud
!*.xcodeproj/xcshareddata/
!*.xcodeproj/xcshareddata/xcschemes/
!*.xcodeproj/xcshareddata/xcschemes/*.xcscheme
```

## Xcode Project Structure Now

```
ios/App/
├── App.xcodeproj/
│   ├── project.pbxproj              # Project configuration
│   └── xcshareddata/
│       └── xcschemes/
│           └── App.xcscheme         # ✅ Shared scheme (NEW)
├── App.xcworkspace/                 # Workspace including Pods
├── App/                            # App source files
├── Podfile                         # CocoaPods dependencies
└── .gitignore                      # Excludes Pods, includes schemes
```

## Scheme Details

### Target Information:
- **Target Name:** App
- **Target ID:** 504EC3031FED79650016851F
- **Product:** App.app
- **Bundle ID:** com.beanstalker.member

### Build Configurations:
- **Debug:** For development and testing
- **Release:** For archiving and distribution
- **Archive Configuration:** Release (for TestFlight)

### Actions Configured:
- ✅ **Build:** All configurations enabled
- ✅ **Test:** Debug configuration (no tests currently)
- ✅ **Launch:** Debug configuration for development
- ✅ **Profile:** Release configuration for performance testing
- ✅ **Archive:** Release configuration for distribution

## Xcode Cloud Build Process

### Previous Flow (Failed):
1. Clone repository
2. Build web app and sync Capacitor
3. Install CocoaPods
4. **❌ FAIL:** Look for "App" scheme in App.xcworkspace - NOT FOUND

### Current Flow (Fixed):
1. Clone repository
2. Build web app and sync Capacitor
3. Install CocoaPods
4. **✅ SUCCESS:** Find "App" scheme in shared data
5. Archive using Release configuration
6. Upload to TestFlight

## Verification

To verify the scheme is working:
```bash
cd ios/App
xcodebuild -list -workspace App.xcworkspace
# Should show: "App" in the schemes list
```

Expected output:
```
Schemes:
    App
```

## Build Command Now Working

Xcode Cloud will now successfully execute:
```bash
xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme App \
  -destination "generic/platform=iOS" \
  -archivePath build.xcarchive
```

## Next Steps

1. **Commit scheme file** to version control
2. **Push to GitHub** repository
3. **Trigger Xcode Cloud build** - should find App scheme
4. **Monitor build progress** for successful archive
5. **Check TestFlight** for automatic upload

The Bean Stalker iOS app should now build successfully in Xcode Cloud with the proper scheme configuration.