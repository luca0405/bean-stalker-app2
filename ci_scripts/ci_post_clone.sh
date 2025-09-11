#!/bin/bash

# Bean Stalker iOS Build - Complete Dependency Setup
# Fixes CocoaPods PurchasesHybridCommon compatibility issues

set -e

echo "🚀 Bean Stalker iOS Build - Post Clone Setup"

# Environment verification
echo "📱 Environment Check:"
echo "CI: $CI"
echo "Xcode: $(xcodebuild -version | head -1)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"

# Verify essential files exist
if [ ! -f "package.json" ]; then
  echo "❌ package.json missing"
  exit 1
fi

if [ ! -f "ios/App/Podfile" ]; then
  echo "❌ iOS Podfile missing"  
  exit 1
fi

echo "✅ Project structure verified"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm ci --prefer-offline --no-audit

# Build web application
echo "🏗️  Building web application..."
VITE_FORCE_SANDBOX=true npm run build

# Verify web build succeeded
if [ ! -f "dist/index.html" ]; then
  echo "❌ Web build failed - dist/index.html not found"
  ls -la dist/ || echo "No dist directory"
  exit 1
fi

echo "✅ Web build complete: $(ls -lah dist/index.html)"

# Handle build output location (fix common Vite issue)
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
  echo "📁 Moving files from dist/public to dist/"
  cp -r dist/public/* dist/
  ls -la dist/
fi

# Sync Capacitor
echo "📱 Syncing Capacitor to iOS..."
npx cap sync ios --no-open

# CocoaPods Setup (This fixes the PurchasesHybridCommon error)
echo "🔧 Setting up CocoaPods dependencies..."
cd ios/App

# Clean any existing pods to prevent version conflicts
rm -rf Pods/
rm -rf Podfile.lock

# Update CocoaPods repo (fixes RevenueCat compatibility)
echo "🔄 Updating CocoaPods repository..."
pod repo update

# Install pods with verbose output for debugging
echo "⚙️  Installing CocoaPods..."
pod install --verbose

# Verify pods installation
if [ ! -d "Pods" ]; then
  echo "❌ CocoaPods installation failed"
  exit 1
fi

if [ ! -f "Pods/Target Support Files/Pods-App/Pods-App-resources.sh" ]; then
  echo "❌ Pod target files missing"
  ls -la Pods/Target\ Support\ Files/ || echo "No target support files"
  exit 1
fi

echo "✅ CocoaPods installation successful"

# Verify RevenueCat pod specifically
if [ -d "Pods/RevenuecatPurchasesCapacitor" ]; then
  echo "✅ RevenueCat pod installed successfully"
else
  echo "⚠️  RevenueCat pod not found, checking alternatives..."
  find Pods/ -name "*Revenue*" -type d | head -5
fi

# Return to project root
cd ../..

# Final verification
echo "🔍 Final project verification:"
echo "📂 Web build: $(ls -lah dist/index.html 2>/dev/null || echo 'MISSING')"
echo "📱 iOS workspace: $(ls -lah ios/App/App.xcworkspace 2>/dev/null || echo 'MISSING')"
echo "🔧 CocoaPods: $(ls -lah ios/App/Pods/Podfile 2>/dev/null || echo 'MISSING')"

echo "🎉 Bean Stalker iOS setup complete - ready for Xcode build!"