# Replit Git Remote Repository Setup Guide

## Error: "Error (UNKNOWN) adding origin" - Solutions

### Method 1: Using Replit Git Interface (Recommended)

1. **Open Replit Git Panel:**
   - Click the Git icon in the left sidebar (looks like a branch symbol)
   - Or press `Ctrl+Shift+G` (Windows/Linux) or `Cmd+Shift+G` (Mac)

2. **Connect to GitHub Repository:**
   - Click "Connect to GitHub" or "Add Remote"
   - Enter repository URL: `https://github.com/luca0405/bs-v2.git`
   - Click "Connect"

3. **Authenticate with GitHub:**
   - Replit will prompt for GitHub authentication
   - Allow Replit access to your repository
   - Complete OAuth flow if needed

### Method 2: Manual Git Configuration

If Replit's Git interface doesn't work, try these commands in the shell:

```bash
# Step 1: Check current status
git status
git remote -v

# Step 2: Remove any existing remote (if needed)
git remote remove origin

# Step 3: Add your GitHub repository
git remote add origin https://github.com/luca0405/bs-v2.git

# Step 4: Verify remote was added
git remote -v

# Step 5: Set up branch tracking
git branch -M main
git push -u origin main
```

### Method 3: Repository Clone Approach

If the above methods fail, clone your repository:

```bash
# Clone your repository
git clone https://github.com/luca0405/bs-v2.git temp-repo

# Copy Bean Stalker files to the cloned repository
cp -r client/ temp-repo/
cp -r server/ temp-repo/
cp -r shared/ temp-repo/
cp -r ios/ temp-repo/
cp -r ci_scripts/ temp-repo/
cp package.json temp-repo/
cp .xcode-cloud.yml temp-repo/
cp capacitor.config.ts temp-repo/
cp README.md temp-repo/
cp .gitignore temp-repo/

# Change to cloned repository
cd temp-repo

# Add and commit all files
git add .
git commit -m "Add complete Bean Stalker iOS app with Xcode Cloud setup"

# Push to GitHub
git push origin main
```

## Common Issues & Solutions

### Issue 1: Authentication Problems
**Error:** Authentication failed
**Solution:** 
- Go to GitHub → Settings → Developer Settings → Personal Access Tokens
- Generate new token with repo permissions
- Use token instead of password when prompted

### Issue 2: Repository Doesn't Exist
**Error:** Repository not found
**Solution:**
- Verify repository URL: `https://github.com/luca0405/bs-v2.git`
- Ensure repository exists and is accessible
- Check repository visibility (public vs private)

### Issue 3: Permission Denied
**Error:** Permission denied (publickey)
**Solution:**
- Use HTTPS instead of SSH: `https://github.com/luca0405/bs-v2.git`
- Not: `git@github.com:luca0405/bs-v2.git`

### Issue 4: Git Lock Files
**Error:** Could not lock config file
**Solution:**
- Wait a few minutes for locks to clear
- Restart the Replit workspace
- Try the operation again

## Alternative: Direct File Upload

If Git continues to have issues:

1. **Download Project:**
   - In Replit: Three dots menu → "Download as zip"
   - Extract files on your computer

2. **Upload to GitHub:**
   - Go to https://github.com/luca0405/bs-v2
   - Click "uploading an existing file"
   - Drag and drop all Bean Stalker files
   - Commit changes

3. **Clone Back to Replit:**
   - Create new Replit from GitHub import
   - Use URL: `https://github.com/luca0405/bs-v2`

## Pre-Push Checklist

Before pushing to GitHub, ensure these files are included:

### Essential Files:
- ✅ `client/` - React frontend
- ✅ `server/` - Node.js backend  
- ✅ `shared/` - TypeScript schemas
- ✅ `ios/` - Capacitor iOS project
- ✅ `package.json` - Dependencies
- ✅ `README.md` - Project documentation

### Xcode Cloud Files:
- ✅ `.xcode-cloud.yml` - Build workflow
- ✅ `ci_scripts/ci_post_clone.sh` - Build script
- ✅ `capacitor.config.ts` - iOS configuration

### Documentation:
- ✅ `XCODE_CLOUD_TESTFLIGHT_SETUP.md`
- ✅ `REVENUECAT_PRODUCTS_SETUP.md`
- ✅ `GITHUB_PUSH_INSTRUCTIONS.md`
- ✅ `.gitignore` - File exclusions

## Current Repository Status

**Target Repository:** `https://github.com/luca0405/bs-v2.git`
**Project:** Bean Stalker iOS App with Xcode Cloud
**Bundle ID:** com.beanstalker.member
**Features:** IAP, Square integration, TestFlight ready

## Next Steps After Git Setup

1. **Push all files** to GitHub repository
2. **Set up Xcode Cloud** workflow connection
3. **Configure TestFlight** for beta distribution
4. **Test build process** with Xcode Cloud

The Bean Stalker app is ready for GitHub deployment with complete iOS TestFlight integration.