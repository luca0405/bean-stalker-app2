# Omnisend SMS Troubleshooting Guide

## Quick Checklist

If SMS is not working after setting up the campaign, check these items:

### ✅ Required Omnisend Setup
- [ ] SMS automation created with trigger: `credit_share`
- [ ] SMS template configured with dynamic properties
- [ ] Automation is activated (not draft)
- [ ] Omnisend account has SMS credits/plan

### ✅ Bean Stalker App Status
- [ ] Omnisend API key configured in Replit Secrets
- [ ] API connection test successful (returns 200)
- [ ] Contact creation working (check Omnisend contacts list)
- [ ] Events being triggered (check automation performance)

## Step-by-Step Testing

### Test 1: Verify API Connection
```bash
curl -X POST "http://localhost:5000/api/test-omnisend" -H "Content-Type: application/json" -d '{}'
```
Expected result: `{"configured":true,"testResult":{"success":true}}`

### Test 2: Check Contact Creation
1. Use Share Credits with any phone number
2. Go to Omnisend dashboard → Contacts
3. Verify new contact appears with SMS channel

### Test 3: Check Event Triggering
1. Complete a credit share transaction
2. Go to Omnisend dashboard → Automations → Your credit_share automation
3. Click "Performance" tab
4. Verify events appear in the log

### Test 4: Check SMS Delivery
1. Use your own phone number for testing
2. Complete credit share
3. Check phone for SMS within 2 minutes
4. Check automation performance for delivery status

## Common Issues & Solutions

### Issue: "No SMS received"
**Check:**
- Automation is activated (not paused/draft)
- Phone number format is correct (+61 for Australia)
- Omnisend account has SMS credits
- SMS template uses correct property names

### Issue: "Contact not created"
**Check:**
- API key is valid and has correct permissions
- Phone number format is international (+61...)
- Check browser console for API errors

### Issue: "Event not triggered"
**Check:**
- Event name is exactly: `credit_share` (case sensitive)
- Properties are being sent correctly
- Automation trigger matches event name

### Issue: "SMS template not working"
**Fix:**
Use these exact property names in your SMS template:
- `{{properties.credit_amount}}`
- `{{properties.sender}}`
- `{{properties.verification_code}}`

## Current Event Data Structure

The Bean Stalker app sends these properties with each `credit_share` event:

```json
{
  "eventName": "credit_share",
  "eventID": "bean_stalker_credit_1234567890",
  "contact": {
    "phone": "+61400123456"
  },
  "properties": {
    "credit_amount": "5.00",
    "verification_code": "123456",
    "full_message": "🎁 You've received $5.00 Bean Stalker credits from John! Show this code at our store: 123456. Valid for 24 hours. Bean Stalker Coffee Shop",
    "sender": "Bean Stalker",
    "timestamp": "2025-01-08T02:30:00.000Z"
  }
}
```

Use these property names in your Omnisend SMS template.

## Alternative: Manual Testing

If automation isn't working, you can test manually:

1. **Create a test contact manually in Omnisend**
2. **Send a test SMS campaign to that contact**
3. **Verify SMS delivery works**
4. **Then troubleshoot the automation trigger**

This helps isolate whether the issue is with SMS sending or event triggering.

## Need Immediate SMS?

While setting up Omnisend automation, the app will fall back to manual SMS sending through the device messaging app. Users can still share credits - they just need to send the SMS manually until automation is configured.