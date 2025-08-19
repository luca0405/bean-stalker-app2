# GitHub Secrets Configuration for Square API Integration

## Overview
The iOS build workflow now includes Square API credentials to ensure Kitchen Display System and payment processing work properly in native TestFlight builds.

## Required GitHub Secrets

### Square API Integration
Add these secrets to your GitHub repository settings:

1. **SQUARE_ACCESS_TOKEN**
   - Your Square sandbox/production access token
   - Format: `EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Used for: Payment processing, Kitchen Display API calls
   - Required: YES

2. **SQUARE_APPLICATION_ID**  
   - Your Square application ID
   - Format: `sandbox-sq0idb-xxxxxxxxxxxxxxx` or `sq0idp-xxxxxxxxxxxxxxx`
   - Used for: OAuth flows, API authentication
   - Required: YES

3. **SQUARE_LOCATION_ID**
   - Your Square location identifier
   - Format: `LRQ926HVH9WFD` (example)
   - Used for: Kitchen Display orders, location-specific API calls
   - Required: YES

4. **SQUARE_WEBHOOK_SIGNATURE_KEY**
   - Square webhook signature verification key
   - Format: 32-character alphanumeric string
   - Used for: Webhook security validation
   - Required: YES for production webhooks

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret name and value from above
5. Click **Add secret**

## Current Square Configuration
Based on your local environment:
- Location ID: `LRQ926HVH9WFD`
- Environment: `SANDBOX`
- Access Token: Configured
- Application ID: Configured

## Verification
The workflow will verify each secret during build:
- ✅ = Secret configured properly
- ❌ = Secret missing or empty

## Kitchen Display System Benefits
Once Square secrets are configured:
- Order #81 will sync to Square Kitchen Display
- Real-time order status updates
- Proper authentication for Square API calls
- Kitchen Display integration in TestFlight builds

## Next Steps
1. Add the 4 Square secrets to GitHub repository settings
2. Trigger new iOS build via GitHub Actions
3. Kitchen Display System will work in TestFlight build
4. Order #81 and new orders will appear in Square Kitchen Display

The Kitchen Display System code is complete and ready - it just needs the proper Square API credentials configured in GitHub Secrets.