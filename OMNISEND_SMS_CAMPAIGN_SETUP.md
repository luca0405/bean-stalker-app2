# Step-by-Step: Setting Up Omnisend SMS Campaign for Credit Sharing

## What You Need to Do

Follow these exact steps to configure SMS automation in your Omnisend dashboard so the Bean Stalker app can automatically send SMS messages when users share credits.

## Step 1: Access Your Omnisend Dashboard

1. **Login to Omnisend**
   - Go to: https://app.omnisend.com/
   - Use your Omnisend account credentials

2. **Verify SMS is Available**
   - Look for "SMS" in the main navigation
   - If you don't see SMS, you may need to upgrade your plan

## Step 2: Create the SMS Automation Workflow

1. **Navigate to Automations**
   - Click "Automations" in the left sidebar
   - Click "Create Automation" button

2. **Choose Trigger Type**
   - Select "Custom Event" as the trigger
   - Click "Continue"

3. **Configure Event Trigger**
   - Event Name: `credit_share`
   - This must match exactly (case-sensitive)
   - Click "Continue"

## Step 3: Set Up the SMS Action

1. **Add SMS Action**
   - In the workflow builder, click the "+" button
   - Select "Send SMS" from the actions list

2. **Configure SMS Content**
   Use this exact template (copy and paste):

   ```
   🎁 You've received ${{properties.credit_amount}} Bean Stalker credits from {{properties.sender}}! Show this code at our store: {{properties.verification_code}}. Valid for 24 hours. Bean Stalker Coffee Shop
   ```

3. **SMS Settings**
   - Sender Name: `Bean Stalker`
   - Send immediately: Yes
   - Click "Save"

## Step 4: Set Targeting (Who Gets the SMS)

1. **Audience Settings**
   - Target: "All contacts who trigger this event"
   - No additional filters needed
   - Click "Continue"

## Step 5: Review and Activate

1. **Review Workflow**
   - Check trigger: Custom Event "credit_share"
   - Check action: Send SMS with your template
   - Verify sender name: Bean Stalker

2. **Activate Automation**
   - Click "Activate" button
   - Confirm activation

## Step 6: Test the Integration

1. **Go Back to Bean Stalker App**
   - Navigate to Share Credits page
   - Enter a test phone number (your own)
   - Enter a small amount ($1.00)
   - Click "Send Credits Automatically"

2. **Check Results**
   - You should receive an SMS within 1-2 minutes
   - Check your Omnisend dashboard for delivery stats

## Troubleshooting

### If SMS Doesn't Send:

1. **Check Omnisend Logs**
   - Go to Automations → Your "credit_share" automation
   - Click "Performance" tab
   - Look for triggered events and delivery status

2. **Verify Event Data**
   - Check if events are being received
   - Verify all required properties are present

3. **SMS Plan Check**
   - Ensure your Omnisend plan includes SMS
   - Check SMS credit balance

### If You See Errors:

**"SMS not available"**
- Upgrade Omnisend plan to include SMS features

**"Event not triggering"**
- Double-check event name is exactly `credit_share`
- Verify automation is activated

**"SMS delivery failed"**
- Check phone number format
- Verify SMS credits in your account

## What Happens After Setup

Once configured:
1. User shares credits in Bean Stalker app
2. Contact automatically added to Omnisend
3. Event `credit_share` triggered with credit details
4. SMS sent automatically within 1-2 minutes
5. Success message shown in app

## Expected Costs

- Omnisend SMS typically costs $0.01-$0.05 per SMS
- Check your Omnisend pricing plan for exact rates
- Monitor usage in dashboard

## Need Help?

If you encounter issues:
1. Check the automation performance dashboard
2. Test with your own phone number first
3. Verify the event name matches exactly: `credit_share`
4. Ensure SMS sender name is approved (Bean Stalker)

The Bean Stalker app is already sending the correct data - you just need to set up the automation to process it!