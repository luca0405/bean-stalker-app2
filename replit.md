# Bean Stalker - Coffee Shop Native Mobile App

## Overview
Bean Stalker is a full-stack native mobile application for coffee shop customers and administrators. It enables customers to browse menus, place orders, manage credits, and receive real-time notifications. The application also provides an admin interface for order tracking and payment processing. The core vision is to provide a seamless mobile ordering experience with native app performance and distribution.

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
- **Native Mobile Focus**: Built with Capacitor for iOS and Android, supporting native biometric authentication, push notifications, safe area handling, and optimized scrolling.
- **Payment System**: Integrated with Square Payment API for credit purchases and a credit-based ordering system.
- **Notification System**: Utilizes Web Push API and Capacitor Local Notifications for real-time order status updates. Bidirectional sync with Square Kitchen Display System.
- **Authentication & User Management**: Session-based authentication with secure password hashing, role-based access control, password reset, and multi-device login support. Remembers last used username.
- **UI/UX**: Consistent dark green gradient theme (`green-800`). Popups are full-screen overlays with proper z-index and safe area handling. Product details use native HTML select elements.
- **Image Handling**: Robust image loading with authentic Square catalog images, fallbacks for server images, base64 SVG icons, and category-specific fallbacks. Direct API fetching ensures product images display correctly even when Square's related objects don't include image data.
- **In-App Purchases (IAP)**: Integrated with RevenueCat for managing iOS/Android IAPs, supporting various credit packages and a premium membership with webhook handling for credit processing.
- **Square Catalog Synchronization**: Real-time menu item and category fetching directly from Square's live catalog with authentic product images.
- **Square Image Integration**: Direct fetching of product images via Square Catalog Objects API when related objects aren't returned, ensuring authentic product visuals display correctly.
- **Square KDS Integration**: Orders appear in Square POS dashboard and KDS, with zero-amount cash payments for credit-based orders, COMPLETED payment status, RESERVED fulfillment state, and scheduled pickup timing.
- **Sales Channel Filtering**: Intelligent filtering to display only Bean Stalker specific categories and items from Square's catalog using sales channel IDs and category name matching.
- **Location-First Filtering**: Prioritizes Bean Stalker location ID (LW166BYW0A6E0) as the primary filter for items.

## External Dependencies
- **Database**: @neondatabase/serverless (PostgreSQL)
- **ORM**: drizzle-orm
- **State Management**: @tanstack/react-query
- **UI Components**: @radix-ui/*
- **Payment Processing**: Square API (for credit purchases, restaurant management, real-time kitchen display sync, and production environment only)
- **Push Notifications**: web-push, @capacitor/local-notifications
- **Authentication**: passport
- **File Uploads**: multer
- **In-App Purchases**: RevenueCat (for iOS/Android IAP)
- **SMS**: Twilio (for message delivery), Omnisend (for contact management)
- **Build Tools**: vite, tsx, esbuild, tailwindcss