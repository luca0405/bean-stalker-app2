# Bean Stalker - Premium Coffee Shop iOS App

A complete Progressive Web Application (PWA) with native iOS app for Bean Stalker coffee shop, featuring premium membership, in-app purchases, and real-time order management.

## 🚀 Features

### Customer Experience
- **Premium Membership** - AUD$69 membership with starting credits
- **Coffee Menu** - Browse 33+ specialty coffee items and food
- **Real-time Ordering** - Place orders with live status tracking
- **In-App Purchases** - Buy credits via RevenueCat integration
- **Biometric Authentication** - Touch ID/Face ID support
- **Push Notifications** - Order status updates and promotions

### Business Management
- **Square Integration** - Kitchen Display System sync
- **Admin Dashboard** - Order management and user administration
- **Credit System** - Flexible credit-based payment system
- **Analytics** - Order tracking and business insights

## 📱 iOS App Distribution

### Bundle ID: `com.beanstalker.member`

### TestFlight Setup
- **Xcode Cloud** - Automated builds and TestFlight uploads
- **Internal Testing** - Immediate testing for team members
- **External Testing** - Beta testing for customers

### Test Account
- **Username:** iamninz
- **Password:** password123
- **Email:** ninz@myma.com.au

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** - Professional UI styling
- **shadcn/ui** - Modern component library
- **Capacitor** - Native iOS integration
- **PWA** - Offline support and installable

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Drizzle ORM
- **Square API** - Payment processing and kitchen integration
- **RevenueCat** - Cross-platform IAP management
- **Web Push API** - Real-time notifications

### Mobile
- **Capacitor iOS** - Native app wrapper
- **RevenueCat** - In-App Purchase system
- **Biometric Auth** - Native authentication
- **Push Notifications** - Native notification support

## 🔧 Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Square Developer account
- Apple Developer account
- Xcode 15+

### Installation
```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Start development server
npm run dev

# Build iOS app
npm run build
npx cap sync ios
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
SQUARE_ACCESS_TOKEN=sandbox-sq0atb-...
SQUARE_APPLICATION_ID=sandbox-sq0idb-...
SQUARE_LOCATION_ID=LRQ926HVH9WFD
SQUARE_WEBHOOK_SIGNATURE_KEY=...
```

## 📋 Deployment

### Web Deployment (Replit)
- **Platform:** Replit Autoscale
- **URL:** https://member.beanstalker.com.au
- **Database:** PostgreSQL 16
- **Runtime:** Node.js 20

### iOS Deployment
1. **Xcode Cloud** - Automated builds
2. **TestFlight** - Beta distribution
3. **App Store** - Production release

## 🏪 Business Integration

### Square for Restaurants
- **Kitchen Display** - Real-time order management
- **POS Integration** - Unified payment processing
- **Inventory Sync** - Menu item availability
- **Reporting** - Sales and analytics

### Revenue Streams
- **Premium Memberships** - AUD$69 annual
- **Credit Packages** - AUD$10-100 denominations
- **Order Commissions** - Per-transaction fees

## 📈 Metrics & Analytics

### Key Performance Indicators
- **Monthly Active Users** - App engagement
- **Conversion Rate** - Free to premium membership
- **Average Order Value** - Revenue per transaction
- **Customer Retention** - Repeat purchase rate

## 🔐 Security & Compliance

### Data Protection
- **Session Management** - Secure authentication
- **Payment Security** - PCI DSS compliant via Square
- **Data Encryption** - TLS/SSL throughout
- **Privacy Controls** - GDPR/CCPA ready

### App Store Guidelines
- **Content Rating** - 4+ (suitable for all ages)
- **Privacy Policy** - Comprehensive data handling
- **Terms of Service** - User agreement
- **In-App Purchase** - Clear value proposition

## 📞 Support & Maintenance

### Customer Support
- **Email:** support@beanstalker.com.au
- **In-App Help** - Integrated support system
- **FAQ** - Common questions and answers

### Technical Support
- **Monitoring** - 24/7 system monitoring
- **Updates** - Regular feature releases
- **Bug Fixes** - Rapid issue resolution

## 📊 Project Status

### Current Phase: TestFlight Distribution
- ✅ iOS app development complete
- ✅ Xcode Cloud workflow configured  
- ✅ RevenueCat IAP integration ready
- ✅ Square Kitchen Display operational
- ⏳ App Store Connect product setup
- ⏳ TestFlight beta testing
- ⏳ App Store submission

### Next Milestones
1. **Complete IAP Setup** - App Store Connect products
2. **Beta Testing** - TestFlight distribution
3. **App Store Review** - Submission and approval
4. **Production Launch** - Public availability

---

**Bean Stalker** - Premium Coffee Experience
Built with ❤️ for coffee lovers everywhere