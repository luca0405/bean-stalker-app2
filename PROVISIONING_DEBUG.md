# Provisioning Profile Debug Guide

## Current Issue
We keep getting: "No profiles for 'com.beanstalker.member' were found"

## Root Cause Analysis
The error suggests the provisioning profile might not be properly configured in App Store Connect.

## Debug Steps

### 1. Verify App Store Connect Configuration
Go to https://appstoreconnect.apple.com and check:

**App Registration:**
- Is "Bean Stalker" app registered with Bundle ID: `com.beanstalker.member`?
- Is it assigned to your Developer Team A43TZWNYA3?

**Provisioning Profile:**
- Go to Apple Developer Portal → Certificates, IDs & Profiles
- Check if "Beanstalker Membership App" profile exists
- Verify it's an App Store Distribution profile (not Development)
- Confirm Bundle ID matches: com.beanstalker.member
- Check expiration date (should be valid until 2026/07/01)

### 2. Certificate Issues
The error mentions "iOS App Development" but we need "iOS Distribution" for App Store:
- Verify you have an iOS Distribution certificate (not just Development)
- Check if certificate is properly linked to the provisioning profile

### 3. Bundle ID Mismatch
Possible issues:
- App might be registered with different Bundle ID in App Store Connect
- Provisioning profile might be for different Bundle ID
- Certificate might not be authorized for this Bundle ID

## Quick Fix Options

### Option A: Create New App with Different Bundle ID
1. Register new app in App Store Connect: `com.beanstalker.app`
2. Create new provisioning profile for the new Bundle ID
3. Update Capacitor config to use new Bundle ID

### Option B: Fix Existing Setup
1. Delete and recreate provisioning profile in Apple Developer Portal
2. Ensure it's "App Store" type (not Development)
3. Download and re-add to GitHub secrets

### Option C: Use Development Profile for Testing
1. Create iOS Development provisioning profile
2. Build for development first to test the pipeline
3. Switch to distribution later

## Recommended Action
Let's try Option A with a simpler Bundle ID that definitely doesn't exist yet.