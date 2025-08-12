# Native Mobile App Environment Configuration

## Overview
Bean Stalker is a **native mobile app** built with Capacitor. Unlike web apps, native apps require environment variables to be configured in multiple locations for different deployment scenarios.

## Environment Variable Locations

### 1. Development Testing (Replit)
**Purpose**: Server-side API testing and development
**Location**: Replit Secrets (current setup)
**Variables**:
- `OMNISEND_API_KEY` - For SMS sending functionality ✅ Configured
- `VITE_REVENUECAT_API_KEY` - For IAP testing

### 2. GitHub Actions (CI/CD Builds)
**Purpose**: Automated iOS/Android builds
**Location**: GitHub Repository Secrets
**Required Setup**:

#### Step-by-Step GitHub Secrets Configuration:

1. **Navigate to Repository**
   - Go to: `https://github.com/luca0405/bean-stalker-app2`
   - Click: **Settings** tab

2. **Access Secrets**
   - Sidebar: **Secrets and variables** → **Actions**

3. **Add Required Secrets**:
   - `VITE_REVENUECAT_API_KEY`: `appl_owLmakOcTeYJOJoxJgScSQZtUQA`
   - `OMNISEND_API_KEY`: [Your Omnisend API Key]

### 3. Xcode Cloud (iOS Builds)
**Purpose**: Apple's native iOS build service
**Location**: App Store Connect → Xcode Cloud → Environment Variables
**Required Variables**: Same as GitHub Actions

### 4. Local Development (Native Testing)
**Purpose**: Local Capacitor builds with Xcode/Android Studio
**Location**: `.env` file (git-ignored)
**Setup**:
```bash
# Create .env file in project root
OMNISEND_API_KEY=your_omnisend_key_here
VITE_REVENUECAT_API_KEY=appl_owLmakOcTeYJOJoxJgScSQZtUQA
```

## Current Status

### ✅ Completed
- Omnisend integration in Share Credits feature
- Server-side SMS sending functionality
- Replit development environment setup
- GitHub workflow updated for Omnisend API key

### ⚠️ Required Actions
1. **Add GitHub Secrets**:
   - `OMNISEND_API_KEY` (for automated builds)
   - Verify `VITE_REVENUECAT_API_KEY` exists

2. **Configure Xcode Cloud** (if using Apple's build service):
   - Add environment variables in App Store Connect
   - Match GitHub Actions configuration

## Testing Scenarios

### Development (Current)
- ✅ Replit Secrets provide server-side functionality
- ✅ SMS sending works through Omnisend service
- ✅ RevenueCat integration active

### Production Builds
- ⚠️ Requires GitHub Secrets configuration
- ⚠️ iOS builds need Xcode Cloud or GitHub Actions setup
- ⚠️ Android builds need GitHub Actions setup

## Important Notes

1. **Native vs Web Apps**:
   - Native apps bundle the frontend into the mobile app
   - Server-side APIs (Omnisend, payment processing) run separately
   - Environment variables needed in both client and server contexts

2. **Security**:
   - Client-side variables (VITE_*) are bundled into the app
   - Server-side variables (OMNISEND_API_KEY) stay on backend
   - GitHub Secrets are encrypted and secure

3. **Build Process**:
   - GitHub Actions: Builds → TestFlight → App Store
   - Local Xcode: Development → Device Testing
   - Capacitor: Bridges web code to native platforms

## Next Steps

1. **Configure GitHub Secrets** (Priority: High)
2. **Test automated build pipeline**
3. **Verify native app functionality on device**
4. **Deploy to TestFlight for testing**

The Omnisend SMS integration is ready - it just needs the production environment configuration to work in deployed builds.