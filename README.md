# Bean Stalker - Coffee Shop PWA

A cutting-edge Progressive Web Application for Bean Stalker coffee shop, delivering an immersive digital coffee ordering experience with advanced user engagement and personalization technologies.

## 🚀 Features

### Customer Experience
- **Mobile-First Design**: Optimized for smartphones with professional UI/UX
- **Premium Membership**: Mandatory AUD$69 membership with instant credit balance
- **Real-Time Ordering**: Browse menu, customize orders, and track status
- **Push Notifications**: Get notified when your order is ready
- **Credit System**: Buy and share credits with friends and family
- **PWA Support**: Install on your phone like a native app

### Admin Management
- **Order Management**: Real-time order tracking and status updates
- **Menu Management**: Add, edit, and categorize menu items
- **Credit Verification**: Manage credit transfers and sharing
- **User Management**: View and manage customer accounts
- **Square Integration**: Sync with Square Kitchen Display System

### Restaurant Operations
- **Square for Restaurants**: Full integration with Square payment system
- **Kitchen Display Sync**: Bidirectional sync between Bean Stalker and Square
- **Real-Time Status Updates**: Orders sync automatically between systems
- **Payment Processing**: Secure credit card payments via Square API

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** with shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for client-side routing
- **Framer Motion** for animations
- **Service Worker** for offline support

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **Square API** for payments and restaurant integration
- **Web Push API** for notifications

### Mobile App
- **Capacitor** for iOS and Android deployment
- **RevenueCat** for in-app purchases
- **Native Biometric** authentication support

## 📱 Installation & Setup

### Prerequisites
- Node.js 20 or higher
- PostgreSQL database
- Square developer account

### Environment Variables
Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# Square Integration
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_LOCATION_ID=your_square_location_id

# Email Service
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password

# RevenueCat (for mobile)
VITE_REVENUECAT_API_KEY=your_revenuecat_key
```

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   npm run db:push
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Web: `http://localhost:5000`
   - Admin: Login with admin credentials

### Mobile App Build

1. **Build for mobile:**
   ```bash
   npm run build
   npx cap sync
   ```

2. **iOS (requires macOS):**
   ```bash
   npx cap run ios
   ```

3. **Android:**
   ```bash
   npx cap run android
   ```

## 🏗 Project Structure

```
bean-stalker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # API and utility services
├── server/                 # Express backend
│   ├── auth.ts            # Authentication logic
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   └── square-*.ts        # Square integrations
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and types
├── android/               # Android app files
├── ios/                   # iOS app files
└── uploads/               # User uploaded files
```

## 🔄 Square Integration

### Kitchen Display System
- Orders automatically sync from Bean Stalker to Square
- Kitchen staff can update order status in Square
- Status updates sync back to Bean Stalker
- Customers receive push notifications on status changes

### Payment Processing
- Premium membership payments via Square
- Secure credit card processing
- Real-time payment verification
- Transaction history tracking

## 🚀 Deployment

### Web Deployment (Replit)
```bash
npm run build
```

### Mobile App Store
1. **Build production app:**
   ```bash
   npm run build
   npx cap sync
   ```

2. **iOS App Store:**
   - Open `ios/App/App.xcworkspace` in Xcode
   - Configure signing and build for release

3. **Google Play Store:**
   - Open `android/` folder in Android Studio
   - Build signed APK/AAB for release

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes and commit:**
   ```bash
   git commit -m "Add your feature"
   ```
4. **Push to your fork and create a Pull Request**

### Development Guidelines
- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure mobile compatibility

## 📄 API Documentation

### Authentication
- `POST /api/register` - Create new user account
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status

### Square Integration
- `POST /api/square/webhook` - Square webhook endpoint
- `POST /api/square/kitchen/sync` - Sync orders to Square
- `GET /api/square/kitchen/orders` - Get kitchen display orders

### Credits
- `POST /api/share-credits` - Share credits with others
- `POST /api/verify-credit-share` - Verify credit transfer
- `GET /api/admin/credit-transfers` - Admin credit management

## 📞 Support

For technical support or questions:
- Create an issue in this repository
- Contact the development team

## 📜 License

This project is proprietary software for Bean Stalker coffee shop.

---

**Bean Stalker** - Premium Coffee Experience 🚀