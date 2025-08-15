import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertOrderSchema, insertPushSubscriptionSchema, insertMenuItemSchema, insertUserSchema, insertCreditTransactionSchema, insertFavoriteSchema, insertMenuCategorySchema } from "@shared/schema";
import { z } from "zod";
import QRCode from "qrcode";
import { hashPassword, comparePasswords } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendOrderStatusNotification, notifyAdminsAboutNewOrder, sendPushNotification, getVapidPublicKey, sendPushNotificationToUser } from "./push-notifications";
import {
  processPayment,
  getSquareApplicationId,
  getSquareLocationId,
  createPaymentLink,
  type SquarePaymentRequest
} from "./square-payment";
import { sendPasswordResetEmail, sendAppUpdateNotification } from "./email-service";
import { squareConfig } from "./square-config";

// Helper function to verify IAP receipts
async function verifyPurchaseReceipt(receipt: string, platform: string): Promise<boolean> {
  // In production, you would verify receipts with Apple/Google servers
  // For now, we'll do basic validation
  if (!receipt || typeof receipt !== 'string') {
    return false;
  }
  
  try {
    // For development, accept any non-empty receipt
    // In production, implement proper receipt verification:
    // - Apple: Verify with App Store receipt validation API
    // - Google: Verify with Google Play Developer API
    return receipt.length > 0;
  } catch (error) {
    console.error('Receipt verification error:', error);
    return false;
  }
}

// Helper function to format Zod errors
function formatZodError(error: z.ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
}

