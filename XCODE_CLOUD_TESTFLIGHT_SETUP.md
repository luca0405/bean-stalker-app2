# Xcode Cloud & TestFlight Setup Guide for Bean Stalker

## Issue: "Repository is Locked" Error

### Common Causes & Solutions:

#### 1. GitHub Repository Access
- **Problem**: Xcode Cloud can't access your repository
- **Solution**: Grant proper permissions to Apple's GitHub app

**Steps:**
1. Go to GitHub → Settings → Applications → Authorized OAuth Apps
2. Look for "Xcode Cloud" or "Apple Developer"
3. If not found, you need to authorize it during Xcode Cloud setup
4. If found but limited access, click "Grant" to give full repository access

#### 2. Repository Ownership
- **Problem**: You're not the owner or don't have admin rights
- **Solution**: Ensure you have admin access to the repository

**Check:**
- Go to your GitHub repository
- Click Settings tab (should be visible if you have admin access)
- If you can't see Settings, ask the repository owner to add you as admin

#### 3. Private Repository Permissions
- **Problem**: Xcode Cloud needs explicit permission for private repos
- **Solution**: Use GitHub App installation method

**Steps:**
1. In Xcode Cloud setup, choose "Install GitHub App" option
2. This gives Xcode Cloud proper access to private repositories
3. Select only the Bean Stalker repository for security

#### 4. Repository URL Format
- **Problem**: Using wrong repository URL format
- **Solution**: Use the correct HTTPS format

**Correct Format:**
```
https://github.com/[username]/[repository-name]
```

**Not SSH format:**
```
git@github.com:[username]/[repository-name].git
```

## Complete Xcode Cloud Setup Process:

### Step 1: Prepare Repository
1. **Ensure your repository contains:**
   - `ios/` folder with Xcode project
   - `package.json` for Node.js dependencies
   - All necessary source files

2. **Create `.xcode-cloud.yml` workflow file:**
```yaml
# Bean Stalker Xcode Cloud Configuration
version: 1
workflows:
  bean-stalker-ios:
    name: Bean Stalker iOS Build
    description: Build and test Bean Stalker iOS app
    branch_patterns:
    - main
    - develop
    steps:
    - name: Install Dependencies
      script: |
        # Install Node.js dependencies
        npm install
        # Build web assets
        npm run build
        # Sync Capacitor
        npx cap sync ios
    - name: Xcode Build
      xcode:
        scheme: App
        destination: generic/platform=iOS
        build_settings:
          CODE_SIGN_STYLE: Automatic
          DEVELOPMENT_TEAM: [YOUR_TEAM_ID]
```

### Step 2: Xcode Cloud Configuration
1. **Open Xcode**
2. **Open your iOS project:** `ios/App/App.xcworkspace`
3. **Go to:** Product → Xcode Cloud → Create Workflow
4. **Select:** External Repository (GitHub)
5. **Enter repository URL:** `https://github.com/[your-username]/[repo-name]`

### Step 3: Fix "Repository is Locked"
If you still get the error:

**Option A: GitHub App Installation**
1. In Xcode Cloud setup, click "Install GitHub App"
2. This redirects to GitHub authorization page
3. Select your Bean Stalker repository
4. Grant all necessary permissions

**Option B: Manual Authorization**
1. Go to: https://github.com/settings/installations
2. Look for "Xcode Cloud" app
3. Click "Configure"
4. Add your Bean Stalker repository to access list

**Option C: Repository Settings**
1. In your GitHub repository → Settings → Manage Access
2. Ensure your Apple Developer account email has admin access
3. Check "Actions" permissions are enabled

### Step 4: TestFlight Distribution Setup

#### 1. App Store Connect Configuration
1. **Log into App Store Connect**
2. **Go to:** My Apps → Bean Stalker
3. **Navigate to:** TestFlight tab
4. **Enable:** External Testing (for broader testing)

#### 2. Build Settings in Xcode
1. **Open:** `ios/App/App.xcworkspace`
2. **Select:** App target
3. **Set:** 
   - Bundle Identifier: `com.beanstalker.member`
   - Version: 1.0
   - Build: Auto-increment
   - Signing: Automatic

#### 3. Archive Settings
```swift
// In App target Build Settings:
ENABLE_BITCODE = NO (Required for Capacitor)
SWIFT_VERSION = 5.0
IPHONEOS_DEPLOYMENT_TARGET = 13.0
CODE_SIGN_STYLE = Automatic
DEVELOPMENT_TEAM = [Your Team ID]
```

### Step 5: Automated TestFlight Upload
Once Xcode Cloud is working:

1. **Workflow automatically:**
   - Builds your app when you push to main branch
   - Uploads to TestFlight
   - Notifies you when ready for testing

2. **TestFlight automatically:**
   - Processes the build
   - Makes it available to internal testers
   - Sends notification emails

## Troubleshooting Common Issues:

### "Could not find specified service"
- Check your Apple Developer Program membership is active
- Ensure Xcode Cloud is enabled in your developer account

### "Build Failed - Dependencies"
- Add Node.js installation step to workflow
- Ensure all npm dependencies are in package.json

### "Code Signing Error"
- Set Development Team ID in Xcode project
- Enable Automatic Code Signing
- Check provisioning profiles in developer account

### "Capacitor Sync Failed"
- Ensure Capacitor CLI is installed in workflow
- Add `npx cap sync ios` to build steps

## Testing the Setup:

1. **Push to main branch**
2. **Check Xcode Cloud:** Should start building automatically
3. **Monitor build:** In Xcode → Report Navigator → Cloud tab
4. **Check TestFlight:** Build appears in App Store Connect after successful build
5. **Add testers:** Invite internal/external testers in TestFlight

## Current Bean Stalker Status:
- ✅ iOS project configured with Capacitor
- ✅ Bundle ID: com.beanstalker.member
- ✅ RevenueCat IAP integration ready
- ❌ Xcode Cloud workflow needs setup
- ❌ TestFlight distribution pending

Would you like me to help you create the specific workflow file or troubleshoot a particular step?