# CRITICAL RevenueCat User ID Fix

## The Problem
- RevenueCat is using hardcoded user ID "32" instead of dynamic user IDs
- Membership payment isn't working properly
- Native payment popups not showing

## Root Causes Found
1. `SandboxForceOverride.initializeForcesSandbox()` was called without user ID
2. Authentication hooks aren't properly setting RevenueCat user ID
3. Membership registration flow missing proper user ID setup

## Immediate Fixes Applied

### 1. Fixed Authentication Hook
- Added proper user ID validation with type checking
- Enhanced RevenueCat initialization after login/registration
- Added biometric credential auto-save after password login

### 2. Fixed Membership Payment Flow
- Updated auth-page-mobile.tsx to explicitly set RevenueCat user ID before purchase
- Added proper user ID setup: `await iapService.setUserID(newUser.id.toString())`
- Added 1-second delay for RevenueCat to process user change

### 3. Fixed IAP Service User ID
- Enhanced `setUserID()` method with proper error handling
- Updated `initializeWithUserID()` to accept dynamic user IDs
- Fixed SandboxForceOverride to use provided user IDs

## Testing Instructions
1. Create new account or login with existing account
2. User ID should be automatically set in RevenueCat (check console logs)
3. Membership payment should show native payment popup
4. Credit packages should use user's actual ID, not "32"

## Expected Console Logs
```
RevenueCat initialized after login with user ID: [actual_user_id]
Setting RevenueCat user ID for new user before purchase: [actual_user_id]
IAP: User login successful: [actual_user_id]
```

## Key Files Modified
- client/src/hooks/use-auth.tsx (authentication hooks)
- client/src/pages/auth-page-mobile.tsx (membership payment)
- client/src/services/iap-service.ts (user ID management)
- client/src/hooks/use-iap.tsx (user ID initialization)

## Next Steps
1. Deploy to TestFlight with these fixes
2. Test membership payment with real Apple ID
3. Verify RevenueCat Dashboard shows correct user IDs
4. Test credit packages with different user accounts