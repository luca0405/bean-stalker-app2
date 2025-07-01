# Bean Stalker - Coffee Shop PWA

## Overview

Bean Stalker is a full-stack Progressive Web Application (PWA) for a coffee shop, enabling customers to browse menus, place orders, manage credits, and receive notifications. The application supports both customer and admin interfaces with real-time order tracking and payment processing.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server components:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom theme support
- **State Management**: React Context API for cart, notifications, and app state
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **PWA Features**: Service Worker for offline support and push notifications

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session management
- **File Handling**: Multer for image uploads
- **Payment Processing**: Square API integration

## Key Components

### Database Layer
- **Schema**: Drizzle-based schema with tables for users, menu items, orders, favorites, and push subscriptions
- **Primary Tables**:
  - `users`: User accounts with admin privileges and credit balances
  - `menuItems`: Product catalog with pricing and options
  - `orders`: Order history and status tracking
  - `menuCategories`: Organized menu sections
  - `pushSubscriptions`: Device notification endpoints

### Authentication System
- Session-based authentication with secure password hashing (scrypt)
- Role-based access control (admin/customer)
- Password reset functionality via email
- QR code generation for user identification

### Payment Integration
- Square Payment API for credit purchases
- Credit-based ordering system
- Transaction history tracking
- Administrative credit management

### Notification System
- Web Push API for modern browsers
- iOS Safari alternative polling system
- Real-time order status updates
- Administrative notifications for new orders

### PWA Features
- Service Worker for offline functionality
- App installation prompts
- Responsive design for mobile-first experience
- Safe area handling for notched devices

## Data Flow

1. **User Authentication**: Users log in through the auth page, establishing a session
2. **Menu Browsing**: Real-time menu data fetched from the database with category filtering
3. **Cart Management**: Client-side cart state with persistent storage
4. **Order Processing**: Cart items converted to database orders with credit deduction
5. **Notification Delivery**: Push notifications sent on order status changes
6. **Admin Management**: Separate admin interface for menu and user management

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **square**: Payment processing and restaurant management SDK
- **web-push**: Push notification service
- **passport**: Authentication middleware
- **multer**: File upload handling

### Restaurant Management
- **Square for Restaurants API**: Enhanced order processing and kitchen management
- **Real-time Kitchen Display System**: Order status tracking and workflow management
- **Inventory Management**: Stock level monitoring and menu synchronization

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: Production build bundling
- **tailwindcss**: Utility-first CSS framework

## Deployment Strategy

The application supports multiple deployment targets:

### Web Deployment (Replit)
- Development: `npm run dev` using tsx for hot reloading
- Production: `npm run build` creating optimized client and server bundles
- Database: `npm run db:push` for schema synchronization
- **Platform**: Replit autoscale deployment
- **Database**: PostgreSQL 16 module
- **Port Configuration**: Internal port 5000, external port 80
- **Environment**: Node.js 20 runtime

### Mobile App Deployment (Capacitor)
- **Framework**: Capacitor for native iOS and Android apps
- **Build Process**: `npm run build` followed by `npx cap sync`
- **iOS Testing**: Xcode simulator and device testing (Mac required)
- **Android Testing**: Android Studio emulator and device testing
- **Distribution**: App Store and Google Play Store ready

### File Structure
- `client/`: React frontend application
- `server/`: Express.js backend API
- `shared/`: Common TypeScript types and schemas
- `migrations/`: Database migration files

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Square for Restaurants integration completed
  - Added Kitchen Display System with real-time order tracking
  - Implemented restaurant-specific order management
  - Created inventory management and menu synchronization
  - Added mobile app support with Capacitor
  - Enhanced admin interface with restaurant operations
- June 26, 2025. Square Orders API integration completed
  - Bean Stalker orders now automatically sync to Square sandbox account
  - Configured for AUD currency (location LKTZKDFJ44YZD)
  - Orders include payment processing for dashboard visibility
  - Real-time order creation with proper Square formatting
  - Credit-based payment representation: Orders show "BEAN STALKER APP CREDITS" in payment notes
  - Resolved dashboard visibility issues - orders now appear in Square Point of Sale interface
- June 26, 2025. Automatic Square sync integration activated
  - Orders automatically sync to Square dashboard when placed through Bean Stalker app
  - Real-time sync of all Bean Stalker orders to Square sandbox account
  - Credit transaction processing fully operational with proper balance calculations
  - Push notifications working for admin users on new orders
- June 26, 2025. Premium membership signup integration completed
  - Added professional Suno-style authentication page with dark theme
  - Integrated AUD$69 premium membership option into registration flow
  - Square payment processing framework ready for membership fees
  - Dynamic button text updates based on membership selection
  - Resolved React authentication crashes with stable implementation
- June 26, 2025. Premium membership made mandatory for all new users
  - All new registrations automatically include AUD$69 premium membership
  - Updated authentication interface to show premium membership as included benefit
  - Simplified registration flow with mandatory premium features
  - Enhanced user onboarding with immediate credit balance
- June 26, 2025. Professional home page and navigation redesign completed
  - Redesigned header with dark green gradient theme and "Premium Coffee Experience" branding
  - Replaced QR icon with authentic QrCode appearance from Lucide React
  - Updated Available Balance card with professional dark green gradient (green-800 to green-900)
  - Created dashboard-style home page layout with responsive grid system
  - Added Quick Actions card with navigation shortcuts
  - Redesigned Recent Orders section with modern card layout and status badges
  - Added comprehensive Account Summary card with membership status and statistics
  - Improved overall visual hierarchy and professional appearance while maintaining Bean Stalker brand colors
