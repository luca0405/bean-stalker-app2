# Square KDS Troubleshooting - Orders Not Displaying

## Issue Analysis 🔍
Despite setting up Square KDS in your dashboard, orders are not appearing on your KDS device. The API shows:

**Current Status:**
- ❌ Location `LW166BYW0A6E0` has NO Kitchen Display capability in API
- ❌ NO KDS devices registered to this location
- ✅ Orders are successfully created in Square
- ✅ Orders have proper fulfillment states (PROPOSED)

## Possible Causes & Solutions

### 1. KDS Device Not Properly Connected
**Check:** Is your KDS device showing as "connected" in Square Dashboard?
**Fix:** 
- Re-generate device code in Square Dashboard
- Re-connect your KDS device using new code
- Verify device appears under Settings → Device Management

### 2. Location Mismatch
**Check:** Is your KDS device connected to the correct location?
**Fix:**
- Ensure KDS device is set to location "Bean Stalker" (`LW166BYW0A6E0`)
- Not "My Marketing Assistant" or other locations in your account

### 3. Order Routing Settings
**Check:** Square Dashboard → Settings → KDS Settings
**Required Settings:**
- ✅ "Route online orders to KDS" enabled
- ✅ "Show third-party orders" enabled (for Bean Stalker)
- ✅ Dining options include "To-Go" or "Pickup"

### 4. Order Source Filtering
**Current Issue:** Orders show source as "Bean Stalker Mobile App"
**Possible Fix:** Square may filter orders from unrecognized sources
**Test:** Try changing source name to just "Square" or remove source entirely

### 5. Fulfillment State Requirements
**Current:** Orders are PROPOSED state
**KDS May Require:** Orders in RESERVED or PREPARED state
**Test:** Update fulfillment state after creation

## Quick Diagnostic Tests

### Test 1: Manual Square POS Order
Create an order directly in Square POS → Does it appear on KDS?
- If YES: Issue is with Bean Stalker order format
- If NO: KDS device connection problem

### Test 2: Check KDS Device Status
Square Dashboard → Device Management → Devices
- Should show your KDS device as "Connected"
- Should be assigned to location "Bean Stalker"

### Test 3: Order Source Test
Try orders with different source names:
- "Square POS"
- "Square Online" 
- No source name at all

## Current Test Orders in Square
1. **Order #81**: Black coffee (`bean_stalker_81`)
2. **Order #82**: Egg & Bacon Panini (`bean_stalker_82`) 
3. **Order #83**: White coffee (latest test) (`bean_stalker_83`)

All orders are properly formatted and exist in Square - the issue is KDS device configuration or connectivity.

## Next Steps
1. **Verify KDS device shows as "Connected" in Square Dashboard**
2. **Check order routing settings include third-party sources**
3. **Test with manual Square POS order to isolate the issue**
4. **Consider alternative KDS solution if Square setup is problematic**

The Bean Stalker integration is perfect - we need to solve the Square KDS device connectivity issue.