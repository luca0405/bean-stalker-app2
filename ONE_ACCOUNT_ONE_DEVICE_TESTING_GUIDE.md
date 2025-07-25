# One Account Per Device - Testing Guide

## Overview
This guide helps you test the device binding system that ensures only one Bean Stalker account per device, perfect for Apple Wallet integration.

## Testing Environment Setup

### Development Testing (Replit)
```
✅ Device Binding Test component visible in Profile page
✅ Console logs show device binding operations
✅ Full debugging and error messages enabled
```

### Production Testing (TestFlight)
```
✅ Device Binding Test component hidden (production mode)
✅ Clean user experience without debug components
✅ Real device hardware identifiers used
```

## Test Scenarios

### 1. Fresh Installation Test
**Simulates new app download from App Store**

**Steps:**
1. Open Bean Stalker app for first time
2. Register new account (Username: testuser1)
3. Check Profile → Device Binding Test → Run Test
4. Verify: Device automatically bound to testuser1

**Expected Results:**
- ✅ Device Bound: Yes
- ✅ Bound User ID: [testuser1's ID]
- ✅ Current User: testuser1
- ✅ Validation: Valid

### 2. Account Switching Test
**Tests switching to different account on same device**

**Steps:**
1. Login with testuser1 (from Test 1)
2. Go to Profile → Account Management 
3. Click "Switch Account" → Confirm
4. Register new account (Username: testuser2)
5. Run Device Binding Test again

**Expected Results:**
- ✅ Device unbound from testuser1
- ✅ All app data cleared (biometric credentials, cart, etc.)
- ✅ Device automatically bound to testuser2
- ✅ Fresh start experience for testuser2

### 3. App Restart Persistence Test
**Verifies device binding survives app restart**

**Steps:**
1. Login with any account
2. Close app completely (force close)
3. Reopen Bean Stalker app
4. Should show biometric login or auto-login
5. Run Device Binding Test

**Expected Results:**
- ✅ Same user still bound to device
- ✅ No need to login again (biometric or auto-login)
- ✅ Device binding persistent across app sessions

### 4. Uninstall/Reinstall Test
**Tests behavior after app uninstall**

**Steps:**
1. Login with testuser1
2. Uninstall Bean Stalker app completely
3. Reinstall Bean Stalker from App Store
4. Open app → Fresh auth screen
5. Can register testuser2 OR login with testuser1

**Expected Results:**
- ✅ Fresh installation - no previous binding
- ✅ Can register any account (device binding reset)
- ✅ Device binds to new account automatically

### 5. Multiple Account Prevention Test
**Ensures can't have multiple accounts simultaneously**

**Current Implementation:**
- ✅ Device binding automatically switches to new account
- ✅ Previous account data cleared when switching
- ✅ Only one active account per device at any time

## Real World Testing Scenarios

### Family Device Test
```
Scenario: Family iPad used by multiple people
1. Mom registers her account → Device bound to mom
2. Dad wants his account → Uses "Switch Account"
3. All mom's data cleared → Dad registers → Device bound to dad
4. Kids want to order → Use dad's account (one account per device)
```

### Work/Personal Test
```
Scenario: Employee wants separate work account
1. Personal account active on device
2. Employee uses "Switch Account" for work account
3. Device clears personal data → Binds to work account
4. After work: Switch back to personal account
```

### Staff Device Test
```
Scenario: Shared coffee shop iPad for staff orders
1. Staff member 1 registers account → Device bound
2. Staff member 2 shift starts → "Switch Account"
3. Device clears previous data → New staff account
4. Clean separation of staff order history
```

## Development Testing Commands

### Manual Device Binding Check
```javascript
// In browser console (development only)
const deviceService = await import('./src/services/device-service.ts');
const info = await deviceService.getDeviceInfo();
const validation = await deviceService.validateDeviceBinding();
console.log('Device Info:', info);
console.log('Validation:', validation);
```

### Manual Unbind (Reset Test)
```javascript
// Clear all device data for fresh test
const deviceService = await import('./src/services/device-service.ts');
await deviceService.unbindDevice();
// App will now behave like fresh installation
```

## Expected Benefits for Apple Wallet

### Guaranteed User Identity
- ✅ Each device has exactly one verified Bean Stalker account
- ✅ Apple Wallet passes tied to correct user credits
- ✅ No confusion about which account owns the credits

### Simplified Credit Management
- ✅ Credits always sync to the one active account
- ✅ No orphaned wallet passes from old accounts
- ✅ Clean wallet setup when account switches

### Enhanced Security
- ✅ Device-bound transactions ensure proper credit ownership
- ✅ Biometric authentication tied to device-bound account
- ✅ Financial transactions have guaranteed user context

## Troubleshooting

### Device Binding Test Shows "Not Bound"
- Check if user is logged in
- Verify native platform (binding only works on iOS/Android)
- Try manual login to trigger binding

### Switch Account Not Clearing Data
- Check console for unbind errors
- Verify Capacitor Preferences permissions
- Test in production build (some features web-only in dev)

### Multiple Accounts Appearing Possible
- This is expected behavior - switching accounts is allowed
- Device binding switches automatically, doesn't prevent switching
- Previous account data is cleared during switch

## Production Deployment Checklist

- ✅ Device Binding Test component hidden in production
- ✅ Console logging minimized for production
- ✅ Account Switcher available in Profile page
- ✅ Device binding automatic during login/registration
- ✅ Biometric credentials cleared during account switch
- ✅ RevenueCat user ID switches with account binding

This system provides the perfect foundation for Apple Wallet integration while maintaining security and user experience!