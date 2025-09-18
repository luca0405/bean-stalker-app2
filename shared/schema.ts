import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  credits: doublePrecision("credits").notNull().default(0),
  fullName: text("full_name"),
  phoneNumber: text("phone_number"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isMember: boolean("is_member").notNull().default(false),
  membershipDate: timestamp("membership_date"),
  qrCode: text("qr_code"), // Store the QR code data URL
  resetToken: text("reset_token"), // Password reset token
  resetTokenExpiry: timestamp("reset_token_expiry"), // Expiration time for reset token
});

export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(999),
  squareCategoryId: text("square_category_id"), // Square category ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  hasSizes: boolean("has_sizes").default(false),
  mediumPrice: doublePrecision("medium_price"),
  largePrice: doublePrecision("large_price"),
  hasOptions: boolean("has_options").default(false), // Flag to indicate if item has flavor options
  squareId: text("square_id"), // Square catalog item ID
  squareCategoryId: text("square_category_id"), // Square category ID
});


export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status").notNull().default("processing"),
  total: doublePrecision("total").notNull(),
  items: jsonb("items").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  phoneNumber: true,
  isAdmin: true,
  isActive: true,
  credits: true,
  qrCode: true,
});

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems);


export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;

// Base MenuItem type from database
export type MenuItem = typeof menuItems.$inferSelect & {
  // Extended fields for Square integration
  categoryDisplayName?: string;
  squareImageUrl?: string | null;
  isAvailable?: boolean;
  variations?: {
    id: string;
    name: string;
    price: number;
    squarePrice: number;
    isDefault: boolean;
  }[];
};
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;


