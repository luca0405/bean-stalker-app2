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