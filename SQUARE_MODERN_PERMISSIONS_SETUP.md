# Square Modern Application Permissions Setup

## Current Square Dashboard Interface

Based on your screenshot, Square has updated their Developer Dashboard interface. The permissions are now configured differently.

## What I Can See in Your Dashboard:
- ✅ **Production Application ID**: `sq0idp-bE0T8OG5OxpNMLZSqzDvFA`
- ✅ **Production Application Secret**: `••••••••••••`
- ✅ **Active tokens connected to production merchants**: 1

## Modern Square Permission Setup

### Option 1: Check Application Details
1. In the left sidebar, click **"App details"**
2. Look for **"Permissions"** or **"Scopes"** section
3. Verify these are enabled:
   - Orders (read/write)
   - Payments (read/write) 
   - Merchant profile (read)

### Option 2: Use Personal Access Token
Since your application shows "1 active token connected to production merchants", you might need a personal access token instead:

1. Look for **"Personal Access Tokens"** section in your app
2. Generate a new personal access token
3. Personal tokens typically have broader permissions automatically

### Option 3: Check Credentials Section
Your "Credentials" tab in the left sidebar might have:
1. Click **"Credentials"** 
2. Look for **"Production Access Token"** section
3. The token might need to be regenerated

## Why You're Getting 401 Unauthorized

The issue might be:
1. **Token Type**: You might be using the Application Secret instead of Access Token
2. **Permissions**: The token doesn't have required API permissions
3. **Merchant Connection**: The application might need merchant authorization

## Solution: Try Personal Access Token

1. In your Square Developer Dashboard
2. Look for **"Personal Access Tokens"** (might be under Credentials)
3. Generate a new personal access token
4. Use this token instead of the OAuth token

Personal access tokens typically work immediately without complex permission setup.

## Test the New Token

After getting a personal access token:
1. Update `SQUARE_ACCESS_TOKEN_PROD` in Replit Secrets
2. Test the connection: Bean Stalker will automatically detect the new token
3. Check if the 401 error is resolved

## Alternative: OAuth Flow Completion

Your dashboard shows "1 active token connected to production merchants" which suggests you might need to:
1. Complete the OAuth authorization flow
2. Have your merchant account authorize the application
3. Get the resulting access token from that flow

The modern Square interface has simplified this process, but the exact location of permissions might be in the "App details" section.