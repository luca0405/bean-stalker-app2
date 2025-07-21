# Production Square API Setup - Step by Step

## Current Status
Your Bean Stalker app is using **sandbox Square credentials**:
- Location: LRQ926HVH9WFD (Beanstalker Sandbox)
- App ID: sandbox-sq0idb-0f_-wyGBcz7NmblQtFkv9A
- Environment: Testing mode

## How to Switch to Production

### Step 1: Access Replit Secrets
1. In your Replit project, find the **🔒 Secrets** tab in the left sidebar
2. Or click **Tools** → **Secrets** in the top menu

### Step 2: Update These 4 Secrets
Replace the current values with your production Square credentials:

**SQUARE_ACCESS_TOKEN**
- Current: sandbox token
- Update to: Your live access token (starts with `sq0atp-`)

**SQUARE_APPLICATION_ID**
- Current: sandbox-sq0idb-0f_-wyGBcz7NmblQtFkv9A  
- Update to: Your production app ID (starts with `sq0idp-`)

**SQUARE_LOCATION_ID**
- Current: LRQ926HVH9WFD
- Update to: Your actual business location ID

**SQUARE_WEBHOOK_SIGNATURE_KEY**
- Current: sandbox webhook key
- Update to: Your production webhook signature key

### Step 3: Get Production Credentials

**From Your Live Square Dashboard:**
1. Go to **squareup.com** → Sign in to your business account
2. Navigate to **Apps & Services** → **Developer Dashboard**
3. Select or create your **production application**
4. Copy the **Production Access Token** (OAuth tab)
5. Copy the **Application ID** 
6. Get your **Location ID** from Account & Settings → Locations
7. Set up **Webhook** with URL: `https://member.beanstalker.com.au/api/square/webhook`

### Step 4: What Happens After Update
- App automatically restarts with production credentials
- Real payments will be processed
- Orders sync to your live Square for Restaurants
- Kitchen Display shows actual customer orders

## Important Warnings

⚠️ **Real Money**: Production mode processes actual payments
⚠️ **Live Orders**: Kitchen staff will see real customer orders  
⚠️ **Test First**: Place small test orders before going live

## Verification
After updating, check:
- Orders appear in your live Square Dashboard
- Kitchen Display shows real orders
- Credit purchases process actual payments
- Webhook notifications work properly

Your Bean Stalker app is production-ready - just needs the credential switch!