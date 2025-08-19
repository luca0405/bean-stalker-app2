# Bean Stalker - Coffee Shop Native Mobile App

## Overview
Bean Stalker is a full-stack native mobile application designed for coffee shop customers and administrators. Built with Capacitor for iOS and Android, it enables customers to browse menus, place orders, manage credits, and receive real-time notifications. The application supports an admin interface for order tracking and payment processing. The core vision is to provide a seamless mobile ordering experience, prioritizing native app performance and distribution through TestFlight and App Store.

## User Preferences
Preferred communication style: Simple, everyday language.
Typography: Manrope font family across the entire application.
Application Type: NATIVE MOBILE APP - Always prioritize native iOS/Android solutions over web-based approaches.
Primary Deployment: TestFlight and App Store distribution via Capacitor framework.

## System Architecture
The application features a modern full-stack architecture optimized for native mobile deployment.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom theme support
- **State Management**: React Context API
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: Wouter

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js (session-based, role-based access control)
- **File Handling**: Multer for image uploads

### Key Features & Design Decisions
- **Native Mobile Focus**: Built with Capacitor for iOS and Android, supporting native biometric authentication and push notifications. Prioritizes native UI/UX, including safe area handling and optimized scrolling behavior (pure native iOS touch scrolling with hidden scrollbars).
- **Payment System**: Integrated with Square Payment API for credit purchases and a credit-based ordering system. Supports both customer credit management and administrative oversight.
- **Notification System**: Utilizes Web Push API for general notifications and Capacitor Local Notifications for native push, providing real-time order status updates to customers and administrators. Bidirectional sync with Square Kitchen Display System for real-time order management.
- **Authentication & User Management**: Session-based authentication with secure password hashing. Features role-based access control, password reset, and traditional multi-device login support. Users can login on multiple devices with the same account. Last used username is remembered for convenience.
- **UI/UX**: Consistent dark green gradient theme (`green-800`) across the application, including headers, cards, and buttons. Popups are designed as full-screen overlays with proper z-index management and safe area handling for notched devices. Product details utilize native HTML select elements for mobile-friendly option selection.
- **Image Handling**: Robust image loading with fallbacks for native apps, including server images, base64 SVG icons, and category-specific fallbacks.
- **In-App Purchases (IAP)**: Integrated with RevenueCat for managing iOS/Android IAPs, supporting various credit packages and a premium membership. Webhook handling ensures automatic credit processing upon purchase.

## External Dependencies
- **Database**: @neondatabase/serverless (PostgreSQL)
- **ORM**: drizzle-orm
- **State Management**: @tanstack/react-query
- **UI Components**: @radix-ui/*
- **Payment Processing**: Square API (for credit purchases, restaurant management, and real-time kitchen display sync)
- **Push Notifications**: web-push, @capacitor/local-notifications
- **Authentication**: passport
- **File Uploads**: multer
- **In-App Purchases**: RevenueCat (for iOS/Android IAP with multi-strategy new user registration support)
- **Build Tools**: vite, tsx, esbuild, tailwindcss

## Recent Major Updates (January 2025)
- **Traditional Account System Implementation**: Replaced "One Account Per Device" with flexible multi-device login system. Users can now login on multiple devices with the same credentials while maintaining security.
- **RevenueCat User ID Mapping**: Fixed all hardcoded user IDs ("32", "45") in diagnostic components. Enhanced user ID assignment with 3-strategy retry system specifically optimized for new user registration scenarios.
- **$69 Membership Credit Fix (January 8, 2025)**: Permanently resolved the persistent issue where new premium members weren't receiving their $69 credits after Apple Pay purchase. Implemented server-side credit addition during registration, eliminating all session timing dependencies. Credits are now added immediately and reliably for every new premium member.
- **Apple Wallet Credit Balance Integration (January 8, 2025)**: Implemented complete Apple Wallet integration for credit balance display. Features include store card format showing current balance, real-time updates via push notifications, server-side pass generation, and seamless iOS Wallet integration. Added Apple Wallet buttons to both home page Available Balance card and profile page for easy access. Note: Requires Pass Type ID certificate setup in Apple Developer portal and proper .p12 certificate export with private key association.
- **Omnisend SMS Integration for Share Credits (January 8, 2025)**: Integrated Omnisend SMS service as the default SMS provider for the Share Credits feature. The technical integration is complete - API connection established, contacts are created automatically, and events are triggered correctly. However, SMS automation campaign setup is required in the Omnisend dashboard to enable actual SMS sending. Features include intelligent phone number formatting for Australian numbers, comprehensive error handling, and fallback to manual SMS when automation isn't configured.
- **Omnisend Basic Plan Compatibility (January 8, 2025)**: Updated integration to handle Omnisend basic plans that don't include custom event triggers. App now gracefully falls back to manual SMS while still creating contacts for future marketing campaigns. User receives clear feedback about plan limitations and alternative approaches.
- **Complete Apple Wallet Integration (January 15, 2025)**: Successfully implemented end-to-end Apple Wallet certificate setup and pass generation. Features include Apple Developer Team ID configuration (A43TZWNYA3), PKCS#12 certificate bundle with private key, WWDR certificate validation, server-side pass generation API with user authentication, and working AppleWalletIconButton integration. The system generates signed .pkpass files for credit balance display in iOS Wallet, ready for TestFlight deployment and native testing.
- **Apple Wallet TestFlight Build Fix (January 18, 2025)**: Fixed Apple Wallet integration to work properly in TestFlight builds by using GitHub Secrets during build process (exactly like RevenueCat). Apple Wallet certificates are now injected as environment variables at build time (APPLE_WALLET_CERT_BASE64, APPLE_WALLET_WWDR_BASE64) and fall back to file system for development. Native iOS pass handling uses proper blob URLs with '_system' target for iOS Wallet integration.
- **Apple Wallet Certificate Embedding Solution (January 18, 2025)**: Implemented build-time certificate embedding system to completely resolve TestFlight certificate loading issues. Created `embed-certificates.js` script that embeds Apple Wallet certificates directly into server code as TypeScript constants during GitHub Actions build process. Updated certificate loading priority: 1) Embedded code (TestFlight), 2) File system (Development), 3) Environment variables (Fallback). Enhanced debug endpoint shows exact loading method and certificate sources. This ensures Apple Wallet functionality works reliably in TestFlight builds without runtime environment variable dependencies.
- **Face ID Authentication Fixed and Re-enabled (January 19, 2025)**: Completely resolved Face ID crashes by upgrading to actively maintained @capgo/capacitor-native-biometric plugin (v7.1.13), adding required NSFaceIDUsageDescription iOS permission, and implementing robust error handling with timeout protection. Face ID now works reliably without crashes.
- **Hybrid SMS System Implementation (January 19, 2025)**: Implemented hybrid SMS approach using Twilio for reliable message delivery and Omnisend for contact management. Features include Australian phone number formatting, professional Bean Stalker branded messages, verification codes for credit sharing, and automatic contact storage for future marketing campaigns. Both /api/send-credits and /api/share-credits endpoints now use this hybrid approach.