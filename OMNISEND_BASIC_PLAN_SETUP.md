# Omnisend Basic Plan SMS Setup

## Issue: Custom Event Triggers Not Available

If you don't see "Custom Event" trigger options in Omnisend, it means your current plan doesn't include advanced automation features.

## Available Options

### Option 1: Upgrade Omnisend Plan (Recommended for Automation)
- **Upgrade to Standard or Pro plan** to get custom event triggers
- This enables full automation as originally designed
- Cost: ~$16-$99/month depending on contact volume

### Option 2: Manual Campaign Approach (Current Plan)
Since custom events aren't available, you can set up SMS campaigns manually:

1. **Create SMS Broadcast Campaign**
   - Go to Campaigns → Create Campaign → SMS
   - Target: Contacts with specific tags or properties

2. **Use Contact Properties for Targeting**
   - The app already adds custom properties to contacts
   - You can filter contacts based on recent activity

3. **Schedule Regular Campaigns**
   - Send SMS to contacts who received credits recently
   - Manual process but works with basic plan

### Option 3: Alternative SMS Service (Immediate Solution)
For instant SMS without Omnisend dashboard setup:

#### A. Twilio SMS Integration
- Direct SMS sending via API
- Pay per SMS (~$0.02 per message)
- No campaign setup required

#### B. AWS SNS SMS
- Cost-effective for Australian numbers
- Simple API integration
- Immediate implementation

## Current App Behavior

With your current Omnisend plan:
1. ✅ Contacts are created successfully
2. ✅ Contact properties are stored
3. ⚠️ SMS automation not available (premium feature)
4. ✅ App falls back to manual SMS sending

## Recommended Immediate Solution

Since you need working SMS right away, I recommend implementing **Twilio SMS** as a backup service:

### Benefits:
- Works immediately (no dashboard setup)
- Direct API integration
- Pay-per-use pricing
- Better control for native mobile app

### Implementation:
- Keep Omnisend for contact management
- Add Twilio for direct SMS sending
- Fallback chain: Twilio → Manual SMS

## Cost Comparison

**Omnisend Standard Plan:**
- $16/month + SMS costs
- Includes email marketing automation
- Good for overall marketing

**Twilio SMS:**
- No monthly fee
- ~$0.02 per SMS to Australia
- SMS-only solution

For a coffee shop sending ~100 SMS/month:
- Omnisend: $16 + ~$5 = $21/month
- Twilio: ~$2/month (SMS only)

## Next Steps

Choose your preferred approach:

1. **Upgrade Omnisend** → Follow original automation setup guide
2. **Add Twilio integration** → I can implement this now (recommended)
3. **Keep manual SMS** → Current fallback working

Which option would you prefer?