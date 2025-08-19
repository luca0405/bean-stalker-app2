# Immediate Square Credentials Fix Required

## Current Problem
Your Square credentials are **sandbox credentials** but trying to access location `LRQ926HVH9WFD` which is not authorized.

## Working Location Found
Your current token has access to: `LKTZKDFJ44YZD` (Default Test Account, Australia)

## Immediate Fix Steps

### Step 1: Update Replit Environment
In Replit Secrets, change:
```
SQUARE_LOCATION_ID=LKTZKDFJ44YZD
```
(Currently set to: LRQ926HVH9WFD)

### Step 2: Restart Server
The workflow will automatically restart after environment change.

### Step 3: Test Kitchen Display
Order #81 should then sync to Square Kitchen Display successfully.

## Alternative: Production Credentials Setup

If you want to use production Square credentials instead of sandbox:

1. **Get Production Square Credentials:**
   - Log into Square Developer Dashboard
   - Switch to Production environment
   - Get Production Access Token
   - Get Production Application ID
   - Get Production Location ID
   - Get Production Webhook Signature Key

2. **Update Replit Secrets:**
   - SQUARE_ACCESS_TOKEN=(production token)
   - SQUARE_APPLICATION_ID=(production app id)  
   - SQUARE_LOCATION_ID=(production location id)
   - SQUARE_WEBHOOK_SIGNATURE_KEY=(production webhook key)

## Recommendation
**For immediate testing:** Use the sandbox fix (Step 1-3 above)
**For production app:** Get production credentials

The Kitchen Display System code is working perfectly - it just needs the correct location ID that matches your Square token permissions.