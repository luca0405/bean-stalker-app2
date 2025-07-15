#!/bin/bash

# Optimized post-clone script for Bean Stalker iOS
# High-performance build preparation

set -e

echo "🚀 Bean Stalker optimized setup..."

# Quick environment check
node --version && npm --version

# Verify essential files exist
if [ ! -f "package.json" ]; then
  echo "❌ package.json missing"
  exit 1
fi

if [ ! -f "ios/App/Podfile" ]; then
  echo "❌ iOS Podfile missing"
  exit 1
fi

# Verify Xcode scheme
if [ ! -f "ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme" ]; then
  echo "❌ App.xcscheme missing"
  exit 1
fi

echo "✅ Environment verified - ready for build"