export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'purchase', 'transfer_sent', 'transfer_received', 'order_payment', 'iap_purchase', 'membership_iap'
  amount: doublePrecision("amount").notNull(),
  balanceAfter: doublePrecision("balance_after").notNull(),
  description: text("description").notNull(),
  relatedUserId: integer("related_user_id").references(() => users.id), // For transfers
  orderId: integer("order_id").references(() => orders.id), // For order payments
  transactionId: text("transaction_id"), // For IAP transaction tracking
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pendingCreditTransfers = pgTable("pending_credit_transfers", {
  id: serial("id").primaryKey(),
  verificationCode: text("verification_code").notNull().unique(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientPhone: text("recipient_phone").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'verified', 'expired'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  verifiedByUserId: integer("verified_by_user_id").references(() => users.id), // Staff member who verified
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPendingCreditTransferSchema = createInsertSchema(pendingCreditTransfers).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export type PendingCreditTransfer = typeof pendingCreditTransfers.$inferSelect;
export type InsertPendingCreditTransfer = z.infer<typeof insertPendingCreditTransferSchema>;

export type CartItemOption = {
  name: string; // e.g., "Flavor" or "Milk Alternative"
  value: string; // e.g., "Chocolate" or "Almond"
  priceAdjustmentCents: number; // Price adjustment in cents
};

// Square variation data structure
export type MenuItemVariation = {
  id: string; // Square variation ID
  name: string; // e.g., "Small", "Large", "16oz", "20oz", etc.
  price: number; // Actual price from Square in dollars
  squarePrice: number; // Original Square price in cents
  isDefault?: boolean; // Whether this is the default variation
};

export type CartItem = {
  menuItemId: string; // Now uses Square ID (string) instead of database ID (number)
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  // Updated variation system - more flexible than hardcoded sizes
  variationId?: string; // Square variation ID if using actual variations
  variationName?: string; // Display name of the variation (e.g., "Small", "16oz")
  // Legacy size field - deprecated but kept for backwards compatibility
  size?: 'small' | 'medium' | 'large';
  option?: string; // For backward compatibility
  options?: CartItemOption[]; // New field for multiple options
};

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

// Restaurant Orders table for Square integration
export const restaurantOrders = pgTable("restaurant_orders", {
  id: serial("id").primaryKey(),
  squareOrderId: varchar("square_order_id", { length: 255 }).unique(),
  userId: integer("user_id").references(() => users.id),
  customerName: varchar("customer_name", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("OPEN"), // OPEN, COMPLETED, CANCELED
  fulfillmentType: varchar("fulfillment_type", { length: 20 }).notNull(), // PICKUP, DELIVERY, DINE_IN
  totalAmount: doublePrecision("total_amount").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"), // Store Square-specific data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRestaurantOrderSchema = createInsertSchema(restaurantOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RestaurantOrder = typeof restaurantOrders.$inferSelect;
export type InsertRestaurantOrder = z.infer<typeof insertRestaurantOrderSchema>;

// Restaurant Order Items table
export const restaurantOrderItems = pgTable("restaurant_order_items", {
  id: serial("id").primaryKey(),
  restaurantOrderId: integer("restaurant_order_id").notNull().references(() => restaurantOrders.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  squareItemId: varchar("square_item_id", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
  modifiers: jsonb("modifiers"), // Store item modifiers
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRestaurantOrderItemSchema = createInsertSchema(restaurantOrderItems).omit({
  id: true,
  createdAt: true,
});

export type RestaurantOrderItem = typeof restaurantOrderItems.$inferSelect;
export type InsertRestaurantOrderItem = z.infer<typeof insertRestaurantOrderItemSchema>;

// Kitchen Display System table
export const kitchenOrders = pgTable("kitchen_orders", {
  id: serial("id").primaryKey(),
  restaurantOrderId: integer("restaurant_order_id").notNull().references(() => restaurantOrders.id),
  station: varchar("station", { length: 50 }).notNull().default("main"), // main, drinks, pastry, etc.
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, preparing, ready, completed
  priority: integer("priority").notNull().default(1), // 1=normal, 2=high, 3=urgent
  estimatedTime: integer("estimated_time_minutes"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertKitchenOrderSchema = createInsertSchema(kitchenOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KitchenOrder = typeof kitchenOrders.$inferSelect;
export type InsertKitchenOrder = z.infer<typeof insertKitchenOrderSchema>;

// Inventory Management table
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  squareItemId: varchar("square_item_id", { length: 255 }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  maxStock: integer("max_stock"),
  unit: varchar("unit", { length: 50 }).notNull().default("pieces"), // pieces, kg, liters, etc.
  costPerUnit: doublePrecision("cost_per_unit"),
  supplier: varchar("supplier", { length: 255 }),
  lastRestocked: timestamp("last_restocked"),
  lowStockAlert: boolean("low_stock_alert").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

// Staff Management table
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  employeeId: varchar("employee_id", { length: 50 }).unique(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // cashier, barista, kitchen, manager
  permissions: jsonb("permissions"), // Store role-specific permissions
  hourlyRate: doublePrecision("hourly_rate"),
  isActive: boolean("is_active").notNull().default(true),
  hiredAt: timestamp("hired_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

// Favorites table - now with auto-incrementing ID to allow multiple variants of same product
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id), // Nullable for Square items
  squareId: text("square_id"), // Square item ID for Square catalog items
  selectedSize: text("selected_size"), // Store the selected size (small, medium, large)
  selectedOptions: jsonb("selected_options"), // Store selected options as JSON
  customName: text("custom_name"), // Optional custom name for the favorite configuration
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

// Menu item options table (for flavors, milk alternatives, etc.)
export const menuItemOptions = pgTable("menu_item_options", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  name: text("name").notNull(), // e.g., "Chocolate", "Vanilla", "Milk Alternatives"
  optionType: text("option_type").default("flavor"), // e.g., "flavor", "milk", "size"
  displayOrder: integer("display_order").default(999),
  priceAdjustmentCents: integer("price_adjustment_cents").default(0), // Additional cost in cents
  isParent: boolean("is_parent").default(false), // True if this is a parent option (like "Milk Alternatives")
  parentId: integer("parent_id"), // References parent option if this is a sub-option
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMenuItemOptionSchema = createInsertSchema(menuItemOptions).omit({
  id: true,
  createdAt: true,
});

export type MenuItemOption = typeof menuItemOptions.$inferSelect;
export type InsertMenuItemOption = z.infer<typeof insertMenuItemOptionSchema>;

// Square Modifier Lists (e.g., "Size", "Milk Type", "Add-ons")
export const squareModifierLists = pgTable("square_modifier_lists", {
  id: serial("id").primaryKey(),
  squareId: text("square_id").notNull().unique(), // Square modifier list ID - UNIQUE constraint prevents duplicates
  name: text("name").notNull(), // e.g., "Size", "Milk Alternatives"
  selectionType: text("selection_type").notNull(), // 'SINGLE', 'MULTIPLE'
  minSelections: integer("min_selections").default(0),
  maxSelections: integer("max_selections"),
  enabled: boolean("enabled").default(true),
  displayOrder: integer("display_order").default(999),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Square Modifier Options (individual modifiers within a list)
export const squareModifiers = pgTable("square_modifiers", {
  id: serial("id").primaryKey(),
  squareId: text("square_id").notNull().unique(), // Square modifier ID - UNIQUE constraint prevents duplicates
  modifierListId: integer("modifier_list_id").notNull().references(() => squareModifierLists.id),
  squareModifierListId: text("square_modifier_list_id").notNull(), // Square modifier list ID for reference
  name: text("name").notNull(), // e.g., "Small", "Almond Milk", "Extra Shot"
  priceMoney: integer("price_money").default(0), // Price in cents - ALWAYS INTEGER
  enabled: boolean("enabled").default(true),
  displayOrder: integer("display_order").default(999),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Junction table - which modifier lists are applied to which menu items
export const menuItemModifierLists = pgTable("menu_item_modifier_lists", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id), // Optional - for internal items
  squareItemId: text("square_item_id"), // Required for Square items
  modifierListId: integer("modifier_list_id").references(() => squareModifierLists.id), // Optional - for internal lists
  squareModifierListId: text("square_modifier_list_id").notNull(), // Required - Square modifier list ID
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // UNIQUE constraint on squareItemId + squareModifierListId to prevent duplicates
  unq_item_modifier: uniqueIndex("unq_item_modifier_list").on(table.squareItemId, table.squareModifierListId),
}));

export const insertSquareModifierListSchema = createInsertSchema(squareModifierLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSquareModifierSchema = createInsertSchema(squareModifiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuItemModifierListSchema = createInsertSchema(menuItemModifierLists).omit({
  id: true,
  createdAt: true,
});

export type SquareModifierList = typeof squareModifierLists.$inferSelect;
export type InsertSquareModifierList = z.infer<typeof insertSquareModifierListSchema>;

export type SquareModifier = typeof squareModifiers.$inferSelect;
export type InsertSquareModifier = z.infer<typeof insertSquareModifierSchema>;

export type MenuItemModifierList = typeof menuItemModifierLists.$inferSelect;
export type InsertMenuItemModifierList = z.infer<typeof insertMenuItemModifierListSchema>;

// Image Upload Validation Schema
export const imageUploadSchema = z.object({
  imageUrl: z.string()
    .refine((url) => {
      // Allow empty string to remove image
      if (url === '') return true;
      // Allow only uploads from our uploads directory or approved CDN URLs
      return url.startsWith('/uploads/') || url.startsWith('https://cdn.') || url.startsWith('https://images.');
    }, {
      message: "Image URL must be from /uploads/ directory or approved CDN"
    })
    .refine((url) => {
      // Validate file extension for security
      if (url === '') return true;
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
      return validExtensions.some(ext => url.toLowerCase().endsWith(ext));
    }, {
      message: "Image must be png, jpg, jpeg, or webp format"
    })
    .refine((url) => {
      // Prevent path traversal attacks
      if (url === '') return true;
      return !url.includes('../') && !url.includes('..\\');
    }, {
      message: "Invalid file path detected"
    })
});

export type ImageUpload = z.infer<typeof imageUploadSchema>;

// Define relations
export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  options: many(menuItemOptions),
}));

export const menuItemOptionsRelations = relations(menuItemOptions, ({ one, many }) => ({
  menuItem: one(menuItems, {
    fields: [menuItemOptions.menuItemId],
    references: [menuItems.id],
  }),
  parent: one(menuItemOptions, {
    fields: [menuItemOptions.parentId],
    references: [menuItemOptions.id],
  }),
  children: many(menuItemOptions),
}));
