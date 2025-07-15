# iOS Build Error Fix - CocoaPods Configuration

## Error Resolved
**Error:** `Unable to open base configuration reference file '/Volumes/workspace/repository/ios/App/Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig'`

## Root Cause
The CocoaPods dependencies weren't properly installed or were corrupted in the iOS project, causing Xcode to look for missing configuration files.

## Fixes Applied

### 1. Enhanced ci_post_clone.sh
- **Clean installation:** Remove existing Pods and Podfile.lock before installing
- **Multiple retry attempts:** Fallback strategies if pod install fails
- **Repo updates:** Ensure CocoaPods repository is current
- **Verification steps:** Check that required files are created

### 2. Updated .xcode-cloud.yml
- **Pre-clean step:** Remove Pods directory before build
- **Explicit dependency management:** Clear any cached/corrupted dependencies
- **Better error handling:** Graceful fallbacks for pod installation issues

### 3. Added iOS .gitignore
- **Exclude Pods/:** Prevents committing generated CocoaPods files
- **Exclude build artifacts:** Keeps repository clean
- **Include only source files:** Better Git management

## Build Process Now

### Step 1: Web App Build
```bash
npm ci                    # Install Node.js dependencies
npm run build            # Build React application
npx cap sync ios         # Sync web build to iOS
```

### Step 2: iOS Dependencies
```bash
cd ios/App
rm -rf Pods/ Podfile.lock    # Clean existing installation
pod repo update              # Update CocoaPods repository
pod install                  # Install dependencies with retries
```

### Step 3: Xcode Build
```bash
xcodebuild archive           # Archive for distribution
# With proper xcconfig files now available
```

## CocoaPods Configuration

### Podfile Dependencies:
- **Capacitor Core:** iOS bridge framework
- **RevenueCat:** In-App Purchase management
- **Native Biometric:** Touch ID/Face ID authentication
- **Capacitor Cordova:** Plugin compatibility layer

### Generated Files:
- `Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig`
- `Pods/Target Support Files/Pods-App/Pods-App.debug.xcconfig`
- `Podfile.lock` - Dependency versions lock file

## Verification Steps

After pod install completes, verify:
1. **Pods directory exists:** `ios/App/Pods/`
2. **Target Support Files:** Configuration files are generated
3. **Workspace file:** `App.xcworkspace` includes Pods project
4. **No missing references:** All xcconfig files accessible

## Troubleshooting

### If pods still fail:
```bash
# Manual cleanup and reinstall
cd ios/App
pod deintegrate
rm -rf Pods/ Podfile.lock
pod setup
pod install
```

### Alternative dependency resolution:
```bash
# Use specific CocoaPods version
gem install cocoapods -v 1.12.1
pod install
```

## Expected Results

✅ **Clean pod installation** - No corrupted dependencies  
✅ **All xcconfig files present** - Xcode can find configuration  
✅ **Successful archive** - iOS app builds without errors  
✅ **TestFlight upload** - Automated distribution works  

The iOS project should now build successfully in Xcode Cloud with proper CocoaPods dependency management.