- June 26, 2025. Credit card payment form implementation completed
  - Resolved CORS security issue blocking Square.js external CDN script loading
  - Created custom HTML credit card form with validation and auto-formatting
  - Updated backend payment processing to handle direct card data input
  - Added test card validation (4111 1111 1111 1111) for sandbox testing
  - Improved form layout with properly sized CVV and expiry date fields
- June 26, 2025. Square dashboard payment integration completed
  - Card number formatting now adds spaces every 4 digits automatically as you type
  - Expiry date formatting automatically adds slash after MM (e.g., "12/25")
  - Professional success popup modal with green checkmark and "Start Ordering" button
  - Real Square API payment processing - payments now appear in Square dashboard
  - Payment status shows "COMPLETED" with receipt URLs and proper transaction IDs
  - All AUD$69 membership payments processed through authentic Square sandbox
  - Fixed card formatting issue - now working perfectly with real-time formatting
  - Added customer name and email integration - member details now appear in Square dashboard
  - Payment notes include "Bean Stalker Premium Membership" with member name for better tracking
- June 26, 2025. Home page layout optimization completed
  - Restored original four action boxes in 2x2 grid layout with distinct gradient backgrounds
  - Fixed runtime errors by adding missing Coffee and Settings imports from lucide-react
  - Repositioned "Order Your Favorites" section directly below Available Balance card
  - Updated member initials with green gradient background matching brand theme
  - Improved visual hierarchy with Order Coffee & Food (green), Buy Credits (blue), Send Credits (purple), Profile Settings (orange)
  - Enhanced user experience with proper action box positioning and color differentiation
- June 30, 2025. Mobile-first design optimization for App Store distribution
  - Redesigned enhanced buy credits component for mobile-only usage (no web platform support)
  - Optimized layout with scrollable container (65vh max height) for mobile phone screens
  - Simplified to App Store In-App Purchase only - removed web payment options
  - Created horizontal card layout with compact design for better mobile experience
  - Integrated RevenueCat IAP framework for cross-platform mobile payments (iOS/Android)
  - Added mobile-optimized touch targets and spacing for phone interaction
- June 30, 2025. Menu page 2-column layout optimization completed
  - Redesigned menu page with mobile-first 2-column grid layout for optimal phone viewing
  - Enhanced visual appeal with gradient backgrounds and professional styling
  - Optimized menu item cards for mobile display with compact design and hover effects
  - Added gradient category headers with item counts for better organization
  - Streamlined size selection and flavor options using compact dropdown selects
  - Redesigned add-to-cart buttons with price display for improved mobile interaction
- June 30, 2025. Enhanced cart system with premium mobile experience
  - Redesigned cart items with smooth animations and professional mobile-optimized design
  - Added cart persistence using localStorage to maintain cart state between sessions
  - Enhanced cart dialog with gradient header, animated empty state, and improved mobile layout
  - Implemented cart item animations including remove animations and quantity changes
  - Added detailed price breakdown with subtotal, service fee, and animated total updates
  - Created cart success animation component for visual feedback when items are added
  - Improved mobile touch targets and enhanced user experience with framer-motion animations
- June 30, 2025. Bidirectional Square Kitchen Display sync system completed
  - Enhanced admin credit verification interface with tabbed view for pending and verified transfers
  - Added comprehensive API endpoints for all credit transfer data with verifier tracking
  - Implemented Square webhook handler for real-time order status updates from Kitchen Display
  - Created bidirectional sync: Bean Stalker orders → Square Kitchen + Square Kitchen → Bean Stalker app
  - Added automatic push notifications when kitchen staff update order status
  - Orders now sync in both directions with proper status mapping and customer notifications
- June 30, 2025. TestFlight GitHub Actions deployment system completed
  - Created complete cloud-based iOS build system using GitHub Actions
  - Added automated TestFlight upload workflow for App Store distribution
  - Configured bundle ID as com.beanstalker.member to match App Store Connect setup
  - Eliminated local Xcode compilation issues with cloud-based builds
  - Created comprehensive setup documentation for Apple Developer certificates and provisioning
  - Updated workflow to use official Apple GitHub Actions for improved reliability
  - Configured proper Xcode setup and certificate management for iOS builds
  - Fixed Capacitor web directory configuration to resolve build failures
  - Corrected GitHub Actions to use proper Vite build command for mobile builds
  - Resolved iOS code signing conflicts by using dedicated build action for certificate management
  - Fixed bundle ID mismatch: Updated iOS project from com.beanstalker.app to com.beanstalker.member
  - Enhanced certificate import process with explicit keychain management and debugging output
  - Implemented dynamic provisioning profile UUID extraction and proper export configuration
  - Changed iOS project code signing from Automatic to Manual to properly use provisioning profiles
  - Fixed YAML syntax errors in workflow and simplified export options configuration
  - Added CocoaPods installation step to resolve "no such module 'Capacitor'" Swift compilation error
  - Fixed iOS architecture compatibility: Updated Podfile to use arm64 for Release builds instead of x86_64
  - Resolved CocoaPods code signing conflict: Pod targets now use automatic signing while App target uses manual
  - Applied aggressive code signing isolation: Completely disabled signing for frameworks and automated cleanup
  - Switched to automatic signing during build phase, manual signing only at export to eliminate provisioning conflicts
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Typography: Manrope font family across the entire application.
```