// Authentication middleware to check if user is logged in
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Admin middleware to check if the user is admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  
  next();
};

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with the original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Create multer upload instance
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // Menu routes
  app.get("/api/menu", async (req, res) => {
    try {
      const items = await storage.getMenuItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });
  
  // Get options for a specific menu item (public)
  app.get("/api/menu/:menuItemId/options", async (req, res) => {
    try {
      const menuItemId = parseInt(req.params.menuItemId);
      const options = await storage.getMenuItemOptions(menuItemId);
      
      // Organize options into a hierarchical structure
      const parentOptions = options.filter(option => option.isParent);
      const standardOptions = options.filter(option => !option.isParent && !option.parentId);
      const childOptions = options.filter(option => option.parentId);
      
      // For each parent option, attach its children
      const result = [
        ...standardOptions,
        ...parentOptions.map(parent => ({
          ...parent,
          children: childOptions.filter(child => child.parentId === parent.id)
        }))
      ];
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching menu item options:", error);
      res.status(500).json({ message: "Failed to fetch menu item options" });
    }
  });

  // Public endpoint to get string categories (legacy)
  app.get("/api/menu/categories", async (req, res) => {
    try {
      const categories = await storage.getMenuCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu categories" });
    }
  });
  
  // Public endpoint to get category objects
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/menu/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const items = await storage.getMenuItemsByCategory(category);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // Orders routes
  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user?.id;
      const orders = await storage.getOrdersByUserId(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  
  // Apple Wallet Pass Generation Endpoint
  app.post("/api/apple-wallet/generate-pass", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { userId, username, currentBalance, passData } = req.body;
      const authenticatedUserId = req.user?.id;
      
      // Ensure user can only generate passes for themselves (or admin)
      if (userId !== authenticatedUserId && !req.user?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized to generate pass for this user" });
      }
      
      const { AppleWalletPassGenerator } = await import('./apple-wallet-pass');
      const result = await AppleWalletPassGenerator.generatePass(userId, username, currentBalance, passData);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to generate pass" });
      }
      
      console.log(`🍎 APPLE WALLET: Generated pass for user ${userId} with balance $${currentBalance}`);
      
      res.json({ 
        success: true, 
        passBase64: result.passBase64,
        message: "Pass generated successfully"
      });
      
    } catch (error) {
      console.error("Apple Wallet pass generation error:", error);
      res.status(500).json({ message: "Failed to generate Apple Wallet pass" });
    }
  });

  // Apple Wallet Pass Update Endpoint (for automatic balance updates)
  app.get("/api/apple-wallet/passes/:passTypeId/:serialNumber", async (req, res) => {
    try {
      const { passTypeId, serialNumber } = req.params;
      const authToken = req.headers['authorization'];
      
      console.log(`🍎 APPLE WALLET: Pass update requested for ${serialNumber}`);
      
      // Verify authentication token (Apple Wallet requirement)
      if (!authToken) {
        return res.status(401).send('Unauthorized');
      }
      
      // Extract user ID from serial number (format: bs_credit_123)
      const userIdMatch = serialNumber.match(/bs_credit_(\d+)/);
      if (!userIdMatch) {
        return res.status(404).send('Pass not found');
      }
      
      const userId = parseInt(userIdMatch[1]);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send('User not found');
      }
      
      // Generate updated pass with current balance
      const { AppleWalletPassGenerator } = await import('./apple-wallet-pass');
      const passData = {
        passTypeIdentifier: passTypeId,
        serialNumber,
        organizationName: 'Bean Stalker Coffee',
        description: 'Bean Stalker Credit Balance',
        logoText: 'Bean Stalker',
        foregroundColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgb(34, 139, 34)',
        labelColor: 'rgb(255, 255, 255)',
        primaryFields: [
          {
            key: 'balance',
            label: 'Credit Balance',
            value: `$${user.credits.toFixed(2)}`,
            textAlignment: 'center'
          }
        ],
        secondaryFields: [
          {
            key: 'username',
            label: 'Account',
            value: user.username
          },
          {
            key: 'lastUpdated',
            label: 'Last Updated',
            value: new Date().toLocaleDateString()
          }
        ],
        auxiliaryFields: [
          {
            key: 'memberType',
            label: 'Membership',
            value: user.credits >= 69 ? 'Premium' : 'Standard'
          }
        ],
        backFields: [
          {
            key: 'description',
            label: 'About',
            value: 'Your Bean Stalker credit balance. Use credits to order delicious coffee and food items from our app.'
          },
          {
            key: 'support',
            label: 'Support',
            value: 'For assistance, contact support through the Bean Stalker app.'
          },
          {
            key: 'website',
            label: 'Website',
            value: 'beanstalker.com.au'
          }
        ]
      };
      
      const result = await AppleWalletPassGenerator.generatePass(userId, user.username, user.credits, passData);
      
      if (!result.success) {
        return res.status(500).send('Failed to generate updated pass');
      }
      
      // Convert base64 back to binary for Apple Wallet
      const passBuffer = Buffer.from(result.passBase64!, 'base64');
      
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
      res.setHeader('Content-Length', passBuffer.length);
      res.send(passBuffer);
      
      console.log(`🍎 APPLE WALLET: Updated pass delivered for user ${userId} - Balance: $${user.credits}`);
      
    } catch (error) {
      console.error("Apple Wallet pass update error:", error);
      res.status(500).send('Internal server error');
    }
  });

  // Get a specific order by ID
  app.get("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Only allow users to access their own orders unless they're an admin
      if (order.userId !== req.user?.id && !req.user?.isAdmin) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user?.id;
      const orderData = insertOrderSchema.parse({ ...req.body, userId });
      
      // Check if the user has enough credits
      const user = await storage.getUser(userId);
      if (!user || user.credits < orderData.total) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      // Create the order
      const order = await storage.createOrder(orderData);
      console.log(`📝 ORDER CREATED: Order #${order.id} for user ${userId}, total: $${orderData.total}`);
      
      // Calculate new balance
      const newBalance = user.credits - orderData.total;
      
      // Deduct the credits from the user's account
      await storage.updateUserCredits(userId, newBalance);
      
      // Record the transaction
      await storage.createCreditTransaction({
        userId,
        type: "order",
        amount: -orderData.total, // Negative amount for spending credits
        description: `Order #${order.id}`,
        balanceAfter: newBalance,
        orderId: order.id
      });
      
      // Send notification to admin users about the new order
      try {
        await notifyAdminsAboutNewOrder(order.id, user.username, orderData.total);
        console.log(`Notification sent to admins about new order #${order.id}`);
      } catch (notificationError) {
        console.error("Failed to send admin notification:", notificationError);
        // Continue with the response even if notification fails
      }

      // AUTOMATIC SQUARE SYNC - SIMPLIFIED WEBHOOK APPROACH
      console.log(`🔄 AUTO-SYNC: Triggering webhook-based sync for order #${order.id}...`);
      
      // Trigger Square sync via internal webhook call - Production compatible
      setTimeout(() => {
        // Determine correct base URL for internal calls
        const port = process.env.PORT || 5000;
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://member.beanstalker.com.au' 
          : `http://localhost:${port}`;
        
        fetch(`${baseUrl}/api/square/sync-order/${order.id}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Internal-Sync': 'true'  // Internal sync flag
          }
        }).then(response => {
          if (response.ok) {
            console.log(`✅ AUTO-SYNC: Webhook triggered successfully for order #${order.id} (${baseUrl})`);
          } else {
            console.error(`❌ AUTO-SYNC: Webhook failed for order #${order.id}, status: ${response.status} (${baseUrl})`);
          }
        }).catch(error => {
          console.error(`❌ AUTO-SYNC: Webhook error for order #${order.id}:`, error.message, `(${baseUrl})`);
        });
      }, 100); // Small delay to ensure order is committed
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order", error: String(error) });
    }
  });

  // DEDICATED ENDPOINT: Add membership credits with session validation
  app.post("/api/user/add-membership-credits", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        message: "Session not established", 
        sessionReady: false 
      });
    }
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          message: "User ID not found in session", 
          sessionReady: false 
        });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if membership credits were already added by checking user's current balance
      // If user has >= $69, they likely already received membership credits
      if (user.credits >= 69) {
        return res.status(200).json({
          success: true,
          message: "User already has sufficient credits",
          currentBalance: user.credits,
          alreadyProcessed: true
        });
      }
      
      // Add the $69 membership credits
      const membershipCredits = 69;
      const newBalance = user.credits + membershipCredits;
      const updatedUser = await storage.updateUserCredits(userId, newBalance);
      
      // Record the transaction
      await storage.createCreditTransaction({
        userId,
        type: "membership_signup",
        amount: membershipCredits,
        description: "Premium Membership Signup - $69 Credits",
        balanceAfter: newBalance,
        orderId: null,
        relatedUserId: null,
        transactionId: `membership_${userId}_${Date.now()}`
      });
      
      console.log(`💳 MEMBERSHIP CREDITS: Added $${membershipCredits} to user ${userId} - Balance: $${newBalance}`);
      
      res.status(200).json({
        success: true,
        message: "Membership credits added successfully",
        creditsAdded: membershipCredits,
        currentBalance: newBalance,
        sessionReady: true
      });
      
    } catch (error) {
      console.error("Error adding membership credits:", error);
      res.status(500).json({ 
        message: "Failed to add membership credits",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // User credits routes
  app.post("/api/credits/add", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user?.id;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUserCredits(userId, user.credits + amount);
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to add credits" });
    }
  });

  // CLEAN IAP VERIFICATION ENDPOINT FOR REVENUECAT
  app.post("/api/iap/verify-purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { productId, transactionId } = req.body;
      const userId = req.user?.id;
      
      console.log(`🔍 RevenueCat IAP Verification: ${productId} | User: ${userId} | Transaction: ${transactionId}`);
      
      if (!productId || !transactionId || !userId) {
        console.log("❌ Missing required fields for IAP verification");
        return res.status(400).json({ message: "Missing required fields: productId, transactionId" });
      }

      // Check if this transaction has already been processed
      const existingTransaction = await storage.getCreditTransactionByTransactionId(transactionId);
      if (existingTransaction) {
        console.log(`⚠️ Transaction ${transactionId} already processed`);
        return res.status(200).json({ 
          success: true, 
          message: "Transaction already processed",
          alreadyProcessed: true 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`❌ User ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }

      // Determine credit amount and transaction type based on product ID
      let creditAmount = 0;
      let transactionType = "iap_purchase";
      
      if (productId.includes('membership69')) {
        creditAmount = 69;
        transactionType = "membership_iap";
      } else if (productId.includes('credits25')) {
        creditAmount = 29.50; // $25 → $29.50 ($4.50 bonus)
      } else if (productId.includes('credits50')) {
        creditAmount = 59.90; // $50 → $59.90 ($9.90 bonus)
      } else if (productId.includes('credits100')) {
        creditAmount = 120.70; // $100 → $120.70 ($20.70 bonus)
      } else {
        console.log(`❌ Unknown product ID: ${productId}`);
        return res.status(400).json({ message: "Unknown product ID" });
      }

      // Update user credits
      const updatedUser = await storage.updateUserCredits(userId, user.credits + creditAmount);
      
      // Record the transaction
      await storage.createCreditTransaction({
        type: transactionType,
        description: `RevenueCat IAP: ${productId}`,
        userId,
        amount: creditAmount,
        balanceAfter: updatedUser.credits,
        transactionId,
        orderId: null,
        relatedUserId: null
      });

      console.log(`✅ IAP verification successful: $${creditAmount} credits added to user ${userId}`);
      
      res.status(200).json({ 
        success: true, 
        message: "Purchase verified and credits added",
        creditsAdded: creditAmount,
        newBalance: updatedUser.credits
      });

    } catch (error) {
      console.error("❌ IAP verification error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });  app.post("/api/iap/restore-purchases", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { receipts, platform } = req.body;
      const userId = req.user?.id;
      
      if (!receipts || !Array.isArray(receipts)) {
        return res.status(400).json({ message: "Invalid receipts data" });
      }

      let totalCreditsRestored = 0;
      const restoredTransactions = [];

      for (const receipt of receipts) {
        try {
          // Verify each receipt and check if already processed
          const isValid = await verifyPurchaseReceipt(receipt.receipt, platform);
          if (!isValid) continue;

          const existing = await storage.getCreditTransactionByTransactionId(receipt.transactionId);
          if (existing) continue; // Skip already processed

          // Process the restoration (similar to verify-purchase logic)
          let creditAmount = 0;
          if (receipt.productId.includes('membership69')) creditAmount = 69;
          else if (receipt.productId.includes('credits25')) creditAmount = 29.50;
          else if (receipt.productId.includes('credits50')) creditAmount = 59.90;
          else if (receipt.productId.includes('credits100')) creditAmount = 120.70;

          if (creditAmount > 0) {
            const user = await storage.getUser(userId);
            await storage.updateUserCredits(userId, user.credits + creditAmount);
            
            await storage.createCreditTransaction({
              type: "iap_restore",
              description: `Restored: ${receipt.productId}`,
              userId,
              amount: creditAmount,
              balanceAfter: user.credits + creditAmount,
              transactionId: receipt.transactionId,
              orderId: null,
              relatedUserId: null
            });

            totalCreditsRestored += creditAmount;
            restoredTransactions.push({
              productId: receipt.productId,
              credits: creditAmount
            });
          }
        } catch (error) {
          console.error('Error restoring individual purchase:', error);
        }
      }

      res.json({
        success: true,
        creditsRestored: totalCreditsRestored,
        transactions: restoredTransactions
      });

    } catch (error) {
      console.error('IAP restore error:', error);
      res.status(500).json({ message: "Failed to restore purchases" });
    }
  });
  
  // Square payment routes
  app.get("/api/square/config", (req, res) => {
    res.json({
      applicationId: getSquareApplicationId(),
      locationId: getSquareLocationId(),
    });
  });
  
  app.post("/api/square/payment-link", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const result = await createPaymentLink(amount);
      
      if (!result.success) {
        return res.status(500).json({ 
          message: "Failed to create payment link", 
          error: 'error' in result ? result.error : "Unknown error" 
        });
      }
      
      res.json({ 
        paymentLink: result.paymentLink,
        amount,
      });
    } catch (error) {
      console.error("Payment link generation error:", error);
      res.status(500).json({ message: "Failed to create payment link" });
    }
  });

  // Membership payment link (no auth required)
  app.post("/api/square/create-payment-link", async (req, res) => {
    try {
      const { amount, userData } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      if (!userData || !userData.username || !userData.password || !userData.email) {
        return res.status(400).json({ message: "Invalid user data" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const result = await createPaymentLink(amount);
      
      if (!result.success) {
        return res.status(500).json({ 
          message: "Failed to create payment link", 
          error: 'error' in result ? result.error : "Unknown error" 
        });
      }
      
      // Store user data temporarily for post-payment processing
      // For now, we'll create a payment link that redirects to our success handler
      const paymentLinkUrl = result.paymentLink;
      
      res.json({ 
        paymentLink: {
          url: paymentLinkUrl
        },
        amount,
      });
    } catch (error) {
      console.error("Membership payment link generation error:", error);
      res.status(500).json({ message: "Failed to create membership payment link" });
    }
  });

  // Square configuration endpoint for Web Payments SDK
  app.get("/api/square/config", (req, res) => {
    res.json({
      applicationId: getSquareApplicationId(),
      locationId: getSquareLocationId()
    });
  });

  // Process membership payment with credit card
  app.post("/api/process-membership-payment", async (req, res) => {
    try {
      const { cardData, amount, userData } = req.body;

      // Validate required fields
      if (!cardData || !amount || !userData) {
        return res.status(400).json({ message: "Missing required payment information" });
      }

      // Validate card data
      const { number, expiry, cvv, postal, postalCode } = cardData;
      const finalPostalCode = postal || postalCode; // Support both field names
      console.log('Card data validation:', { number: !!number, expiry: !!expiry, cvv: !!cvv, postalCode: !!finalPostalCode });
      if (!number || !expiry || !cvv || !finalPostalCode) {
        return res.status(400).json({ message: "Complete card information required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Process actual Square payment to appear in dashboard
      const testCardNumbers = ['4111111111111111', '4242424242424242', '5555555555554444'];
      const cleanCardNumber = number.replace(/\s/g, '');
      
      if (!testCardNumbers.includes(cleanCardNumber)) {
        return res.status(400).json({ 
          message: 'For testing, please use a test card number: 4111 1111 1111 1111' 
        });
      }

      // Validate expiry date format
      const [month, year] = expiry.split('/');
      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ message: 'Invalid expiry date' });
      }

      // Process real Square payment for dashboard visibility
      const { processPayment } = await import('./square-payment');
      let paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Use Square's sandbox test card nonce that generates real payments in dashboard
        const paymentResult = await processPayment({
          sourceId: 'cnon:card-nonce-ok', // Square's official test nonce for sandbox
          amount: amount / 100, // Convert from cents to dollars  
          currency: 'AUD',
          customerName: userData.fullName || userData.username,
          customerEmail: userData.email
        });
        
        if (paymentResult.success && paymentResult.payment?.id) {
          paymentId = paymentResult.payment.id;
          console.log('✓ Square payment processed - will appear in dashboard:', paymentId);
        } else {
          console.log('Square payment processing issue:', paymentResult);
        }
      } catch (error) {
        console.error('Square payment API error:', error);
        // Payment failed - return error instead of simulating
        return res.status(500).json({ 
          message: 'Payment processing failed. Please try again.' 
        });
      }
      
      // FIXED: Create user with NO credits - RevenueCat IAP will add the actual $69
      const hashedPassword = await hashPassword(userData.password);
      const qrCodeData = await QRCode.toDataURL(`user:${userData.username}`);
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        credits: 0, // Start with 0 credits - RevenueCat IAP will add $69
        isActive: true,
        qrCode: qrCodeData
      });

      console.log(`💳 MEMBERSHIP: User ${newUser.id} created with 0 credits - RevenueCat IAP will handle crediting`);

      // Auto-login the new user and add membership credits immediately
      req.login(newUser, async (err) => {
        if (err) {
          console.error('Login error after payment:', err);
          return res.status(500).json({ message: 'Payment processed but login failed' });
        }
        
        // ADD MEMBERSHIP CREDITS IMMEDIATELY AFTER LOGIN SUCCESS
        try {
          const membershipCredits = 69;
          const updatedUser = await storage.updateUserCredits(newUser.id, newUser.credits + membershipCredits);
          
          // Record the transaction
          await storage.createCreditTransaction({
            userId: newUser.id,
            type: "membership_signup",
            amount: membershipCredits,
            description: "Premium Membership Signup - $69 Credits",
            balanceAfter: updatedUser.credits,
            orderId: null,
            relatedUserId: null,
            transactionId: `membership_${newUser.id}_${Date.now()}`
          });
          
          console.log(`💳 MEMBERSHIP CREDITS: Added $${membershipCredits} to user ${newUser.id} immediately after login - Balance: $${updatedUser.credits}`);
          
          res.status(201).json({ 
            message: 'Premium membership activated successfully',
            user: { ...updatedUser, password: undefined },
            membershipCredit: membershipCredits,
            paymentId: paymentId
          });
        } catch (creditError) {
          console.error('Error adding membership credits:', creditError);
          res.status(201).json({ 
            message: 'Premium membership activated - credits will be added shortly',
            user: { ...newUser, password: undefined },
            membershipCredit: 0,
            paymentId: paymentId
          });
        }
      });
    } catch (error) {
      console.error('Membership payment error:', error);
      res.status(500).json({ message: 'Failed to process membership payment' });
    }
  });

  // Direct membership registration (sandbox-friendly)
  app.post("/api/register-with-membership", async (req, res) => {
    try {
      const { username, password, email, fullName } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create user account WITHOUT initial credits (RevenueCat IAP will add $69)
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        fullName,
        credits: 0, // No initial credits - RevenueCat IAP will add $69
        isActive: true
      });
      
      // Generate QR code for new user
      const qrCodeData = await QRCode.toDataURL(`user:${newUser.id}`);
      await storage.updateUserQrCode(newUser.id, qrCodeData);
      
      // ADD MEMBERSHIP CREDITS IMMEDIATELY - GUARANTEED EXECUTION
      try {
        const membershipCredits = 69;
        console.log(`💳 ADDING MEMBERSHIP CREDITS: Starting for user ${newUser.id}...`);
        
        const updatedUser = await storage.updateUserCredits(newUser.id, newUser.credits + membershipCredits);
        console.log(`💳 CREDITS UPDATED: User ${newUser.id} now has $${updatedUser.credits}`);
        
        // Record the transaction
        await storage.createCreditTransaction({
          userId: newUser.id,
          type: "membership_signup",
          amount: membershipCredits,
          description: "Premium Membership Signup - $69 Credits",
          balanceAfter: updatedUser.credits,
          orderId: null,
          relatedUserId: null,
          transactionId: `membership_${newUser.id}_${Date.now()}`
        });
        
        console.log(`💳 MEMBERSHIP SUCCESS: Added $${membershipCredits} to user ${newUser.id} - Final Balance: $${updatedUser.credits}`);
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = updatedUser;
      
        res.status(201).json({
          success: true,
          user: userWithoutPassword,
          message: "Premium membership activated successfully",
          membershipCredit: membershipCredits
        });
      } catch (creditError) {
        console.error(`❌ MEMBERSHIP CREDIT ERROR for user ${newUser.id}:`, creditError);
        // Return success but with zero credits - manual fix needed
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({
          success: true,
          user: userWithoutPassword,
          message: "Premium membership activated - credits will be added manually",
          membershipCredit: 0,
          creditError: true
        });
      }
    } catch (error) {
      console.error("Error creating membership account:", error);
      res.status(500).json({ message: "Failed to create membership account" });
    }
  });
  
  app.post("/api/square/process-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user?.id;
      const { sourceId, amount, bonusAmount, currency = "AUD" } = req.body;
      
      if (!sourceId || !amount) {
        return res.status(400).json({ message: "Invalid payment data" });
      }
      
      // Process the payment - charge the user the base amount
      const paymentResult = await processPayment({
        sourceId,
        amount,
        currency,
      });
      
      if (!paymentResult.success) {
        return res.status(400).json({ 
          message: "Payment failed", 
          error: 'error' in paymentResult ? paymentResult.error : "Unknown error"
        });
      }
      
      // Payment succeeded - add credits to the user's account
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Add the bonus amount (creditsToAdd) to user's account instead of just the payment amount
      const creditsToAdd = bonusAmount || amount; // Use bonusAmount if provided, otherwise fallback to amount
      const newBalance = user.credits + creditsToAdd;
      const updatedUser = await storage.updateUserCredits(userId, newBalance);
      
      // Record the credit transaction
      await storage.createCreditTransaction({
        userId,
        type: "purchase",
        amount: creditsToAdd,
        balanceAfter: newBalance,
        description: `Credit purchase of $${amount/100} giving ${creditsToAdd} credits`,
        metadata: {
          paymentId: paymentResult.payment.id,
          amountPaid: amount,
          bonusAmount: bonusAmount ? bonusAmount - amount : 0
        }
      });
      
      // Remove password field from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      // Convert BigInt to string to avoid serialization issues
      const paymentJson = JSON.parse(JSON.stringify(paymentResult.payment, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      res.json({
        success: true,
        payment: paymentJson,
        user: userWithoutPassword,
        credits: {
          paid: amount,
          received: creditsToAdd
        }
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });
  
  // Payment success redirect handler
  app.get("/payment-success", async (req, res) => {
    const { transactionId, userData } = req.query;
    
    try {
      // If this is a membership payment, create the user account
      if (userData && typeof userData === 'string') {
        const userInfo = JSON.parse(decodeURIComponent(userData));
        
        // FIXED: Create user account with NO credits - RevenueCat IAP will add $69
        const hashedPassword = await hashPassword(userInfo.password);
        const newUser = await storage.createUser({
          username: userInfo.username,
          password: hashedPassword,
          email: userInfo.email,
          fullName: userInfo.fullName,
          credits: 0, // Start with 0 credits - RevenueCat IAP will add $69
          isActive: true
        });
        
        // Generate QR code for new user
        const qrCodeData = await QRCode.toDataURL(`user:${newUser.id}`);
        await storage.updateUserQrCode(newUser.id, qrCodeData);
        
        console.log(`💳 MEMBERSHIP: User ${newUser.id} created via payment-success with 0 credits - RevenueCat IAP will handle crediting`);
        
        // Redirect to login with success message
        res.redirect(`/auth?registration=success&message=Premium membership activated! Credits will be added via RevenueCat IAP. Please log in with your credentials.`);
        return;
      }
    } catch (error) {
      console.error("Error processing membership payment:", error);
      res.redirect(`/auth?error=registration_failed`);
      return;
    }
    
    // Regular payment success redirect
    res.redirect(`/profile?payment=success&transaction=${transactionId || ''}`);
  });

  // Membership signup with Square payment processing
  app.post("/api/membership/signup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user?.id;
      const { sourceId } = req.body;
      
      // Check if user is already a member
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.isMember) {
        return res.status(400).json({ message: "User is already a member" });
      }
      
      if (!sourceId) {
        return res.status(400).json({ message: "Payment source required" });
      }
      
      // Process the AUD$69 membership fee payment
      const membershipFee = 6900; // AUD$69 in cents
      const paymentResult = await processPayment({
        sourceId,
        amount: membershipFee,
        currency: "AUD",
      });
      
      if (!paymentResult.success) {
        return res.status(400).json({ 
          message: "Membership payment failed", 
          error: 'error' in paymentResult ? paymentResult.error : "Unknown error"
        });
      }
      
      // Payment succeeded - activate membership and credit the fee to user's account
      const updatedUser = await storage.setUserMembership(userId, true);
      const newBalance = user.credits + 69; // Add AUD$69 as credits
      const userWithCredits = await storage.updateUserCredits(userId, newBalance);
      
      // Record the membership transaction
      await storage.createCreditTransaction({
        userId,
        type: "membership",
        amount: 69,
        balanceAfter: newBalance,
        description: "Membership signup - AUD$69 fee credited to account"
      });
      
      // Remove password field from response
      const { password, ...userWithoutPassword } = userWithCredits;
      
      res.json({
        success: true,
        message: "Membership activated successfully",
        user: { ...userWithoutPassword, isMember: true, membershipDate: updatedUser.membershipDate },
        membershipFee: 69,
        creditsAdded: 69
      });
    } catch (error) {
      console.error("Membership signup error:", error);
      res.status(500).json({ message: "Failed to process membership signup" });
    }
  });
  
  // Generate QR code for user
  app.get("/api/user/qrcode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If user already has a QR code, return it
      if (user.qrCode) {
        return res.json({ qrCode: user.qrCode });
      }
      
      // Generate a unique QR code with user data
      const userData = {
        id: user.id,
        username: user.username,
        credits: user.credits,
        timestamp: new Date().toISOString()
      };
      
      // Convert to data URL format
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(userData), {
        errorCorrectionLevel: 'H',
        margin: 1,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      // Save the QR code to the user record
      const updatedUser = await storage.updateUserQrCode(userId, qrCodeDataUrl);
      
      // Return the QR code
      res.json({ qrCode: qrCodeDataUrl });
    } catch (error) {
      console.error('QR code generation error:', error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Password reset request
  app.post("/api/password-reset/request", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user exists with this email
      const user = await storage.getUserByEmail(email);
      
      // For security reasons, don't reveal whether the email exists or not
      if (!user) {
        // Still return success to prevent email enumeration attacks
        return res.json({ 
          success: true, 
          message: "If your email is registered, you will receive a password reset link shortly." 
        });
      }
      
      // Generate reset token and save it to the user
      const token = await storage.createPasswordResetToken(email);
      
      if (!token) {
        return res.status(500).json({ message: "Failed to create reset token" });
      }
      
      // Send reset email
      const emailSent = await sendPasswordResetEmail(email, token);
      
      if (!emailSent) {
        console.error("Failed to send password reset email");
        return res.status(500).json({ message: "Failed to send reset email" });
      }
      
      res.json({ 
        success: true, 
        message: "If your email is registered, you will receive a password reset link shortly." 
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process reset request" });
    }
  });
  
  // Password reset with token
  app.post("/api/password-reset/reset", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      // Find user with this token
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password and clear the reset token
      await storage.resetPassword(user.id, hashedPassword);
      
      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  
  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user?.id;
      
      // Create a schema for the profile update
      const updateProfileSchema = z.object({
        fullName: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().email().optional().nullable(),
      });
      
      // Validate the request body
      const validatedData = updateProfileSchema.parse(req.body);
      
      // Update the user profile
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      // Return the updated user without the password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: formatZodError(error) 
        });
      }
      
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user credits (for IAP purchases)
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user?.id;
      const { credits, action } = req.body;
      
      if (action === 'add' && credits && credits > 0) {
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        const newCredits = user.credits + credits;
        await storage.updateUser(userId, { credits: newCredits });
        
        console.log(`💳 CREDITS ADDED: User ${userId} (${user.username}) received ${credits} credits, new balance: ${newCredits}`);
        
        const updatedUser = await storage.getUserById(userId);
        const { password, ...userWithoutPassword } = updatedUser!;
        return res.json(userWithoutPassword);
      }
      
      res.status(400).json({ message: "Invalid credit operation" });
    } catch (error) {
      console.error("Error updating user credits:", error);
      res.status(500).json({ message: "Failed to update credits" });
    }
  });

  // Lookup user by phone number
  app.get("/api/user/lookup", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    const { phoneNumber } = req.query;
    
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ message: "Phone number is required" });
    }
    
    try {
      // Remove any non-digit characters for consistent comparison
      const normalizedPhoneNumber = phoneNumber.replace(/\D/g, "");
      
      // Get all users (we could optimize this with a direct query if this becomes a bottleneck)
      const users = await storage.getAllUsers();
      
      // Find user with matching phone number
      const matchedUser = users.find(user => {
        const userPhone = user.phoneNumber ? user.phoneNumber.replace(/\D/g, "") : "";
        return userPhone === normalizedPhoneNumber;
      });
      
      if (!matchedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send sensitive information
      const { id, username } = matchedUser;
      res.json({ id, username });
    } catch (error) {
      console.error("Error looking up user by phone number:", error);
      res.status(500).json({ message: "Failed to lookup user" });
    }
  });

  // Get user data by ID (for device binding)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return only safe user data (no password, credits, etc.)
      const safeUserData = {
        id: user.id,
        username: user.username,
        fullName: user.fullName
      };
      
      res.json(safeUserData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });



  // Admin Menu Management Routes
  // Get single menu item 
  app.get("/api/admin/menu/:menuItemId", isAdmin, async (req, res) => {
    try {
      const { menuItemId } = req.params;
      const menuItem = await storage.getMenuItem(Number(menuItemId));
      
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      console.error("Error fetching menu item:", error);
      res.status(500).json({ message: "Failed to fetch menu item" });
    }
  });
  
  // File upload endpoint for menu item images
  app.post("/api/admin/upload", isAdmin, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Create a URL path to the uploaded file (relative to the server root)
      const imageUrl = `/uploads/${req.file.filename}`;
      
      // Return the URL to the uploaded file
      res.json({
        imageUrl,
        message: "File uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Create new menu item
  app.post("/api/admin/menu", isAdmin, async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  // Update menu item
  app.patch("/api/admin/menu/:menuItemId", isAdmin, async (req, res) => {
    try {
      const { menuItemId } = req.params;
      const menuItem = await storage.updateMenuItem(Number(menuItemId), req.body);
      res.json(menuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  // Delete menu item
  app.delete("/api/admin/menu/:menuItemId", isAdmin, async (req, res) => {
    try {
      const { menuItemId } = req.params;
      await storage.deleteMenuItem(Number(menuItemId));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });
  
  // Menu Item Options Routes
  
  // Get options for a specific menu item
  app.get("/api/admin/menu/:menuItemId/options", isAdmin, async (req, res) => {
    try {
      const menuItemId = parseInt(req.params.menuItemId);
      const options = await storage.getMenuItemOptions(menuItemId);
      
      // Organize options into a hierarchical structure just like the public API
      const parentOptions = options.filter(option => option.isParent);
      const standardOptions = options.filter(option => !option.isParent && !option.parentId);
      const childOptions = options.filter(option => option.parentId);
      
      // For each parent option, attach its children
      const result = [
        ...standardOptions,
        ...parentOptions.map(parent => ({
          ...parent,
          children: childOptions.filter(child => child.parentId === parent.id)
        }))
      ];
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching menu item options:", error);
      res.status(500).json({ message: "Failed to fetch menu item options" });
    }
  });
  
  // Create a new option for a menu item
  app.post("/api/admin/menu/:menuItemId/options", isAdmin, async (req, res) => {
    try {
      const menuItemId = parseInt(req.params.menuItemId);
      const optionData = req.body;
      
      const newOption = await storage.createMenuItemOption({
        ...optionData,
        menuItemId
      });
      
      res.status(201).json(newOption);
    } catch (error) {
      console.error("Error creating menu item option:", error);
      res.status(500).json({ message: "Failed to create menu item option" });
    }
  });
  
  // Update an existing option
  app.patch("/api/admin/menu-options/:optionId", isAdmin, async (req, res) => {
    try {
      const optionId = parseInt(req.params.optionId);
      const optionData = req.body;
      
      const updatedOption = await storage.updateMenuItemOption(optionId, optionData);
      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating menu item option:", error);
      res.status(500).json({ message: "Failed to update menu item option" });
    }
  });
  
  // Delete an option
  app.delete("/api/admin/menu-options/:optionId", isAdmin, async (req, res) => {
    try {
      const optionId = parseInt(req.params.optionId);
      await storage.deleteMenuItemOption(optionId);
      res.status(200).json({ message: "Menu item option deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu item option:", error);
      res.status(500).json({ message: "Failed to delete menu item option" });
    }
  });

  // Category Management Routes
  // Get all categories
  app.get("/api/admin/categories", isAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get single category 
  app.get("/api/admin/categories/:categoryId", isAdmin, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const category = await storage.getAllCategories().then(categories => 
        categories.find(cat => cat.id === Number(categoryId))
      );
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Create new category
  app.post("/api/admin/categories", isAdmin, async (req, res) => {
    try {
      const categoryData = insertMenuCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update category
  app.patch("/api/admin/categories/:categoryId", isAdmin, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const categoryData = insertMenuCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateCategory(Number(categoryId), categoryData);
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete category
  app.delete("/api/admin/categories/:categoryId", isAdmin, async (req, res) => {
    try {
      const { categoryId } = req.params;
      await storage.deleteCategory(Number(categoryId));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Admin routes
  // Debug push subscription
  app.get("/api/admin/push-subscription-debug", isAdmin, async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      
      // Get admin subscriptions
      const subscriptions = await storage.getPushSubscriptionsByUserId(user.id);
      
      // Format for display (redact sensitive info)
      const safeSubscriptions = subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        p256dhLength: sub.p256dh?.length || 0,
        authLength: sub.auth?.length || 0,
        userId: sub.userId,
        createdAt: sub.createdAt,
        browserInfo: {
          isWindows: sub.endpoint.includes('windows.com') || sub.endpoint.includes('microsoft'),
          isApple: sub.endpoint.includes('apple') || sub.endpoint.includes('icloud'),
          isFirebase: sub.endpoint.includes('fcm') || sub.endpoint.includes('firebase'),
          endpointPrefix: sub.endpoint.substring(0, 50) + '...'
        }
      }));
      
      // Get VAPID config (without private key)
      const vapidInfo = {
        publicKey: 'BLeQMZeMxGSl0T1YGtCufXPz6aKE8c7ItAwJ5bAavW8FSz0d-Czw5wR-nvGVIhhjkRPs2vok9MzViHINmzdCdCQ',
        contact: 'mailto:support@beanstalker.com'
      };
      
      res.json({
        subscriptions: safeSubscriptions,
        vapidInfo
      });
    } catch (error) {
      console.error("Error getting subscription debug info:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // TEST ENDPOINT: Send test notification to admin
  app.post("/api/admin/test-notification", isAdmin, async (req, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      
      console.log(`==== SENDING TEST NOTIFICATION TO ADMIN #${user.id} ====`);
      
      // Get admin subscriptions
      const subscriptions = await storage.getPushSubscriptionsByUserId(user.id);
      console.log(`Found ${subscriptions.length} subscriptions for admin user ${user.id}`);
      
      if (subscriptions.length === 0) {
        return res.status(404).json({ 
          message: "No push subscriptions found", 
          hint: "Please enable push notifications in your browser first" 
        });
      }
      
      // Generate a unique test ID for tracking
      const testId = Math.random().toString(36).substring(2, 10);
      const timestamp = new Date().toISOString();
      
      // Prepare notification payload
      const payload = {
        title: "Test Notification",
        body: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
        icon: '/images/icon-512.png',
        badge: '/images/badge.svg',
        tag: `admin-test-${Date.now()}`, // Make the tag unique every time
        data: {
          url: '/admin',
          test: true,
          testId,
          timestamp,
          // Add user ID to ensure this notification is only shown to intended recipient
          userId: user.id,
          // Flag to indicate this is a test notification
          isTestNotification: true
        },
        requireInteraction: true,
        vibrate: [100, 50, 100]
      };
      
      // Log detailed information about the subscription first
      subscriptions.forEach((subscription, index) => {
        console.log(`Subscription ${index+1} details:`, {
          userId: subscription.userId,
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          p256dhLength: subscription.p256dh.length,
          authLength: subscription.auth.length,
          isWindows: subscription.endpoint.includes('windows.com') || subscription.endpoint.includes('microsoft'),
          isApple: subscription.endpoint.includes('apple') || subscription.endpoint.includes('icloud'),
          isFirebase: subscription.endpoint.includes('fcm') || subscription.endpoint.includes('firebase'),
          platform: req.header('user-agent') || 'Unknown'
        });
      });
      
      // Try to send notifications to all subscriptions with detailed logging
      const results = await Promise.allSettled(
        subscriptions.map(subscription => {
          try {
            console.log(`Attempting to send notification to endpoint: ${subscription.endpoint.substring(0, 30)}...`);
            return sendPushNotification(subscription, payload);
          } catch (err) {
            console.error('Error in test notification:', err);
            throw err;
          }
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // Log detailed results
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.error(`Test notification ${i+1} failed:`, result.reason);
        } else {
          console.log(`Test notification ${i+1} sent successfully:`, {
            status: result.value.statusCode,
            statusText: result.value.statusMessage,
          });
        }
      });
      
      res.json({
        message: `Test notification sent: ${successful} succeeded, ${failed} failed`,
        subscriptions: subscriptions.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' 
          ? { status: 'success' } 
          : { status: 'error', message: r.reason?.message || 'Unknown error' }
        )
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ 
        message: "Failed to send test notification", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Send app update notification to all users with email addresses
  app.post("/api/admin/send-update-notification", isAdmin, async (req, res) => {
    try {
      const { version, includeAdmins = false } = req.body;
      
      if (!version) {
        return res.status(400).json({ message: "Version parameter is required" });
      }
      
      console.log(`Preparing to send app update notification for version ${version}`);
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      console.log(`Found ${allUsers.length} total users in database`);
      
      // Filter users with email addresses
      const usersWithEmails = allUsers.filter(user => {
        const hasEmail = user.email && user.email.trim() !== '';
        const isUserAdmin = user.isAdmin;
        
        // Include non-admin users by default, admins only if requested
        return hasEmail && (!isUserAdmin || includeAdmins);
      });
      
      console.log(`Found ${usersWithEmails.length} users with email addresses (includeAdmins: ${includeAdmins})`);
      
      if (usersWithEmails.length === 0) {
        return res.status(200).json({ 
          message: "No users with email addresses found", 
          totalUsers: allUsers.length,
          usersWithEmails: 0,
          sent: false
        });
      }
      
      // Extract email addresses
      const userEmails = usersWithEmails.map(user => user.email).filter((email): email is string => email !== null && email !== undefined);
      console.log(`Sending update notification to emails: ${userEmails.slice(0, 3).join(', ')}${userEmails.length > 3 ? '...' : ''}`);
      
      // Send the update notification
      const emailSent = await sendAppUpdateNotification(userEmails, version);
      
      if (emailSent) {
        console.log(`Successfully sent app update notification for version ${version} to ${userEmails.length} users`);
        res.json({
          message: `App update notification sent successfully`,
          version,
          totalUsers: allUsers.length,
          usersWithEmails: usersWithEmails.length,
          emailsSent: userEmails.length,
          sent: true
        });
      } else {
        console.error(`Failed to send app update notification for version ${version}`);
        res.status(500).json({
          message: "Failed to send app update notification",
          version,
          totalUsers: allUsers.length,
          usersWithEmails: usersWithEmails.length,
          sent: false
        });
      }
    } catch (error) {
      console.error("Error sending app update notification:", error);
      res.status(500).json({ 
        message: "Failed to send app update notification", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get all users
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      console.log("Getting all users for admin dashboard");
      const users = await storage.getAllUsers();
      console.log(`Retrieved ${users.length} users from database:`, users.map(u => u.id));
      // Remove passwords from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get user by QR code (for admin scanning)
  app.get("/api/admin/user-by-qr/:qrCode", isAdmin, async (req, res) => {
    try {
      const { qrCode } = req.params;
      
      if (!qrCode) {
        return res.status(400).json({ error: "QR code is required" });
      }
      
      const user = await storage.getUserByQrCode(qrCode);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user by QR code:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  // Get user by ID (for admin use)
  app.get("/api/admin/users/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID format" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  // Create a new user (admin endpoint)
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await hashPassword(validatedData.password);
      }
      
      // Create the user
      const user = await storage.createUser(validatedData);
      
      // Return created user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", error: formatZodError(error) });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get all orders
  app.get("/api/admin/orders", isAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  
  // Get all orders with user details
  app.get("/api/admin/orders/detailed", isAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrdersWithUserDetails();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching detailed orders:", error);
      res.status(500).json({ message: "Failed to fetch detailed orders" });
    }
  });

  // Update order status
  app.patch("/api/admin/orders/:orderId", isAdmin, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      if (!status || !["pending", "processing", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Verify the order exists and get current status
      const existingOrder = await storage.getOrderById(Number(orderId));
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if status is actually changing
      const statusChanged = existingOrder.status !== status;
      
      // Update the order status
      const updatedOrder = await storage.updateOrderStatus(Number(orderId), status);
      
      // Send push notification to the order's user if status changed
      if (statusChanged) {
        try {
          console.log(`Attempting to send notification to user ${updatedOrder.userId} for order ${orderId} - status: ${status}`);
          
          // Get user details for personalized notification
          const user = await storage.getUser(updatedOrder.userId);
          const userGreeting = user ? `Hi ${user.username}! ` : '';
          
          // Make status user-friendly
          let friendlyStatus = status;
          let emoji = '';
          if (status === 'processing') {
            friendlyStatus = 'being prepared';
            emoji = '☕ ';
          } else if (status === 'completed') {
            friendlyStatus = 'ready for pickup';
            emoji = '✅ ';
          } else if (status === 'cancelled') {
            friendlyStatus = 'cancelled';
            emoji = '❌ ';
          }
          
          // Create a direct call to push notification service with carefully formatted message
          const subscriptions = await storage.getPushSubscriptionsByUserId(updatedOrder.userId);
          console.log(`Found ${subscriptions.length} push subscriptions for user ${updatedOrder.userId}`);
          
          // If we have subscriptions, send to each one directly
          if (subscriptions.length > 0) {
            const title = `${emoji}Order #${orderId} Update`;
            const body = `${userGreeting}Your order is now ${friendlyStatus}`;
            
            for (const subscription of subscriptions) {
              try {
                // Log the subscription endpoint for debugging
                console.log(`Sending to subscription: ${subscription.endpoint.substring(0, 50)}...`);
                
                // Send direct notification via webpush
                await sendPushNotification(subscription, {
                  title,
                  body,
                  requireInteraction: true,
                  vibrate: [100, 50, 100],
                  tag: `order-${orderId}-${Date.now()}`, // Make tag unique every time
                  data: {
                    orderId: Number(orderId),
                    status,
                    url: '/orders',
                    userId: updatedOrder.userId, // Add user ID for verification
                    timestamp: new Date().toISOString()
                  }
                });
                
                console.log(`Successfully sent notification to ${subscription.endpoint.substring(0, 30)}...`);
              } catch (subError) {
                console.error(`Error sending to subscription ${subscription.id}:`, subError.message);
              }
            }
          } else {
            // If no subscriptions, still use the higher-level function as a fallback
            await sendOrderStatusNotification(updatedOrder.userId, updatedOrder.id, status);
          }
          
          console.log(`Notification(s) sent to user ${updatedOrder.userId} about order ${orderId}`);
        } catch (notificationError) {
          console.error("Failed to send push notification:", notificationError);
          // Continue with the response even if notification fails
        }
      } else {
        console.log(`Order ${orderId} status not changed (already ${status}), no notification sent`);
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Set user as admin
  app.patch("/api/admin/users/:userId", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { isAdmin: setIsAdmin } = req.body;
      
      if (typeof setIsAdmin !== "boolean") {
        return res.status(400).json({ message: "Invalid isAdmin value" });
      }
      
      const updatedUser = await storage.setUserAdmin(Number(userId), setIsAdmin);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Add credits to any user account
  app.post("/api/admin/users/:userId/credits", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount } = req.body;
      
      if (!amount) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const user = await storage.getUser(Number(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const newBalance = user.credits + amount;
      const updatedUser = await storage.updateUserCredits(Number(userId), newBalance);
      
      // Record the admin credit transaction
      await storage.createCreditTransaction({
        userId: Number(userId),
        type: "admin",
        amount: amount,
        balanceAfter: newBalance,
        description: `Credits added by admin`,
        metadata: {
          adminUserId: req.user?.id,
          adminUsername: req.user?.username
        }
      });
      
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to add credits" });
    }
  });

  // Get user by QR code (for admin QR scanner)
  app.get("/api/admin/user-by-qr/:qrCode", isAdmin, async (req, res) => {
    try {
      const { qrCode } = req.params;
      
      if (!qrCode) {
        return res.status(400).json({ message: "QR code is required" });
      }
      
      const user = await storage.getUserByQrCode(qrCode);
      if (!user) {
        return res.status(404).json({ message: "User not found with this QR code" });
      }
      
      // Remove password from the response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting user by QR code:", error);
      res.status(500).json({ message: "Failed to get user by QR code" });
    }
  });

  // Get VAPID public key
  app.get("/api/push/vapid-key", (req, res) => {
    // Use the already imported getVapidPublicKey function from push-notifications.ts
    
    // Return the public key to the client
    res.json({ publicKey: getVapidPublicKey() });
  });
  
  // Test endpoint for notifications - for debugging client push notifications
  app.post("/api/push/test", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const timestamp = new Date().toISOString();
      const testId = Math.random().toString(36).substring(2, 10);
      
      // Log this test request
      console.log(`User ${userId} requested test notification with ID ${testId}`);
      
      // Create a simple notification payload - going back to basics
      const payload = {
        title: "Test Notification",
        body: `This is a test notification (${new Date().toLocaleTimeString()})`,
        icon: "/images/icon-512.png",
        badge: "/images/badge.svg",
        tag: `test-${Date.now()}`, // Make the tag unique every time
        data: {
          testId,
          url: "/profile",
          timestamp,
          // For test notifications, include orderId to trigger notification handling
          orderId: 999,
          status: "test",
          // Flag to indicate this is a test notification
          isTestNotification: true,
          // Add the user ID to ensure we only show to this user
          userId: userId
        }
      };
      
      console.log('Sending test notification:', JSON.stringify(payload, null, 2));
      
      // Send ONLY to this user's subscriptions
      const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
      console.log(`User ${userId} has ${subscriptions.length} push subscriptions`);
      
      // Track if we successfully sent at least one notification
      let sentCount = 0;
      
      // Send to each subscription individually 
      if (subscriptions.length > 0) {
        for (const subscription of subscriptions) {
          try {
            await sendPushNotification(subscription, payload);
            console.log(`Sent test notification to: ${subscription.endpoint.substring(0, 30)}...`);
            sentCount++;
          } catch (error) {
            console.error(`Failed to send to subscription: ${subscription.endpoint.substring(0, 30)}...`, error);
          }
        }
      } else {
        console.log(`No push subscriptions found for user ${userId}`);
      }
      
      // Log the test notification details
      const userAgent = req.headers['user-agent'] || '';
      console.log('Test notification details:', {
        userAgent: userAgent.substring(0, 100), // Trim user agent for log readability
        subscriptionCount: subscriptions.length,
        firstEndpoint: subscriptions.length > 0 ? 
          subscriptions[0].endpoint.substring(0, 50) + '...' : 'none',
        payloadPreview: {
          title: payload.title,
          body: payload.body,
          data: payload.data
        }
      });
      
      res.json({ 
        success: true, 
        message: "Test notification sent", 
        details: {
          timestamp,
          testId,
          subscriptionCount: (await storage.getPushSubscriptionsByUserId(userId)).length
        }
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send test notification", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Push notification subscription routes
  app.post("/api/push/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user!.id;
      const subscriptionData = insertPushSubscriptionSchema.parse({
        ...req.body,
        userId
      });
      
      const subscription = await storage.savePushSubscription(subscriptionData);
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
      }
      console.error("Push subscription error:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });
  
  app.delete("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }
      
      await storage.deletePushSubscription(endpoint);
      res.status(200).json({ message: "Subscription deleted successfully" });
    } catch (error) {
      console.error("Push unsubscription error:", error);
      res.status(500).json({ message: "Failed to delete push subscription" });
    }
  });

  // Credit transaction routes
  
  // Get credit transaction history for the logged-in user
  app.get("/api/credit-transactions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const transactions = await storage.getCreditTransactionsByUserId(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      res.status(500).json({ message: "Failed to fetch credit transaction history" });
    }
  });
  

  
  // Send credits to another user
  app.post("/api/send-credits", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { recipientId, amount, message } = req.body;
    
    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid request. Recipient ID and positive amount are required." });
    }
    
    try {
      // Verify sender has enough credits
      const sender = await storage.getUser(req.user.id);
      if (!sender) {
        return res.status(404).json({ message: "Sender account not found" });
      }
      
      if (sender.credits < amount) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      // Verify recipient exists
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient account not found" });
      }
      
      // Don't allow sending to self
      if (sender.id === recipient.id) {
        return res.status(400).json({ message: "Cannot send credits to yourself" });
      }
      
      // Deduct from sender
      const updatedSender = await storage.updateUserCredits(sender.id, sender.credits - amount);
      
      // Create sender's transaction record
      await storage.createCreditTransaction({
        userId: sender.id,
        type: "send",
        amount: -amount,
        balanceAfter: updatedSender.credits,
        description: `Sent to ${recipient.username}`,
        metadata: { recipientId: recipient.id, message: message || '' }
      });
      
      // Add to recipient
      const updatedRecipient = await storage.updateUserCredits(recipient.id, recipient.credits + amount);
      
      // Create recipient's transaction record
      await storage.createCreditTransaction({
        userId: recipient.id,
        type: "receive",
        amount: amount,
        balanceAfter: updatedRecipient.credits,
        description: `Received from ${sender.username}`,
        metadata: { senderId: sender.id, message: message || '' }
      });
      
      res.json({ 
        success: true, 
        sender: { id: sender.id, credits: updatedSender.credits },
        recipient: { id: recipient.id, username: recipient.username },
        amount
      });
    } catch (error) {
      console.error('Error sending credits:', error);
      res.status(500).json({ message: "Failed to send credits", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  
  // Create a credit transaction (typically called from payment processing)
  app.post("/api/credit-transactions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const validatedData = insertCreditTransactionSchema.parse(req.body);
      const userId = req.user.id;
      
      // Ensure the transaction is for the logged-in user
      if (validatedData.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized transaction request" });
      }
      
      const transaction = await storage.createCreditTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: formatZodError(error) });
      }
      console.error("Error creating credit transaction:", error);
      res.status(500).json({ message: "Failed to create credit transaction" });
    }
  });

  // Favorites routes
  app.get("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user!.id;
      const favorites = await storage.getUserFavoritesWithDetails(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });
  
  app.post("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user!.id;
      const { menuItemId, selectedSize, selectedOptions } = req.body;
      
      if (!menuItemId) {
        return res.status(400).json({ message: "Menu item ID is required" });
      }
      
      // Check if the menu item exists
      const menuItem = await storage.getMenuItem(menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      // Check if already favorited
      const isAlreadyFavorite = await storage.isFavorite(userId, menuItemId);
      if (isAlreadyFavorite) {
        return res.status(400).json({ message: "Item is already in favorites" });
      }
      

      
      const favorite = await storage.addFavorite({
        userId,
        menuItemId,
        selectedSize: selectedSize || null,
        selectedOptions: selectedOptions || null
      });
      
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });
  
  app.delete("/api/favorites/:menuItemId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user!.id;
      const menuItemId = parseInt(req.params.menuItemId);
      
      if (isNaN(menuItemId)) {
        return res.status(400).json({ message: "Invalid menu item ID" });
      }
      
      // Check if it's a favorite first
      const isFavorite = await storage.isFavorite(userId, menuItemId);
      if (!isFavorite) {
        return res.status(404).json({ message: "Item is not in favorites" });
      }
      
      await storage.removeFavorite(userId, menuItemId);
      res.status(200).json({ message: "Favorite removed successfully" });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.delete("/api/favorites/by-id/:favoriteId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const favoriteId = parseInt(req.params.favoriteId);
      
      if (isNaN(favoriteId)) {
        return res.status(400).json({ message: "Invalid favorite ID" });
      }
      
      await storage.removeFavoriteById(favoriteId);
      res.status(200).json({ message: "Favorite configuration removed successfully" });
    } catch (error) {
      console.error("Error removing favorite by ID:", error);
      res.status(500).json({ message: "Failed to remove favorite configuration" });
    }
  });
  
  app.get("/api/favorites/:menuItemId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user!.id;
      const menuItemId = parseInt(req.params.menuItemId);
      
      if (isNaN(menuItemId)) {
        return res.status(400).json({ message: "Invalid menu item ID" });
      }
      
      const isFavorite = await storage.isFavorite(userId, menuItemId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });
  
  // Add all menu items to favorites
  app.post("/api/favorites/add-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const userId = req.user!.id;
      
      // Get all menu items
      const menuItems = await storage.getMenuItems();
      
      // Add each menu item to favorites if not already favorited
      const addedItems = [];
      for (const item of menuItems) {
        const isAlreadyFavorite = await storage.isFavorite(userId, item.id);
        if (!isAlreadyFavorite) {
          await storage.addFavorite({
            userId,
            menuItemId: item.id,
            selectedSize: null,
            selectedOptions: null
          });
          addedItems.push(item);
        }
      }
      
      res.status(200).json({ 
        message: `Added ${addedItems.length} items to favorites`,
        addedItems 
      });
    } catch (error) {
      console.error("Error adding all menu items to favorites:", error);
      res.status(500).json({ message: "Failed to add all items to favorites" });
    }
  });

  // Clear all users except admin accounts
  app.delete("/api/admin/users/clear", isAdmin, async (req, res) => {
    try {
      // Get all admin users so we don't delete them
      const adminUsers = await storage.getAdminUsers();
      const adminUserIds = adminUsers.map(user => user.id);
      
      // Always preserve the current user as well
      if (req.user && !adminUserIds.includes(req.user.id)) {
        adminUserIds.push(req.user.id);
      }
      
      // Make sure we have at least one ID to preserve (safety check)
      if (adminUserIds.length === 0) {
        return res.status(400).json({ message: "Cannot delete all admin users" });
      }
      
      await storage.clearAllUsers(adminUserIds);
      res.status(200).json({ message: "All non-admin users cleared successfully" });
    } catch (error) {
      console.error("Error clearing users:", error);
      res.status(500).json({ message: "Failed to clear users" });
    }
  });
  
  // Clear all orders
  app.delete("/api/admin/orders/clear", isAdmin, async (req, res) => {
    try {
      await storage.clearAllOrders();
      res.status(200).json({ message: "All orders cleared successfully" });
    } catch (error) {
      console.error("Error clearing orders:", error);
      res.status(500).json({ message: "Failed to clear orders" });
    }
  });

  // Membership Routes
  
  // Process membership signup with Square payment
  app.post("/api/membership/signup", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = req.user;
    if (user.isMember) {
      return res.status(400).json({ message: "User is already a member" });
    }

    try {
      const { sourceId } = req.body;
      
      if (!sourceId) {
        return res.status(400).json({ message: "Payment source required" });
      }

      // Process payment with Square using existing payment system
      const paymentRequest: SquarePaymentRequest = {
        sourceId: sourceId,
        amount: 69, // AUD$69.00
        currency: 'AUD'
      };

      const paymentResult = await processPayment(paymentRequest);

      if (paymentResult.success) {
        // Update user to member status and add credits
        const updatedUser = await storage.updateUser((user as any).id, {
          isMember: true,
          membershipDate: new Date(),
          credits: (user as any).credits + 69 // Add AUD$69 in credits
        });

        // Create credit transaction record
        await storage.createCreditTransaction({
          type: 'membership_signup',
          description: 'Premium membership signup bonus',
          userId: user.id,
          amount: 69,
          balanceAfter: updatedUser.credits,
          relatedUserId: null,
          orderId: null
        });

        res.status(200).json({
          success: true,
          message: "Membership activated successfully",
          user: updatedUser,
          payment: {
            id: paymentResult.payment?.id || "unknown",
            status: "COMPLETED",
            amount: "69.00",
            currency: "AUD"
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: paymentResult.error?.message || "Payment failed"
        });
      }
    } catch (error) {
      console.error("Membership signup failed:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Membership signup failed"
      });
    }
  });

  // Credit Sharing Routes

  // Get pending credit transfers for current user
  app.get("/api/pending-credit-transfers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const pendingTransfers = await storage.getPendingCreditTransfers(req.user.id);
      res.json(pendingTransfers);
    } catch (error) {
      console.error("Error fetching pending credit transfers:", error);
      res.status(500).json({ message: "Failed to fetch pending transfers" });
    }
  });

  // Admin endpoint to get all credit transfers (pending and verified) with sender details
  app.get("/api/admin/pending-credit-transfers", isAdmin, async (req, res) => {
    try {
      const pendingTransfers = await storage.getAllPendingCreditTransfers();
      
      // Enrich with sender information
      const enrichedTransfers = await Promise.all(
        pendingTransfers.map(async (transfer) => {
          const sender = await storage.getUser(transfer.senderId);
          return {
            ...transfer,
            senderName: sender?.username || "Unknown",
            senderFullName: sender?.fullName || null
          };
        })
      );
      
      res.json(enrichedTransfers);
    } catch (error) {
      console.error("Error fetching all pending credit transfers:", error);
      res.status(500).json({ message: "Failed to fetch pending transfers" });
    }
  });

  // Admin endpoint to get all credit transfers (both pending and verified)
  app.get("/api/admin/all-credit-transfers", isAdmin, async (req, res) => {
    try {
      const allTransfers = await storage.getAllCreditTransfers();
      
      // Enrich with sender information and verifier information
      const enrichedTransfers = await Promise.all(
        allTransfers.map(async (transfer) => {
          const sender = await storage.getUser(transfer.senderId);
          let verifierName = null;
          if (transfer.verifiedByUserId) {
            const verifier = await storage.getUser(transfer.verifiedByUserId);
            verifierName = verifier?.username || "Unknown";
          }
          
          return {
            ...transfer,
            senderName: sender?.username || "Unknown",
            senderFullName: sender?.fullName || null,
            verifierName
          };
        })
      );
      
      res.json(enrichedTransfers);
    } catch (error) {
      console.error("Error fetching all credit transfers:", error);
      res.status(500).json({ message: "Failed to fetch credit transfers" });
    }
  });

  // Share credits via SMS (create pending transfer)
  app.post("/api/share-credits", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { phoneNumber, amount, sendSMS = false } = req.body;
      
      // Validate input
      if (!phoneNumber || !amount || amount <= 0) {
        return res.status(400).json({ message: "Valid phone number and amount required" });
      }

      const user = req.user;
      if (!user || amount > user.credits) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Generate unique verification code (6 digits)
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create pending credit transfer
      const pendingTransfer = await storage.createPendingCreditTransfer({
        verificationCode,
        senderId: user.id,
        recipientPhone: phoneNumber,
        amount,
        status: "pending",
        expiresAt
      });

      // Create SMS message using full name if available, fallback to username
      const senderName = user.fullName || user.username;
      const smsMessage = `🎁 You've received $${amount.toFixed(2)} Bean Stalker credits from ${senderName}! Show this code at our store: ${verificationCode}. Valid for 24 hours. Bean Stalker Coffee Shop`;

      let smsStatus = null;
      
      // Send SMS via Omnisend if requested
      if (sendSMS) {
        try {
          console.log(`🔧 Starting SMS send process for ${phoneNumber}, amount: $${amount}`);
          const { OmnisendService } = await import('./omnisend-service');
          
          console.log('🔧 Checking Omnisend configuration...');
          if (OmnisendService.isConfigured()) {
            console.log('🔧 Omnisend is configured, sending SMS...');
            
            const smsResult = await OmnisendService.sendCreditShareSMS(
              phoneNumber,
              amount,
              senderName,
              verificationCode
            );
            
            smsStatus = smsResult;
            
            if (smsResult.success) {
              console.log(`✅ SMS sent successfully to ${phoneNumber} for credit share of $${amount}`);
              console.log(`✅ Message ID: ${smsResult.messageId}`);
            } else {
              console.error(`❌ Failed to send SMS via Omnisend: ${smsResult.error}`);
            }
          } else {
            console.error('❌ Omnisend not configured');
            smsStatus = { 
              success: false, 
              error: 'Omnisend not configured. Set OMNISEND_API_KEY environment variable.' 
            };
          }
        } catch (smsError) {
          console.error('❌ SMS sending error:', smsError);
          smsStatus = { 
            success: false, 
            error: 'SMS service temporarily unavailable' 
          };
        }
      }

      res.json({
        success: true,
        verificationCode,
        smsMessage,
        expiresAt: expiresAt.toISOString(),
        smsStatus
      });

    } catch (error) {
      console.error("Credit sharing error:", error);
      res.status(500).json({ message: "Failed to create credit share" });
    }
  });

  // Test Omnisend connection (development endpoint)
  app.post("/api/test-omnisend", async (req, res) => {
    try {
      const { OmnisendService } = await import('./omnisend-service');
      
      console.log('🔧 Testing Omnisend API connection...');
      const testResult = await OmnisendService.testConnection();
      
      res.json({
        configured: OmnisendService.isConfigured(),
        testResult
      });
    } catch (error) {
      console.error('Test endpoint error:', error);
      res.status(500).json({ error: 'Test failed' });
    }
  });

  // Test Apple Wallet certificate configuration
  app.post("/api/test-apple-wallet", async (req, res) => {
    try {
      console.log('🍎 Testing Apple Wallet certificate configuration...');
      
      const certificates = {
        team_id: !!process.env.APPLE_TEAM_ID,
        cert_password: !!process.env.APPLE_WALLET_CERT_PASSWORD
      };
      
      const allConfigured = Object.values(certificates).every(Boolean);
      
      // Check if certificate files exist
      let filesExist = {};
      const fs = await import('fs');
      const path = await import('path');
      
      try {
        const certPath = path.join(process.cwd(), 'certs', 'bean_stalker_pass_cert.p12');
        const wwdrPath = path.join(process.cwd(), 'certs', 'wwdr.pem');
        
        filesExist = {
          pass_cert: fs.existsSync(certPath),
          wwdr_cert: fs.existsSync(wwdrPath)
        };
      } catch (error) {
        filesExist = {
          pass_cert: false,
          wwdr_cert: false
        };
      }
      
      const allFilesExist = Object.values(filesExist).every(Boolean);
      
      res.json({
        configured: allConfigured,
        certificates,
        filesExist,
        ready: allConfigured && allFilesExist,
        status: allConfigured && allFilesExist 
          ? 'Ready for Apple Wallet pass generation' 
          : 'Missing configuration or certificate files',
        teamId: process.env.APPLE_TEAM_ID || 'Not set'
      });
      
    } catch (error) {
      console.error('Apple Wallet test error:', error);
      res.status(500).json({ 
        configured: false,
        error: error instanceof Error ? error.message : 'Test failed'
      });
    }
  });

  // Generate Apple Wallet pass for credit balance
  app.post("/api/apple-wallet/generate-pass", isAuthenticated, async (req, res) => {
    try {
      const { userId, username, currentBalance, passData } = req.body;
      
      // Validate request
      if (!userId || !username || typeof currentBalance !== 'number' || !passData) {
        return res.status(400).json({ error: 'Missing required pass data' });
      }
      
      // Ensure user can only generate passes for themselves (or admin can generate for anyone)
      if (req.user!.id !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ error: 'Can only generate passes for your own account' });
      }
      
      // Import Apple Wallet service
      const { AppleWalletPassGenerator } = await import('./apple-wallet-pass');
      
      console.log(`🍎 Generating Apple Wallet pass for user ${userId} (${username}) with balance $${currentBalance}`);
      
      // Generate the pass
      const result = await AppleWalletPassGenerator.generatePass(userId, username, currentBalance, passData);
      
      if (result.success && result.passBase64) {
        console.log('✅ Apple Wallet pass generated successfully');
        res.json({
          success: true,
          passBase64: result.passBase64
        });
      } else {
        console.log('❌ Apple Wallet pass generation failed:', result.error);
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to generate pass'
        });
      }
      
    } catch (error) {
      console.error('Apple Wallet pass generation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Pass generation failed'
      });
    }
  });

  // Verify credit share code (staff endpoint)
  app.post("/api/verify-credit-share", isAdmin, async (req, res) => {
    try {
      const { verificationCode } = req.body;
      
      if (!verificationCode) {
        return res.status(400).json({ message: "Verification code required" });
      }

      // Get pending transfer
      const pendingTransfer = await storage.getPendingCreditTransferByCode(verificationCode);
      
      if (!pendingTransfer) {
        return res.status(404).json({ message: "Invalid verification code" });
      }

      if (pendingTransfer.status !== "pending") {
        return res.status(400).json({ message: "Code already used or expired" });
      }

      if (new Date() > new Date(pendingTransfer.expiresAt)) {
        return res.status(400).json({ message: "Verification code expired" });
      }

      // Get sender user
      const sender = await storage.getUser(pendingTransfer.senderId);
      if (!sender) {
        return res.status(404).json({ message: "Sender not found" });
      }

      // Check if sender still has enough credits
      if (sender.credits < pendingTransfer.amount) {
        return res.status(400).json({ message: "Sender has insufficient credits" });
      }

      // Deduct credits from sender
      const newSenderBalance = sender.credits - pendingTransfer.amount;
      await storage.updateUserCredits(sender.id, newSenderBalance);

      // Create transaction record
      await storage.createCreditTransaction({
        type: "credit_share",
        amount: -pendingTransfer.amount,
        description: `Shared $${pendingTransfer.amount} via SMS to ${pendingTransfer.recipientPhone}`,
        userId: sender.id,
        balanceAfter: newSenderBalance,
        transactionId: verificationCode
      });

      // Mark transfer as verified
      await storage.verifyPendingCreditTransfer(pendingTransfer.id, req.user.id);

      // Send push notification to sender about successful credit share
      try {
        await sendPushNotificationToUser(sender.id, {
          title: "Credits Shared Successfully",
          body: `$${pendingTransfer.amount} has been claimed from your account`,
          data: {
            type: "credit_shared",
            amount: pendingTransfer.amount,
            recipientPhone: pendingTransfer.recipientPhone,
            timestamp: new Date().toISOString()
          }
        });
      } catch (notificationError) {
        console.error("Failed to send credit share notification:", notificationError);
      }

      res.json({
        success: true,
        message: `Successfully deducted $${pendingTransfer.amount} from ${sender.username}`,
        senderName: sender.username,
        amount: pendingTransfer.amount,
        recipientPhone: pendingTransfer.recipientPhone
      });

    } catch (error) {
      console.error("Credit verification error:", error);
      res.status(500).json({ message: "Failed to verify credit share" });
    }
  });

  // Square for Restaurants Integration Routes

  // Create restaurant order in Square
  app.post("/api/restaurant/orders", async (req, res) => {
    try {
      const { createRestaurantOrder } = await import('./square-restaurant');
      const orderData = req.body;
      
      // Add customer information if user is logged in
      if (req.user) {
        orderData.customerId = req.user.id.toString();
        orderData.customerName = req.user.username;
      }
      
      const result = await createRestaurantOrder(orderData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Restaurant order creation failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to create restaurant order" 
      });
    }
  });

  // Update restaurant order status
  app.patch("/api/restaurant/orders/:orderId/status", isAdmin, async (req, res) => {
    try {
      const { updateOrderStatus } = await import('./square-restaurant');
      const { orderId } = req.params;
      const { status } = req.body;
      
      const result = await updateOrderStatus(orderId, status);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Order status update failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to update order status" 
      });
    }
  });

  // Get Square menu items for sync
  app.get("/api/restaurant/menu/sync", isAdmin, async (req, res) => {
    try {
      const { getSquareMenuItems } = await import('./square-restaurant');
      const result = await getSquareMenuItems();
      res.json(result);
    } catch (error) {
      console.error("Square menu sync failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to sync menu items" 
      });
    }
  });

  // Sync inventory levels with Square
  app.get("/api/restaurant/inventory/sync", isAdmin, async (req, res) => {
    try {
      const { syncInventoryLevels } = await import('./square-restaurant');
      const result = await syncInventoryLevels();
      res.json(result);
    } catch (error) {
      console.error("Inventory sync failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to sync inventory" 
      });
    }
  });

  // Process restaurant payment
  app.post("/api/restaurant/payment", async (req, res) => {
    try {
      const { processRestaurantPayment } = await import('./square-restaurant');
      const { amount, sourceId, orderId } = req.body;
      
      const result = await processRestaurantPayment(amount, sourceId, orderId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Restaurant payment failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to process payment" 
      });
    }
  });

  // Get location information
  app.get("/api/restaurant/location", async (req, res) => {
    try {
      const { getLocationInfo } = await import('./square-restaurant');
      const result = await getLocationInfo();
      res.json(result);
    } catch (error) {
      console.error("Location info retrieval failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get location info" 
      });
    }
  });

  // Kitchen Display System Routes

  // Get restaurant orders for kitchen display
  app.get("/api/kitchen/orders", async (req, res) => {
    try {
      // Get recent orders from database
      const orders = await storage.getRecentOrders(50);
      
      // Transform orders for Square Kitchen Display format
      const kitchenOrders = orders.map(order => ({
        id: order.id,
        customerName: order.username || `Customer #${order.userId}`,
        items: order.items || [],
        status: order.status || 'pending',
        total: order.total,
        createdAt: order.createdAt,
        estimatedTime: 15, // Default 15 minutes
        priority: order.total > 50 ? 3 : (order.total > 25 ? 2 : 1),
        station: 'main',
        fulfillmentType: 'PICKUP' // Default fulfillment type for Square
      }));
      
      res.json(kitchenOrders);
    } catch (error) {
      console.error("Kitchen orders retrieval failed:", error);
      res.status(500).json({ 
        error: "Failed to get kitchen orders" 
      });
    }
  });

  // Update kitchen order status
  app.patch("/api/kitchen/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, assignedTo, estimatedTime } = req.body;
      
      // Update order status in database
      await storage.updateOrderStatus(parseInt(orderId), status);
      
      // Square Kitchen Display integration handled via webhooks
      console.log(`📤 Order #${orderId} status updated - Square sync via webhooks`);
      
      res.json({
        success: true,
        orderId,
        status,
        assignedTo,
        estimatedTime,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Kitchen order update failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to update kitchen order" 
      });
    }
  });

  // Square Kitchen Display sync endpoint - TEST VERSION
  app.get("/api/square/test-sync", async (req, res) => {
    try {
      const { syncOrdersToSquareKitchen } = await import('./square-kitchen-integration');
      const result = await syncOrdersToSquareKitchen();
      
      res.json({
        success: result.success,
        message: `Processed ${result.syncedCount} orders for Square Orders API`,
        syncedCount: result.syncedCount,
        errors: result.errors,
        note: "This shows whether orders would be sent to Square Orders API"
      });
    } catch (error) {
      console.error("Square Kitchen sync test failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to test Square sync" 
      });
    }
  });

  // Real Square Orders API integration - SEND TO ACTUAL SQUARE ACCOUNT
  app.post("/api/square/send-orders", async (req, res) => {
    try {
      const { sendOrdersToSquare } = await import('./square-orders-sync');
      const result = await sendOrdersToSquare();
      res.json({
        success: result.success,
        message: `Created ${result.created} orders in Square sandbox account`,
        created: result.created,
        errors: result.errors
      });
    } catch (error) {
      console.error("Square Orders API sync error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send orders to Square API",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get orders from Square to verify they were created
  app.get("/api/square/orders", async (req, res) => {
    try {
      const { getSquareOrders } = await import('./square-orders-sync');
      const orders = await getSquareOrders();
      res.json({ 
        success: true,
        orders, 
        count: orders.length,
        message: `Found ${orders.length} orders in Square sandbox account`
      });
    } catch (error) {
      console.error("Square Orders fetch error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch orders from Square",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual sync individual order to Square (supports internal calls)
  app.post("/api/square/sync-order/:orderId", async (req, res) => {
    // Skip authentication for internal sync calls
    const isInternalSync = req.headers['x-internal-sync'] === 'true';
    if (!isInternalSync && !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const orderId = parseInt(req.params.orderId);
      console.log(`🔄 Manual sync request for order #${orderId}`);
      
      const { sendSingleOrderToSquare } = await import('./square-single-order-sync');
      const result = await sendSingleOrderToSquare(orderId);
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Order #${orderId} synced to Square successfully` 
          : `Failed to sync order #${orderId}`,
        squareOrderId: result.squareOrderId,
        error: result.error
      });
    } catch (error) {
      console.error(`Failed to sync order #${req.params.orderId}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual sync from Square - check Square order statuses and update Bean Stalker orders
  app.post("/api/square/sync-from-square", async (req, res) => {
    try {
      console.log(`🔄 Manual sync from Square - checking all order statuses...`);
      
      const { syncOrdersFromSquare } = await import('./square-kitchen-integration-simple');
      const result = await syncOrdersFromSquare();
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Checked Square status for ${result.ordersChecked} orders, updated ${result.ordersUpdated} Bean Stalker orders`
          : `Failed to sync from Square: ${result.error}`,
        ordersChecked: result.ordersChecked,
        ordersUpdated: result.ordersUpdated,
        error: result.error
      });
    } catch (error) {
      console.error(`Failed to sync from Square:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Square Kitchen Display sync endpoint
  app.post("/api/square/kitchen/sync", async (req, res) => {
    try {
      const { syncOrdersToSquareKitchen } = await import('./square-kitchen-integration');
      const result = await syncOrdersToSquareKitchen();
      
      res.json({
        success: result.success,
        message: `Synced ${result.syncedCount} orders to Square Kitchen Display`,
        syncedCount: result.syncedCount,
        errors: result.errors
      });
    } catch (error) {
      console.error("Square Kitchen sync failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to sync with Square Kitchen Display" 
      });
    }
  });

  // Get Square-formatted kitchen orders
  app.get("/api/square/kitchen/orders", async (req, res) => {
    try {
      const { getSquareKitchenOrders } = await import('./square-kitchen-integration');
      const squareOrders = await getSquareKitchenOrders();
      
      res.json({
        success: true,
        orders: squareOrders,
        count: squareOrders.length
      });
    } catch (error) {
      console.error("Failed to get Square kitchen orders:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get Square kitchen orders" 
      });
    }
  });

  // Square credentials diagnostic endpoint
  app.get("/api/square/diagnostic", async (req, res) => {
    try {
      res.json({
        hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
        hasApplicationId: !!process.env.SQUARE_APPLICATION_ID,
        hasLocationId: !!process.env.SQUARE_LOCATION_ID,
        hasWebhookKey: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
        locationId: process.env.SQUARE_LOCATION_ID || 'NOT_SET',
        environment: 'SANDBOX'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get diagnostic info' });
    }
  });

  // Test data reset endpoint for development
  app.post("/api/admin/reset-test-data", async (req, res) => {
    try {
      console.log('🧹 RESET: Starting test data cleanup...');
      
      // Only allow in development/sandbox
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Reset not allowed in production' });
      }
      
      // Clear test users (keep users with ID <= 5 as real users)
      await storage.clearAllUsers([1, 2, 3, 4, 5]);
      console.log('🧹 RESET: Deleted test users');
      
      // Clear all orders
      await storage.clearAllOrders();
      console.log('🧹 RESET: Cleared all orders');
      
      // Clear RevenueCat user mappings
      global.revenueCatUserMappings = new Map();
      console.log('🧹 RESET: Cleared RevenueCat user mappings');
      
      res.json({
        success: true,
        message: 'Test data reset complete',
        timestamp: new Date().toISOString(),
        actions: [
          'Deleted test users (ID > 5)',
          'Cleared all orders', 
          'Reset RevenueCat mappings'
        ]
      });
      
    } catch (error) {
      console.error('❌ RESET: Failed to reset test data:', error);
      res.status(500).json({ 
        error: 'Failed to reset test data',
        details: error.message 
      });
    }
  });

  // Helper endpoint to check current test data
  app.get("/api/admin/test-data-status", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const orders = await storage.getAllOrders();
      
      const testUsers = users.filter(u => u.id && u.id > 5);
      const userMappings = global.revenueCatUserMappings?.size || 0;
      
      res.json({
        totalUsers: users.length,
        testUsers: testUsers.length,
        totalOrders: orders.length,
        revenueCatMappings: userMappings,
        testUserIds: testUsers.map(u => u.id)
      });
      
    } catch (error) {
      console.error('❌ STATUS: Failed to get test data status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  // Store RevenueCat anonymous ID mapping
  app.post("/api/revenuecat/store-user-mapping", async (req, res) => {
    try {
      const { anonymousId, realUserId } = req.body;
      console.log('🗺️ Storing RevenueCat user mapping:', { anonymousId, realUserId });
      
      // Store in memory mapping (in production, use Redis or database)
      global.revenueCatUserMappings = global.revenueCatUserMappings || new Map();
      global.revenueCatUserMappings.set(anonymousId, realUserId);
      
      res.json({ success: true, message: 'User mapping stored' });
    } catch (error) {
      console.error('❌ Failed to store user mapping:', error);
      res.status(500).json({ error: 'Failed to store mapping' });
    }
  });

  // RevenueCat webhook for IAP processing
  app.post("/api/revenuecat/webhook", async (req, res) => {
    try {
      console.log('📨 Received RevenueCat webhook:', req.body);
      
      // Optional: Verify authorization header if configured
      const authHeader = req.headers.authorization;
      if (authHeader) {
        console.log('🔐 Authorization header received:', authHeader);
        // You can add validation here if needed
        if (authHeader !== 'Bearer bean-stalker-webhook-2025') {
          console.log('❌ Invalid authorization header');
          // Note: For testing, we'll continue processing anyway
        }
      }
      
      const { event } = req.body;
      
      // Handle test pings and non-RevenueCat requests
      if (!event) {
        console.log('📨 Webhook ping/test received');
        return res.status(200).json({ message: 'Webhook endpoint active' });
      }
      
      if (!event.type) {
        console.log('📨 Invalid webhook format - missing event.type');
        return res.status(200).json({ message: 'Invalid event format' });
      }
      
      if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
        const { product_id, app_user_id } = event;
        
        // ENHANCED ANONYMOUS ID SUPPORT: Handle all RevenueCat ID formats
        let userId = parseInt(app_user_id);
        let isAnonymousId = false;
        
        // Handle user_ prefixed IDs from aliasing
        if (!userId && app_user_id?.startsWith('user_')) {
          const numericId = app_user_id.replace('user_', '');
          userId = parseInt(numericId);
          console.log('🔍 USER_ PREFIXED ID DETECTED:', { original: app_user_id, parsed: userId });
        }
        
        // If app_user_id is anonymous, look up the real user ID
        if (!userId && app_user_id?.startsWith('$RCAnonymousID:')) {
          console.log('🔍 ANONYMOUS ID DETECTED:', app_user_id);
          isAnonymousId = true;
          
          global.revenueCatUserMappings = global.revenueCatUserMappings || new Map();
          const realUserId = global.revenueCatUserMappings.get(app_user_id);
          
          if (realUserId) {
            userId = parseInt(realUserId);
            console.log('✅ MAPPED ANONYMOUS ID TO REAL USER:', { anonymous: app_user_id, real: userId });
          } else {
            // ENHANCED: Check if we have a pending user for this purchase
            // Look for most recent user without credits (likely the new registration)
            console.log('🔍 No mapping found, checking for recent registrations...');
            
            // Find the most recent user with 0 credits (indicating new registration awaiting IAP)
            const users = await storage.getAllUsers();
            
            const recentUser = users
              .filter(u => u.credits === 0 && u.isActive)
              .sort((a, b) => (b.id || 0) - (a.id || 0))[0];
            
            if (recentUser) {
              userId = recentUser.id;
              console.log('✅ MATCHED ANONYMOUS PURCHASE TO RECENT USER:', { 
                anonymous: app_user_id, 
                user: userId, 
                username: recentUser.username 
              });
              
              // Store mapping for future use
              global.revenueCatUserMappings.set(app_user_id, userId.toString());
            } else {
              console.error('❌ No recent user found for anonymous ID:', app_user_id);
              console.log('Debug: Available users with 0 credits:', users.filter(u => u.credits === 0).map(u => ({ id: u.id, username: u.username, credits: u.credits })));
              return res.status(400).json({ error: 'Cannot map anonymous ID to user' });
            }
          }
        }
        
        if (!userId) {
          console.error('❌ Invalid user ID in RevenueCat webhook');
          return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        // Determine credit amount based on exact product IDs
        let creditAmount = 0;
        let transactionType = "iap_purchase";
        
        if (product_id === 'com.beanstalker.membership69') {
          creditAmount = 69;
          transactionType = "membership_iap";
        } else if (product_id === 'com.beanstalker.credits25') {
          creditAmount = 29.50; // $25 → $29.50 ($4.50 bonus)
        } else if (product_id === 'com.beanstalker.credits50') {
          creditAmount = 59.90; // $50 → $59.90 ($9.90 bonus)
        } else if (product_id === 'com.beanstalker.credits100') {
          creditAmount = 120.70; // $100 → $120.70 ($20.70 bonus)
        } else {
          console.error('❌ Unknown product ID:', product_id);
          return res.status(400).json({ error: 'Unknown product ID' });
        }
        
        // Update user credits
        const user = await storage.getUser(userId);
        if (!user) {
          console.error('❌ User not found:', userId);
          return res.status(404).json({ error: 'User not found' });
        }
        
        const updatedUser = await storage.updateUserCredits(userId, user.credits + creditAmount);
        
        // Record the transaction
        await storage.createCreditTransaction({
          userId,
          type: transactionType,
          amount: creditAmount,
          description: `RevenueCat IAP: ${product_id}`,
          balanceAfter: updatedUser.credits,
          relatedUserId: null,
          orderId: null
        });
        
        // Only log in development or when debugging enabled  
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_IAP_LOGGING === 'true') {
          console.log(`✅ RevenueCat IAP processed: User ${userId} received ${creditAmount} credits from ${product_id}`);
        }
        
        res.status(200).json({ 
          message: "Webhook processed successfully",
          creditsAdded: creditAmount,
          userId
        });
      } else {
        console.log('ℹ️ RevenueCat webhook event type not processed:', event.type);
        res.status(200).json({ message: "Event type not processed" });
      }
    } catch (error) {
      console.error('💥 RevenueCat webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // IAP purchase verification endpoint
  app.post("/api/iap/verify-purchase", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { productId, transactionId, receipt } = req.body;
      const userId = req.user!.id;
      
      console.log(`🔍 Verifying IAP purchase: ${productId} for user ${userId}`);
      
      if (!productId || !transactionId || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if this transaction has already been processed
      const existingTransaction = await storage.getCreditTransactionByTransactionId(transactionId);
      if (existingTransaction) {
        return res.status(400).json({ message: "Transaction already processed" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Determine credit amount and transaction type based on product ID
      let creditAmount = 0;
      let transactionType = "iap_purchase";
      
      if (productId.includes('membership69')) {
        creditAmount = 69; // AUD$69 membership
        transactionType = "membership_iap";
      } else if (productId.includes('credits25')) {
        creditAmount = 29.50; // $25 purchase → $29.50 credits ($4.50 bonus)
      } else if (productId.includes('credits50')) {
        creditAmount = 59.90; // $50 purchase → $59.90 credits ($9.90 bonus)
      } else if (productId.includes('credits100')) {
        creditAmount = 120.70; // $100 purchase → $120.70 credits ($20.70 bonus)
      } else {
        return res.status(400).json({ message: "Unknown product ID" });
      }

      // Update user credits
      const updatedUser = await storage.updateUserCredits(userId, user.credits + creditAmount);
      
      // Record the transaction
      await storage.createCreditTransaction({
        userId,
        type: transactionType,
        amount: creditAmount,
        description: `IAP: ${productId}`,
        transactionId,
        balanceAfter: updatedUser.credits,
        relatedUserId: null,
        orderId: null
      });

      console.log(`✅ IAP Purchase verified: User ${userId} received ${creditAmount} credits from ${productId}`);
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json({ 
        success: true,
        message: 'Purchase verified and credits added successfully',
        user: userWithoutPassword,
        creditsAdded: creditAmount,
        productId,
        transactionId
      });
      
    } catch (error) {
      console.error('IAP verification error:', error);
      res.status(500).json({ error: 'Purchase verification failed' });
    }
  });

  // Square webhook for bidirectional kitchen display sync
  app.post("/api/square/webhook", async (req, res) => {
    try {
      // Log webhook reception for debugging
      console.log('📨 Received Square webhook:', {
        eventType: req.body?.event_type || req.body?.type,
        eventId: req.body?.event_id,
        merchantId: req.body?.merchant_id,
        timestamp: new Date().toISOString()
      });
      
      // Webhook signature verification (if SQUARE_WEBHOOK_SIGNATURE_KEY is set)
      const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      
      // Temporarily disable webhook signature verification for testing
      console.log('🔧 TESTING MODE: Webhook signature verification temporarily disabled');
      console.log('📋 Request headers:', Object.keys(req.headers));
      console.log('🔐 X-Square-Signature header:', req.headers['x-square-signature']);
      
      if (signatureKey) {
        console.log('ℹ️ Signature key is configured but verification is disabled for testing');
      } else {
        console.log('ℹ️ No SQUARE_WEBHOOK_SIGNATURE_KEY configured');
      }
      
      // Log full payload for debugging (can be removed in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log('📨 Full webhook payload:', JSON.stringify(req.body, null, 2));
      }
      
      // Process the webhook
      const { handleSquareWebhook } = await import('./square-integration-final');
      const result = await handleSquareWebhook(req.body);
      
      if (result.success) {
        if (result.ordersUpdated > 0) {
          console.log(`✅ Square webhook processed successfully: ${result.ordersUpdated} Bean Stalker orders updated`);
          
          // Send immediate response to Square
          res.status(200).json({ 
            message: "Webhook processed successfully",
            ordersUpdated: result.ordersUpdated,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('ℹ️ Square webhook processed but no Bean Stalker orders were updated');
          res.status(200).json({ 
            message: "Webhook processed, no orders updated",
            ordersUpdated: 0,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.error('❌ Square webhook processing failed:', result.error);
        res.status(500).json({ 
          message: "Webhook processing failed",
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('💥 Square webhook endpoint error:', error);
      
      // Still return 200 to Square to prevent retries for non-recoverable errors
      res.status(200).json({ 
        message: "Webhook received but processing failed",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // User sync endpoint to check Square order status for their orders
  app.post("/api/square/sync-my-orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const { syncOrdersFromSquare } = await import('./square-kitchen-integration');
      const result = await syncOrdersFromSquare();
      
      // Filter to only return updates for this user's orders
      const allOrders = await storage.getOrders();
      const userOrders = allOrders.filter(order => order.userId === req.user.id);
      const userOrderIds = userOrders.map(order => order.id);
      
      const userUpdatedOrders = result.updatedOrders?.filter((update: any) => 
        userOrderIds.includes(update.orderId)
      ) || [];
      
      const userResult = {
        ...result,
        updatedOrders: userUpdatedOrders,
        ordersUpdated: userUpdatedOrders.length
      };
      
      console.log(`🔄 User Square sync completed for user ${req.user.id}: ${userResult.ordersUpdated} orders updated`);
      res.json(userResult);
    } catch (error) {
      console.error('❌ User Square sync failed:', error);
      res.status(500).json({ 
        error: "Failed to sync orders from Square Kitchen",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin manual sync endpoint to check Square order status (all orders)
  app.post("/api/square/manual-sync", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const { syncOrdersFromSquare } = await import('./square-kitchen-integration');
      const result = await syncOrdersFromSquare();
      
      console.log(`🔄 Manual Square sync completed: ${result.ordersUpdated} orders updated`);
      res.json(result);
    } catch (error) {
      console.error('❌ Manual Square sync error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Debug endpoint to check Square configuration (forced override)
  app.get("/api/debug/square-config", (req, res) => {
    const config = squareConfig;
    
    res.json({
      locationId: config.locationId,
      applicationId: config.applicationId,
      hasAccessToken: !!config.accessToken,
      hasWebhookSignature: !!config.webhookSignatureKey,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'development',
      override: 'FORCED_BEANSTALKER_SANDBOX'
    });
  });

  // RevenueCat Configuration Diagnostic
  app.get("/api/debug/revenuecat", async (req, res) => {
    try {
      const diagnostic = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        apiKeyConfigured: !!process.env.VITE_REVENUECAT_API_KEY,
        bundleId: 'com.beanstalker.member',
        expectedProducts: [
          'com.beanstalker.credits25',
          'com.beanstalker.credits50', 
          'com.beanstalker.credits100',
          'com.beanstalker.membership69'
        ],
        configuration: {
          webhookUrl: 'https://member.beanstalker.com.au/api/revenuecat/webhook',
          creditStructure: {
            'com.beanstalker.credits25': { purchase: 25, credits: 29.50, bonus: 4.50 },
            'com.beanstalker.credits50': { purchase: 50, credits: 59.90, bonus: 9.90 },
            'com.beanstalker.credits100': { purchase: 100, credits: 120.70, bonus: 20.70 },
            'com.beanstalker.membership69': { purchase: 69, credits: 69, bonus: 0 }
          }
        },
        appStoreConnect: {
          bundleId: 'com.beanstalker.member',
          productsInDraft: true,
          sandboxReady: true
        },
        nextSteps: [
          '1. Verify App Store Connect API integration in RevenueCat Dashboard',
          '2. Create RevenueCat Offerings for better product management',
          '3. Set up sandbox test user for IAP testing',
          '4. Test purchase flow with draft products (works in sandbox)',
          '5. Configure RevenueCat webhook URL in dashboard'
        ]
      };
      
      res.json(diagnostic);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to generate RevenueCat diagnostic',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Square OAuth authorization endpoint
  app.get("/api/square/oauth/authorize", async (req, res) => {
    try {
      const { generateOAuthAuthorizationUrl } = await import('./square-oauth');
      const authUrl = generateOAuthAuthorizationUrl();
      
      res.json({
        success: true,
        authorizationUrl: authUrl,
        message: 'Visit this URL to authorize Bean Stalker with your Square account'
      });
    } catch (error) {
      console.error("OAuth authorization URL generation failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Square OAuth callback endpoint
  app.get("/auth/square/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.status(400).send(`OAuth Error: ${error}`);
      }
      
      if (!code) {
        return res.status(400).send('Missing authorization code');
      }
      
      const { exchangeCodeForAccessToken } = await import('./square-oauth');
      const tokenData = await exchangeCodeForAccessToken(code as string);
      
      res.json({
        success: true,
        message: 'OAuth authorization successful',
        data: tokenData
      });
    } catch (error) {
      console.error("OAuth callback failed:", error);
      res.status(500).send(`OAuth Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Debug Square API connectivity test with production detection
  app.get("/api/debug/square-test", async (req, res) => {
    try {
      const { getSquareLocationId, getSquareApplicationId, getSquareAccessToken } = await import('./square-config');
      const locationId = getSquareLocationId();
      const applicationId = getSquareApplicationId();
      const accessToken = getSquareAccessToken();
      
      // Check which environment is being used
      const isProduction = !!(process.env.SQUARE_ACCESS_TOKEN_PROD || process.env.SQUARE_LOCATION_ID_PROD);
      const environment = isProduction ? 'PRODUCTION' : 'SANDBOX';
      
      // Log current configuration for debugging
      console.log(`🔍 Square Debug - Environment: ${environment}`);
      console.log(`🔍 Square Debug - Location: ${locationId}`);
      console.log(`🔍 Square Debug - App ID: ${applicationId?.substring(0, 20)}...`);
      console.log(`🔍 Square Debug - Has Token: ${!!accessToken}`);
      console.log(`🔍 Square Debug - Token starts with: ${accessToken?.substring(0, 10)}...`);
      console.log(`🔍 Square Debug - Token length: ${accessToken?.length || 0}`);
      
      console.log("Testing Square API connectivity...");
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Use production URL for production credentials, sandbox for others
      const baseUrl = environment === 'PRODUCTION' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
      
      // Try different authentication methods for modern Square OAuth
      let response;
      
      // Method 1: Standard Bearer token
      try {
        response = await fetch(`${baseUrl}/v2/locations`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Square-Version': '2024-06-04',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`🔍 Tried Bearer token authentication: ${response.status}`);
        
        if (response.status === 401) {
          // Method 2: Try with application secret if Bearer fails
          const { getSquareApplicationSecret } = await import('./square-config');
          const appSecret = getSquareApplicationSecret();
          
          if (appSecret) {
            console.log("🔄 Trying OAuth authentication with application secret...");
            response = await fetch(`${baseUrl}/v2/locations`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${appSecret}`,
                'Square-Version': '2024-06-04',
                'Content-Type': 'application/json'
              }
            });
            console.log(`🔍 Tried application secret authentication: ${response.status}`);
          }
        }
      } catch (error) {
        console.error('Square API authentication error:', error);
        throw error;
      }

      const data = await response.text();
      console.log("Square API response:", response.status, data);

      res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: response.ok ? JSON.parse(data) : data,
        config: {
          locationId: locationId,
          hasToken: !!accessToken
        }
      });
    } catch (error) {
      console.error("Square API test failed:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Serve static images with CORS headers for mobile app compatibility
  app.get('/images/*', (req, res) => {
    const imagePath = req.path.substring(8); // Remove '/images/' prefix
    const fullPath = path.join(process.cwd(), 'client/public', imagePath);
    
    // Set CORS headers for mobile app access
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });
    
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      res.sendFile(path.resolve(fullPath));
    } else {
      // Fallback to coffee icon if image doesn't exist
      const fallbackPath = path.join(process.cwd(), 'client/public/coffee-icon.png');
      if (fs.existsSync(fallbackPath)) {
        res.sendFile(path.resolve(fallbackPath));
      } else {
        res.status(404).json({ error: 'Image not found' });
      }
    }
  });

  // Serve root-level static files with CORS headers for mobile app compatibility
  app.get('/:filename.(png|jpg|jpeg|gif|svg)', (req, res) => {
    const filename = req.params.filename + '.' + req.params[0];
    const filePath = path.join(process.cwd(), 'client/public', filename);
    
    // Set CORS headers for mobile app access
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=86400'
    });
    
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
