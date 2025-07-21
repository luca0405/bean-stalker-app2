# Square Production API Setup Guide

## Moving from Sandbox to Production

### Current Sandbox Configuration
Your Bean Stalker app is currently using:
- **Location ID**: `LRQ926HVH9WFD` (Beanstalker Sandbox)
- **Application ID**: `sandbox-sq0idb-0f_-wyGBcz7NmblQtFkv9A`
- **Environment**: Sandbox (testing)

### Production Setup Requirements

To switch to production Square API keys, you need:

#### 1. Production Square Account
- **Square Business Account** (not Developer Sandbox)
- **Verified business information** in Square Dashboard
- **Active Square for Restaurants** subscription (if using Kitchen Display)

#### 2. Production API Credentials
You'll need to obtain these from your **LIVE Square Dashboard**:

**Required Production Secrets:**
- `SQUARE_ACCESS_TOKEN` → Production access token (starts with `sq0atp-`)
- `SQUARE_APPLICATION_ID` → Production app ID (starts with `sq0idp-`)
- `SQUARE_LOCATION_ID` → Your actual business location ID
- `SQUARE_WEBHOOK_SIGNATURE_KEY` → Production webhook signature key

#### 3. Differences Between Sandbox and Production

| Aspect | Sandbox | Production |
|--------|---------|------------|
| Payments | Test only | Real money |
| Access Token | `sandbox-sq0atb-*` | `sq0atp-*` |
| Application ID | `sandbox-sq0idb-*` | `sq0idp-*` |
| Kitchen Display | Test orders | Real orders |
| Webhooks | Test events | Live events |

### Steps to Switch to Production

#### Step 1: Get Production Credentials

**Go to Square Dashboard (Production):**
1. **Developer Dashboard** → Applications
2. **Create new application** or use existing production app
3. **Copy Production Application ID** (`sq0idp-*`)
4. **Generate Production Access Token** (`sq0atp-*`)
5. **Find your Location ID** in Locations section
6. **Set up Production Webhook** with signature key

#### Step 2: Update Bean Stalker Secrets

Replace these Replit secrets with production values:
```bash
SQUARE_ACCESS_TOKEN=sq0atp-PRODUCTION_TOKEN_HERE
SQUARE_APPLICATION_ID=sq0idp-PRODUCTION_APP_ID_HERE  
SQUARE_LOCATION_ID=YOUR_ACTUAL_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY=PRODUCTION_WEBHOOK_KEY
```

#### Step 3: Configure Production Webhooks

**In Square Developer Dashboard:**
- **Webhook URL**: `https://member.beanstalker.com.au/api/square/webhook`
- **Events**: Order state changes, payment updates
- **Signature Key**: Use for webhook verification

#### Step 4: Test Production Integration

1. **Place a real order** through Bean Stalker
2. **Verify payment processing** in Square Dashboard
3. **Check Kitchen Display** shows live orders
4. **Test webhook notifications** for order updates

### Important Considerations

#### Financial Impact
- **Production payments are REAL** - customers will be charged
- **Test carefully** with small amounts first
- **Monitor transactions** in Square Dashboard

#### Business Operations
- **Kitchen staff** will see real orders in Square for Restaurants
- **Order notifications** will be sent to actual customers
- **Credit purchases** will process real payments through Square

#### Compliance
- **PCI compliance** requirements for handling real payments
- **Data privacy** regulations for customer information
- **Business licenses** and permits as required

### Testing Production Setup

#### Safe Testing Approach
1. **Start with small test purchases** ($1-5)
2. **Use your own payment methods** for initial testing
3. **Verify end-to-end flow** before announcing to customers
4. **Monitor Square Dashboard** for successful transactions

#### Validation Checklist
- [ ] Orders appear in production Square Dashboard
- [ ] Real payments are processed correctly
- [ ] Kitchen Display shows live orders
- [ ] Customers receive proper notifications
- [ ] Credit purchases add actual credits
- [ ] Webhook updates work in real-time

### Rollback Plan

If issues occur, you can quickly revert to sandbox:
1. **Change secrets back** to sandbox values
2. **Test functionality** with sandbox environment
3. **Debug issues** before switching back to production

Your Bean Stalker app is fully ready for production Square API keys - just update the credentials!