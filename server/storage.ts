import { randomBytes } from 'crypto';
import { 
  users, 
  menuItems, 
  menuCategories,
  orders, 
  pushSubscriptions, 
  creditTransactions,
  favorites,
  menuItemOptions,
  pendingCreditTransfers,
  type User, 
  type InsertUser, 
  type MenuItem, 
  type InsertMenuItem,
  type MenuCategory,
  type InsertMenuCategory,
  type Order, 
  type InsertOrder, 
  type PushSubscription, 
  type InsertPushSubscription,
  type CreditTransaction,
  type InsertCreditTransaction,
  type Favorite,
  type InsertFavorite,
  type MenuItemOption,
  type InsertMenuItemOption,
  type PendingCreditTransfer,
  type InsertPendingCreditTransfer
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { eq, desc, sql, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByQrCode(qrCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, userData: Partial<User>): Promise<User>;
  updateUserCredits(userId: number, amount: number): Promise<User>;
  updateUserQrCode(userId: number, qrCode: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getAdminUsers(): Promise<User[]>;
  setUserAdmin(userId: number, isAdmin: boolean): Promise<User>;
  setUserActive(userId: number, isActive: boolean): Promise<User>;
  setUserMembership(userId: number, isMember: boolean): Promise<User>;
  clearAllUsers(exceptUserIds: number[]): Promise<void>;
  clearAllOrders(): Promise<void>;
  createPasswordResetToken(email: string): Promise<string | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: number, newPassword: string): Promise<User>;
  
  // Menu operations
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByCategory(category: string): Promise<MenuItem[]>;
  getMenuCategories(): Promise<string[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  
  // Menu Item Options operations (for flavors)
  getMenuItemOptions(menuItemId: number): Promise<MenuItemOption[]>;
  createMenuItemOption(option: InsertMenuItemOption): Promise<MenuItemOption>;
  updateMenuItemOption(id: number, option: Partial<InsertMenuItemOption>): Promise<MenuItemOption>;
  deleteMenuItemOption(id: number): Promise<void>;
  
  // Menu Category operations
  getAllCategories(): Promise<MenuCategory[]>;
  getCategoryByName(name: string): Promise<MenuCategory | undefined>;
  createCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateCategory(id: number, category: Partial<InsertMenuCategory>): Promise<MenuCategory>;
  deleteCategory(id: number): Promise<void>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByUserId(userId: number): Promise<Order[]>;
  getOrderById(orderId: number): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getAllOrdersWithUserDetails(): Promise<(Order & { userName: string, userFullName: string | null })[]>;
  getRecentOrders(limit?: number): Promise<(Order & { username: string })[]>;
  updateOrderStatus(orderId: number, status: string): Promise<Order>;
  
  // Credit transaction operations
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactionsByUserId(userId: number): Promise<CreditTransaction[]>;
  getCreditTransactionByTransactionId(transactionId: string): Promise<CreditTransaction | undefined>;
  
  // Pending credit transfer operations
  createPendingCreditTransfer(transfer: InsertPendingCreditTransfer): Promise<PendingCreditTransfer>;
  getPendingCreditTransferByCode(verificationCode: string): Promise<PendingCreditTransfer | undefined>;
  verifyPendingCreditTransfer(transferId: number, verifiedByUserId: number): Promise<PendingCreditTransfer>;
  getPendingCreditTransfersBySender(senderId: number): Promise<PendingCreditTransfer[]>;
  getAllPendingCreditTransfers(): Promise<PendingCreditTransfer[]>;
  getAllCreditTransfers(): Promise<PendingCreditTransfer[]>;
  expirePendingCreditTransfers(): Promise<void>;
  
  // Push notification operations
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  
  // Favorites operations
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, menuItemId: number): Promise<void>;
  getUserFavorites(userId: number): Promise<Favorite[]>;
  getUserFavoritesWithDetails(userId: number): Promise<MenuItem[]>;
  isFavorite(userId: number, menuItemId: number): Promise<boolean>;
  getFavoriteWithOptions(userId: number, menuItemId: number): Promise<Favorite | undefined>;
  
  // Session store
  sessionStore: session.Store;
  
  // Database initialization
  initializeDatabase(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private menuItems: Map<number, MenuItem>;
  private menuCategories: Map<number, MenuCategory>;
  private menuItemOptions: Map<number, MenuItemOption>; // Added menu item options map
  private orders: Map<number, Order>;
  private creditTransactions: Map<number, CreditTransaction>;
  private pendingCreditTransfers: Map<number, PendingCreditTransfer>;
  private favorites: Map<string, Favorite>; // Store favorites with a composite key: `${userId}-${menuItemId}`
  sessionStore: session.Store;
  currentUserId: number;
  currentMenuItemId: number;
  currentCategoryId: number;
  currentOrderId: number;
  currentTransactionId: number;
  currentPendingTransferId: number;
  currentMenuItemOptionId: number; // Added counter for option IDs

  constructor() {
    this.users = new Map();
    this.menuItems = new Map();
    this.menuCategories = new Map();
    this.menuItemOptions = new Map();
    this.orders = new Map();
    this.creditTransactions = new Map();
    this.pendingCreditTransfers = new Map();
    this.favorites = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    this.currentUserId = 1;
    this.currentMenuItemId = 1;
    this.currentCategoryId = 1;
    this.currentOrderId = 1;
    this.currentTransactionId = 1;
    this.currentPendingTransferId = 1;
    this.currentMenuItemOptionId = 1;
    
    // Initialize categories first, then menu items
    this.initializeCategories();
    this.initializeMenu();
  }
  
  // Add implementation for the new interface method
  async initializeDatabase(): Promise<void> {
    // For MemStorage, this is a no-op since initialization happens in constructor
    return Promise.resolve();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByQrCode(qrCode: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.qrCode === qrCode,
    );
  }
  
  async createPasswordResetToken(email: string): Promise<string | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return undefined;
    }
    
    // Generate a random token
    const token = randomBytes(32).toString('hex');
    
    // Set token expiration to 1 hour from now
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    
    // Update user with the reset token
    const updatedUser = { 
      ...user, 
      resetToken: token, 
      resetTokenExpiry: expiry 
    };
    this.users.set(user.id, updatedUser);
    
    return token;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const now = new Date();
    return Array.from(this.users.values()).find(
      (user) => 
        user.resetToken === token && 
        user.resetTokenExpiry && 
        user.resetTokenExpiry > now
    );
  }
  
  async resetPassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Update user with new password and remove reset token
    const updatedUser = { 
      ...user, 
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null
    };
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      credits: insertUser.credits || 69, // Use provided credits or default to $69 for premium membership
      fullName: insertUser.fullName || '',
      phoneNumber: insertUser.phoneNumber || '',
      isAdmin: insertUser.isAdmin || false,
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true, // Default to active if not specified
      isMember: insertUser.isMember || false,
      membershipDate: insertUser.membershipDate || null,
      email: insertUser.email || null,
      qrCode: null, // QR code will be generated later
      resetToken: null,
      resetTokenExpiry: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getAdminUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isAdmin === true);
  }
  
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getRecentOrders(limit: number = 50): Promise<(Order & { username: string })[]> {
    const allOrders = Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    
    const ordersWithUsernames = [];
    
    for (const order of allOrders) {
      const user = await this.getUser(order.userId);
      ordersWithUsernames.push({
        ...order,
        username: user ? user.username : 'Unknown User'
      });
    }
    
    return ordersWithUsernames;
  }
  
  async getAllOrdersWithUserDetails(): Promise<(Order & { userName: string, userFullName: string | null })[]> {
    const allOrders = Array.from(this.orders.values());
    const ordersWithUserDetails = allOrders.map(order => {
      const user = this.users.get(order.userId);
      return {
        ...order,
        userName: user ? user.username : 'Unknown User',
        userFullName: user ? user.fullName : null
      };
    });
    return ordersWithUserDetails;
  }
  
  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    
    const updatedOrder = { ...order, status };
    this.orders.set(orderId, updatedOrder);
    return updatedOrder;
  }
  
  async setUserAdmin(userId: number, isAdmin: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, isAdmin };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async setUserActive(userId: number, isActive: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, isActive };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async setUserMembership(userId: number, isMember: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { 
      ...user, 
      isMember, 
      membershipDate: isMember ? new Date() : null 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async clearAllUsers(exceptUserIds: number[]): Promise<void> {
    // Create a new map with only the excepted users
    const preservedUsers = new Map<number, User>();
    
    for (const userId of exceptUserIds) {
      const user = this.users.get(userId);
      if (user) {
        preservedUsers.set(userId, user);
      }
    }
    
    // Replace the users map with only the preserved users
    this.users = preservedUsers;
    return Promise.resolve();
  }
  
  async clearAllOrders(): Promise<void> {
    // Clear all orders by creating a new empty map
    this.orders = new Map<number, Order>();
    return Promise.resolve();
  }
  
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Don't allow updating certain fields like id or credits
    const { id, credits, password, isAdmin, qrCode, ...allowedUpdates } = userData;
    
    const updatedUser = { ...user, ...allowedUpdates };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserCredits(userId: number, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = { ...user, credits: amount };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserQrCode(userId: number, qrCode: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = { ...user, qrCode };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(
      item => item.category === category
    );
  }

  async getMenuCategories(): Promise<string[]> {
    // Get categories from the categories map instead of extracting from menu items
    const allCategories = await this.getAllCategories();
    
    // Map to get just the category names (which is used as the internal key in menuItems)
    return allCategories.map(category => category.name);
  }
  
  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const id = this.currentMenuItemId++;
    const newMenuItem: MenuItem = {
      ...menuItem,
      id
    };
    this.menuItems.set(id, newMenuItem);
    return newMenuItem;
  }
  
  async updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem> {
    const existingMenuItem = this.menuItems.get(id);
    if (!existingMenuItem) {
      throw new Error("Menu item not found");
    }
    
    const updatedMenuItem: MenuItem = {
      ...existingMenuItem,
      ...menuItem
    };
    this.menuItems.set(id, updatedMenuItem);
    return updatedMenuItem;
  }
  
  async deleteMenuItem(id: number): Promise<void> {
    if (!this.menuItems.has(id)) {
      throw new Error("Menu item not found");
    }
    this.menuItems.delete(id);
  }
  
  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      ...insertOrder,
      id,
      createdAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrderById(orderId: number): Promise<Order | undefined> {
    return this.orders.get(orderId);
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      order => order.userId === userId
    );
  }
  
  // Menu Item Options methods
  async getMenuItemOptions(menuItemId: number): Promise<MenuItemOption[]> {
    return Array.from(this.menuItemOptions.values()).filter(
      option => option.menuItemId === menuItemId
    );
  }

  async createMenuItemOption(option: InsertMenuItemOption): Promise<MenuItemOption> {
    const id = this.currentMenuItemOptionId++;
    const newOption: MenuItemOption = {
      ...option,
      id,
      createdAt: new Date()
    };
    this.menuItemOptions.set(id, newOption);
    
    // Update the hasOptions flag on the corresponding menu item
    const menuItem = await this.getMenuItem(option.menuItemId);
    if (menuItem) {
      await this.updateMenuItem(menuItem.id, { hasOptions: true });
    }
    
    return newOption;
  }

  async updateMenuItemOption(id: number, optionData: Partial<InsertMenuItemOption>): Promise<MenuItemOption> {
    const existingOption = this.menuItemOptions.get(id);
    if (!existingOption) {
      throw new Error("Menu item option not found");
    }
    
    const updatedOption: MenuItemOption = {
      ...existingOption,
      ...optionData
    };
    this.menuItemOptions.set(id, updatedOption);
    return updatedOption;
  }

  async deleteMenuItemOption(id: number): Promise<void> {
    const option = this.menuItemOptions.get(id);
    if (!option) {
      throw new Error("Menu item option not found");
    }
    
    this.menuItemOptions.delete(id);
    
    // Check if this was the last option for this menu item, and if so, update hasOptions flag
    const remainingOptions = await this.getMenuItemOptions(option.menuItemId);
    if (remainingOptions.length === 0) {
      const menuItem = await this.getMenuItem(option.menuItemId);
      if (menuItem) {
        await this.updateMenuItem(menuItem.id, { hasOptions: false });
      }
    }
  }

  // Push subscription methods
  private pushSubscriptions: Map<string, PushSubscription> = new Map();
  
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const id = Math.floor(Math.random() * 10000); // Simple ID generation for memory storage
    const newSubscription: PushSubscription = {
      ...subscription,
      id,
      createdAt: new Date()
    };
    
    this.pushSubscriptions.set(subscription.endpoint, newSubscription);
    return newSubscription;
  }
  
  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values()).filter(sub => sub.userId === userId);
  }
  
  async deletePushSubscription(endpoint: string): Promise<void> {
    this.pushSubscriptions.delete(endpoint);
  }
  
  // Credit transaction methods
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const id = this.currentTransactionId++;
    const newTransaction: CreditTransaction = {
      ...transaction,
      id,
      createdAt: new Date()
    };
    this.creditTransactions.set(id, newTransaction);
    return newTransaction;
  }
  
  async getCreditTransactionsByUserId(userId: number): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent first
  }

  async getCreditTransactionByTransactionId(transactionId: string): Promise<CreditTransaction | undefined> {
    return Array.from(this.creditTransactions.values())
      .find(transaction => transaction.transactionId === transactionId);
  }

  // Pending Credit Transfer methods
  async createPendingCreditTransfer(transfer: InsertPendingCreditTransfer): Promise<PendingCreditTransfer> {
    const id = this.currentPendingTransferId++;
    const newTransfer: PendingCreditTransfer = {
      ...transfer,
      id,
      createdAt: new Date(),
      verifiedAt: null,
      verifiedByUserId: null
    };
    this.pendingCreditTransfers.set(id, newTransfer);
    return newTransfer;
  }

  async getPendingCreditTransferByCode(verificationCode: string): Promise<PendingCreditTransfer | undefined> {
    return Array.from(this.pendingCreditTransfers.values())
      .find(transfer => transfer.verificationCode === verificationCode);
  }

  async verifyPendingCreditTransfer(transferId: number, verifiedByUserId: number): Promise<PendingCreditTransfer> {
    const transfer = this.pendingCreditTransfers.get(transferId);
    if (!transfer) {
      throw new Error("Pending credit transfer not found");
    }

    const updatedTransfer: PendingCreditTransfer = {
      ...transfer,
      status: "verified",
      verifiedAt: new Date(),
      verifiedByUserId
    };
    
    this.pendingCreditTransfers.set(transferId, updatedTransfer);
    return updatedTransfer;
  }

  async getPendingCreditTransfersBySender(senderId: number): Promise<PendingCreditTransfer[]> {
    return Array.from(this.pendingCreditTransfers.values())
      .filter(transfer => transfer.senderId === senderId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllPendingCreditTransfers(): Promise<PendingCreditTransfer[]> {
    return Array.from(this.pendingCreditTransfers.values())
      .filter(transfer => transfer.status === "pending")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllCreditTransfers(): Promise<PendingCreditTransfer[]> {
    return Array.from(this.pendingCreditTransfers.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async expirePendingCreditTransfers(): Promise<void> {
    const now = new Date();
    Array.from(this.pendingCreditTransfers.entries()).forEach(([id, transfer]) => {
      if (transfer.status === "pending" && new Date(transfer.expiresAt) <= now) {
        const expiredTransfer: PendingCreditTransfer = {
          ...transfer,
          status: "expired"
        };
        this.pendingCreditTransfers.set(id, expiredTransfer);
      }
    });
  }
  
  // Favorites methods
  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    // Create a composite key for the map
    const key = `${favorite.userId}-${favorite.menuItemId}`;
    
    const newFavorite: Favorite = {
      ...favorite,
      createdAt: new Date()
    };
    
    this.favorites.set(key, newFavorite);
    return newFavorite;
  }
  
  async removeFavorite(userId: number, menuItemId: number): Promise<void> {
    const key = `${userId}-${menuItemId}`;
    this.favorites.delete(key);
  }
  
  async getUserFavorites(userId: number): Promise<MenuItem[]> {
    // Find all favorites for the user
    const userFavorites = Array.from(this.favorites.values())
      .filter(favorite => favorite.userId === userId);
    
    // Get the corresponding menu items
    const favoriteMenuItems: MenuItem[] = [];
    for (const favorite of userFavorites) {
      const menuItem = this.menuItems.get(favorite.menuItemId);
      if (menuItem) {
        favoriteMenuItems.push(menuItem);
      }
    }
    
    return favoriteMenuItems;
  }
  
  async isFavorite(userId: number, menuItemId: number): Promise<boolean> {
    const key = `${userId}-${menuItemId}`;
    return this.favorites.has(key);
  }

  // Menu Category methods
  async getAllCategories(): Promise<MenuCategory[]> {
    return Array.from(this.menuCategories.values());
  }

  async getCategoryByName(name: string): Promise<MenuCategory | undefined> {
    return Array.from(this.menuCategories.values()).find(
      (category) => category.name === name
    );
  }

  async createCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    const id = this.currentCategoryId++;
    const newCategory: MenuCategory = {
      ...category,
      id,
      createdAt: new Date()
    };
    this.menuCategories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, categoryData: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    const existingCategory = this.menuCategories.get(id);
    if (!existingCategory) {
      throw new Error("Category not found");
    }
    
    const updatedCategory: MenuCategory = {
      ...existingCategory,
      ...categoryData
    };
    this.menuCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    if (!this.menuCategories.has(id)) {
      throw new Error("Category not found");
    }
    this.menuCategories.delete(id);
  }

  private initializeCategories() {
    // Add categories with proper display names
    this.addCategory("breakfast", "Breakfast", "Morning favorites to start your day", 10);
    this.addCategory("lunch", "Lunch", "Satisfying midday meals", 20);
    this.addCategory("coffee", "Coffee", "Premium coffee beverages", 30);
    this.addCategory("hot-drinks", "Hot Drinks", "Warm beverages for any occasion", 40);
    this.addCategory("iced-drinks", "Iced Drinks", "Refreshing cold beverages", 50);
    this.addCategory("juices", "Juices", "Fresh-squeezed and blended juices", 60);
    this.addCategory("smoothies", "Smoothies", "Fruit and yogurt smoothies", 70);
  }

  private addCategory(
    name: string,
    displayName: string,
    description: string,
    displayOrder: number = 999
  ) {
    const id = this.currentCategoryId++;
    const category: MenuCategory = {
      id,
      name,
      displayName,
      description,
      displayOrder,
      createdAt: new Date()
    };
    this.menuCategories.set(id, category);
  }

  private initializeMenu() {
    // Add breakfast items - using actual available images or null for fallback
    this.addMenuItem("Egg & Bacon Panini", "Scrambled eggs with crispy bacon on toasted panini bread.", 13.50, "breakfast", "/breakfast-coffee.png");
    this.addMenuItem("Avocado Toast", "Smashed avocado on sourdough with feta, cherry tomatoes and microgreens.", 12.00, "breakfast", "/breakfast-coffee.png");
    this.addMenuItem("Breakfast Bowl", "Greek yogurt with granola, seasonal fruits, honey and chia seeds.", 10.50, "breakfast", "/breakfast-coffee.png");
    
    // Add lunch items - using actual available images or null for fallback
    this.addMenuItem("Chicken Salad", "Grilled chicken with mixed greens, cherry tomatoes, cucumber and balsamic dressing.", 14.50, "lunch", "/coffee-icon.png");
    this.addMenuItem("Turkey & Swiss Sandwich", "Sliced turkey, Swiss cheese, lettuce, tomato and mayo on multigrain bread.", 13.00, "lunch", "/coffee-icon.png");
    this.addMenuItem("Vegetable Soup", "Hearty vegetable soup with seasonal vegetables and herbs, served with bread.", 9.50, "lunch", "/coffee-icon.png");
    
    // Add coffee items - using actual available images
    this.addMenuItem("Cappuccino", "Espresso with steamed milk and a thick layer of foam.", 4.50, "coffee", "/coffee-icon.png");
    this.addMenuItem("Flat White", "Espresso with steamed milk and a thin layer of microfoam.", 4.50, "coffee", "/coffee-icon.png");
    this.addMenuItem("Espresso", "Concentrated coffee served in a small cup.", 3.50, "coffee", "/coffee-icon.png");
    
    // Add hot drinks - using actual available images
    this.addMenuItem("Hot Chocolate", "Rich chocolate with steamed milk topped with whipped cream.", 4.50, "hot-drinks", "/coffee-icon.png");
    this.addMenuItem("Green Tea", "Traditional Japanese green tea.", 3.50, "hot-drinks", "/coffee-icon-small.png");
    
    // Add iced drinks - using actual available images
    this.addMenuItem("Iced Coffee", "Cold brew coffee served over ice.", 4.00, "iced-drinks", "/coffee-icon.png");
    this.addMenuItem("Iced Tea", "Fresh brewed tea served over ice.", 3.50, "iced-drinks", "/coffee-icon-small.png");
    
    // Add juices - using actual available images
    this.addMenuItem("Orange Juice", "Freshly squeezed orange juice.", 4.50, "juices", "/breakfast-coffee.png");
    this.addMenuItem("Green Juice", "Spinach, kale, cucumber, apple and ginger.", 5.50, "juices", "/breakfast-coffee.png");
    
    // Add smoothies - using actual available images
    this.addMenuItem("Berry Blast", "Mixed berries, banana, yogurt and honey.", 6.00, "smoothies", "/breakfast-coffee.png");
    this.addMenuItem("Tropical Paradise", "Mango, pineapple, coconut milk and banana.", 6.00, "smoothies", "/breakfast-coffee.png");
  }

  private addMenuItem(
    name: string, 
    description: string, 
    price: number, 
    category: string, 
    imageUrl: string | null = null
  ) {
    const id = this.currentMenuItemId++;
    const menuItem: MenuItem = {
      id,
      name,
      description,
      price,
      category,
      imageUrl,
      hasSizes: null,
      mediumPrice: null,
      largePrice: null,
      hasOptions: false  // Initialize with no options
    };
    this.menuItems.set(id, menuItem);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private _db: ReturnType<typeof drizzle> | null = null;
  
  constructor() {
    try {
      // Create a postgres client for Drizzle ORM
      const connectionString = process.env.DATABASE_URL!;
      const sql = postgres(connectionString, { ssl: 'require' });
      this._db = drizzle(sql, { 
        schema: { 
          users, 
          menuItems,
          menuCategories,
          orders, 
          pushSubscriptions,
          creditTransactions,
          pendingCreditTransfers,
          favorites,
          menuItemOptions
        } 
      });
      
      // Use memory store for sessions - it's simpler and works reliably
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // 24 hours - clean up expired sessions
      });
    } catch (error) {
      console.error("Failed to initialize database connection:", error);
      throw error; // Rethrow to ensure app exits if DB connection fails
    }
  }
  
  // Getter for the database connection
  private get db(): ReturnType<typeof drizzle> {
    if (!this._db) {
      throw new Error("Database connection not initialized");
    }
    return this._db;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }
  
  async getUserByQrCode(qrCode: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.qrCode, qrCode));
    return result[0];
  }
  
  async createPasswordResetToken(email: string): Promise<string | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return undefined;
    }
    
    // Generate a random token
    const token = randomBytes(32).toString('hex');
    
    // Set token expiration to 1 hour from now
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    
    // Update user with the reset token
    await this.db.update(users)
      .set({ 
        resetToken: token, 
        resetTokenExpiry: expiry 
      })
      .where(eq(users.id, user.id));
    
    return token;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const now = new Date();
    
    const result = await this.db
      .select()
      .from(users)
      .where(
        eq(users.resetToken, token)
      );
    
    // Check if token is valid and not expired
    const user = result[0];
    if (user && user.resetTokenExpiry && user.resetTokenExpiry > now) {
      return user;
    }
    
    return undefined;
  }
  
  async resetPassword(userId: number, newPassword: string): Promise<User> {
    const result = await this.db.update(users)
      .set({
        password: newPassword,
        resetToken: null,
        resetTokenExpiry: null
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Set default values if not provided
    const userWithDefaults = {
      credits: 69, // Default starting credits for premium membership
      isAdmin: false, // Default non-admin
      ...insertUser, // User-provided values override defaults
    };
    
    const result = await this.db.insert(users).values(userWithDefaults).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    try {
      console.log("DatabaseStorage: Fetching all users from database");
      const allUsers = await this.db.select().from(users);
      console.log(`DatabaseStorage: Found ${allUsers.length} users`);
      return allUsers;
    } catch (error) {
      console.error("DatabaseStorage: Error fetching all users:", error);
      throw error;
    }
  }
  
  async getAdminUsers(): Promise<User[]> {
    try {
      console.log("DatabaseStorage: Fetching admin users from database");
      const adminUsers = await this.db.select().from(users).where(eq(users.isAdmin, true));
      console.log(`DatabaseStorage: Found ${adminUsers.length} admin users`);
      return adminUsers;
    } catch (error) {
      console.error("DatabaseStorage: Error fetching admin users:", error);
      throw error;
    }
  }

  async getAllOrders(): Promise<Order[]> {
    return this.db.select().from(orders);
  }
  
  async getAllOrdersWithUserDetails(): Promise<(Order & { userName: string, userFullName: string | null })[]> {
    const allOrders = await this.db.select().from(orders);
    const ordersWithUserDetails = [];
    
    for (const order of allOrders) {
      const user = await this.getUser(order.userId);
      ordersWithUserDetails.push({
        ...order,
        userName: user ? user.username : 'Unknown User',
        userFullName: user ? user.fullName : null
      });
    }
    
    return ordersWithUserDetails;
  }

  async getRecentOrders(limit: number = 50): Promise<(Order & { username: string })[]> {
    const recentOrders = await this.db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);
    
    const ordersWithUsernames = [];
    
    for (const order of recentOrders) {
      const user = await this.getUser(order.userId);
      ordersWithUsernames.push({
        ...order,
        username: user ? user.username : 'Unknown User'
      });
    }
    
    return ordersWithUsernames;
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const result = await this.db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, orderId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Order not found");
    }
    
    return result[0];
  }

  async setUserAdmin(userId: number, isAdmin: boolean): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }
  
  async setUserActive(userId: number, isActive: boolean): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }

  async setUserMembership(userId: number, isMember: boolean): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ 
        isMember, 
        membershipDate: isMember ? new Date() : null 
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }
  
  async clearAllUsers(exceptUserIds: number[]): Promise<void> {
    try {
      // First, delete all orders belonging to users we will delete
      // This handles the foreign key constraint
      await this.db
        .delete(orders)
        .where(
          sql`${orders.userId} NOT IN (${exceptUserIds.join(',')})`
        );

      // Also delete any push subscriptions from these users
      await this.db
        .delete(pushSubscriptions)
        .where(
          sql`${pushSubscriptions.userId} NOT IN (${exceptUserIds.join(',')})`
        );
      
      // Also delete any credit transactions for these users
      await this.db
        .delete(creditTransactions)
        .where(
          sql`${creditTransactions.userId} NOT IN (${exceptUserIds.join(',')})`
        );
        
      // Also delete any favorites for these users
      await this.db
        .delete(favorites)
        .where(
          sql`${favorites.userId} NOT IN (${exceptUserIds.join(',')})`
        );
        
      // Now delete the users
      await this.db
        .delete(users)
        .where(
          sql`${users.id} NOT IN (${exceptUserIds.join(',')})`
        );
        
      console.log(`Successfully cleared users except for IDs: ${exceptUserIds.join(',')}`);
      return Promise.resolve();
    } catch (error) {
      console.error("Error in clearAllUsers:", error);
      throw error;
    }
  }
  
  async clearAllOrders(): Promise<void> {
    try {
      // Delete all orders
      await this.db.delete(orders);
      console.log("Successfully cleared all orders");
      return Promise.resolve();
    } catch (error) {
      console.error("Error in clearAllOrders:", error);
      throw error;
    }
  }
  
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    // Don't allow updating sensitive fields
    const { id, credits, password, isAdmin, qrCode, ...allowedUpdates } = userData;
    
    const result = await this.db
      .update(users)
      .set(allowedUpdates)
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }

  async updateUserCredits(userId: number, amount: number): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ credits: amount })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }
  
  async updateUserQrCode(userId: number, qrCode: string): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ qrCode })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }

  async getMenuItems(): Promise<MenuItem[]> {
    try {
      console.log("DatabaseStorage: Fetching menu items from database");
      const items = await this.db.select().from(menuItems);
      console.log(`DatabaseStorage: Found ${items.length} menu items`);
      return items;
    } catch (error) {
      console.error("DatabaseStorage: Error fetching menu items:", error);
      throw error;
    }
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return this.db.select().from(menuItems).where(eq(menuItems.category, category));
  }

  async getMenuCategories(): Promise<string[]> {
    // Get categories from the categories table instead of extracting from menu items
    const allCategories = await this.getAllCategories();
    
    // Map to get just the category names (which is used as the internal key in menuItems)
    return allCategories.map(category => category.name);
  }
  
  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const result = await this.db.insert(menuItems).values(menuItem).returning();
    return result[0];
  }
  
  async updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem> {
    const result = await this.db
      .update(menuItems)
      .set(menuItem)
      .where(eq(menuItems.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Menu item not found");
    }
    
    return result[0];
  }
  
  async deleteMenuItem(id: number): Promise<void> {
    // First check if menu item exists
    const item = await this.getMenuItem(id);
    if (!item) {
      throw new Error("Menu item not found");
    }
    
    try {
      // First, delete any favorites referencing this menu item
      await this.db
        .delete(favorites)
        .where(eq(favorites.menuItemId, id));
      
      // Then delete the menu item
      await this.db
        .delete(menuItems)
        .where(eq(menuItems.id, id));
        
      console.log(`Successfully deleted menu item with ID: ${id}`);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      throw new Error("Failed to delete menu item");
    }
  }
  
  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const result = await this.db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));
      
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await this.db.insert(orders).values(insertOrder).returning();
    return result[0];
  }

  async getOrderById(orderId: number): Promise<Order | undefined> {
    const result = await this.db.select().from(orders).where(eq(orders.id, orderId));
    return result[0];
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return this.db.select().from(orders).where(eq(orders.userId, userId));
  }
  
  // Push notification subscription methods
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const result = await this.db.insert(pushSubscriptions).values(subscription).returning();
    return result[0];
  }
  
  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    return this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }
  
  async deletePushSubscription(endpoint: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }
  
  // Credit transaction methods
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    try {
      const result = await this.db.insert(creditTransactions).values(transaction).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating credit transaction:", error);
      throw error;
    }
  }
  
  async getCreditTransactionsByUserId(userId: number): Promise<CreditTransaction[]> {
    try {
      return this.db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt)); // Sort by most recent first
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      throw error;
    }
  }

  async getCreditTransactionByTransactionId(transactionId: string): Promise<CreditTransaction | undefined> {
    try {
      const result = await this.db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.transactionId, transactionId))
        .limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error("Error fetching credit transaction by transaction ID:", error);
      throw error;
    }
  }
  
  // Favorites methods
  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    try {
      const result = await this.db.insert(favorites).values(favorite).returning();
      return result[0];
    } catch (error) {
      console.error("Error adding favorite:", error);
      throw error;
    }
  }
  
  async removeFavorite(userId: number, menuItemId: number): Promise<void> {
    try {
      await this.db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.menuItemId, menuItemId)
          )
        );
    } catch (error) {
      console.error("Error removing favorite:", error);
      throw error;
    }
  }

  async removeFavoriteById(favoriteId: number): Promise<void> {
    try {
      await this.db
        .delete(favorites)
        .where(eq(favorites.id, favoriteId));
    } catch (error) {
      console.error("Error removing favorite by ID:", error);
      throw error;
    }
  }
  
  async getUserFavorites(userId: number): Promise<MenuItem[]> {
    try {
      // Join favorites with menu items to get the full menu item details
      return this.db
        .select({
          id: menuItems.id,
          name: menuItems.name,
          description: menuItems.description,
          price: menuItems.price,
          category: menuItems.category,
          imageUrl: menuItems.imageUrl,
          hasSizes: menuItems.hasSizes,
          mediumPrice: menuItems.mediumPrice,
          largePrice: menuItems.largePrice,
          hasOptions: menuItems.hasOptions
        })
        .from(favorites)
        .innerJoin(menuItems, eq(favorites.menuItemId, menuItems.id))
        .where(eq(favorites.userId, userId));
    } catch (error) {
      console.error("Error getting user favorites:", error);
      throw error;
    }
  }

  async getUserFavoritesWithDetails(userId: number): Promise<(MenuItem & { favoriteId: number; selectedSize?: string; selectedOptions?: any[]; customName?: string })[]> {
    try {
      // Join favorites with menu items and include the stored configuration
      const results = await this.db
        .select({
          id: menuItems.id,
          name: menuItems.name,
          description: menuItems.description,
          price: menuItems.price,
          category: menuItems.category,
          imageUrl: menuItems.imageUrl,
          hasSizes: menuItems.hasSizes,
          mediumPrice: menuItems.mediumPrice,
          largePrice: menuItems.largePrice,
          hasOptions: menuItems.hasOptions,
          favoriteId: favorites.id,
          selectedSize: favorites.selectedSize,
          selectedOptions: favorites.selectedOptions,
          customName: favorites.customName
        })
        .from(favorites)
        .innerJoin(menuItems, eq(favorites.menuItemId, menuItems.id))
        .where(eq(favorites.userId, userId));
      
      // selectedOptions is already parsed by Drizzle (jsonb type), no need to JSON.parse
      return results;
    } catch (error) {
      console.error("Error getting user favorites with details:", error);
      throw error;
    }
  }
  
  async isFavorite(userId: number, menuItemId: number): Promise<boolean> {
    try {
      const result = await this.db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.menuItemId, menuItemId)
          )
        );
      
      return result.length > 0;
    } catch (error) {
      console.error("Error checking if item is favorite:", error);
      throw error;
    }
  }

  // Menu Item Options methods
  async getMenuItemOptions(menuItemId: number): Promise<MenuItemOption[]> {
    try {
      return this.db
        .select()
        .from(menuItemOptions)
        .where(eq(menuItemOptions.menuItemId, menuItemId))
        .orderBy(menuItemOptions.displayOrder);
    } catch (error) {
      console.error("Error getting menu item options:", error);
      throw error;
    }
  }

  async createMenuItemOption(option: InsertMenuItemOption): Promise<MenuItemOption> {
    try {
      // Create the option
      const result = await this.db
        .insert(menuItemOptions)
        .values(option)
        .returning();
      
      // Update the hasOptions flag on the corresponding menu item
      await this.db
        .update(menuItems)
        .set({ hasOptions: true })
        .where(eq(menuItems.id, option.menuItemId));
      
      return result[0];
    } catch (error) {
      console.error("Error creating menu item option:", error);
      throw error;
    }
  }

  async updateMenuItemOption(id: number, optionData: Partial<InsertMenuItemOption>): Promise<MenuItemOption> {
    try {
      const result = await this.db
        .update(menuItemOptions)
        .set(optionData)
        .where(eq(menuItemOptions.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error("Menu item option not found");
      }
      
      return result[0];
    } catch (error) {
      console.error("Error updating menu item option:", error);
      throw error;
    }
  }

  async deleteMenuItemOption(id: number): Promise<void> {
    try {
      // First, get the option to find its menuItemId
      const option = await this.db
        .select()
        .from(menuItemOptions)
        .where(eq(menuItemOptions.id, id));
      
      if (option.length === 0) {
        throw new Error("Menu item option not found");
      }
      
      const menuItemId = option[0].menuItemId;
      
      // Delete the option
      await this.db
        .delete(menuItemOptions)
        .where(eq(menuItemOptions.id, id));
      
      // Check if this was the last option for this menu item
      const remainingOptions = await this.db
        .select()
        .from(menuItemOptions)
        .where(eq(menuItemOptions.menuItemId, menuItemId));
      
      if (remainingOptions.length === 0) {
        // No more options for this menu item, update hasOptions flag
        await this.db
          .update(menuItems)
          .set({ hasOptions: false })
          .where(eq(menuItems.id, menuItemId));
      }
    } catch (error) {
      console.error("Error deleting menu item option:", error);
      throw error;
    }
  }
  
  // Menu Category methods
  async getAllCategories(): Promise<MenuCategory[]> {
    try {
      return this.db.select().from(menuCategories).orderBy(menuCategories.displayOrder);
    } catch (error) {
      console.error("Error getting all categories:", error);
      throw error;
    }
  }
  
  async getCategoryByName(name: string): Promise<MenuCategory | undefined> {
    try {
      const result = await this.db
        .select()
        .from(menuCategories)
        .where(eq(menuCategories.name, name));
      
      return result[0];
    } catch (error) {
      console.error("Error getting category by name:", error);
      throw error;
    }
  }
  
  async createCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    try {
      const categoryWithDefaults = {
        ...category,
        createdAt: new Date()
      };
      
      const result = await this.db
        .insert(menuCategories)
        .values(categoryWithDefaults)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  }
  
  async updateCategory(id: number, categoryData: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    try {
      const result = await this.db
        .update(menuCategories)
        .set(categoryData)
        .where(eq(menuCategories.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error("Category not found");
      }
      
      return result[0];
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  }
  
  async deleteCategory(id: number): Promise<void> {
    try {
      // Check if there are any menu items using this category
      const menuItemsWithCategory = await this.db
        .select()
        .from(menuItems)
        .innerJoin(
          menuCategories,
          eq(menuItems.category, menuCategories.name)
        )
        .where(eq(menuCategories.id, id));
      
      if (menuItemsWithCategory.length > 0) {
        throw new Error("Cannot delete category that is still in use by menu items");
      }
      
      await this.db
        .delete(menuCategories)
        .where(eq(menuCategories.id, id));
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  }

  // Method to initialize the database with sample data
  async initializeDatabase(): Promise<void> {
    // Import the hashPassword function from auth.ts
    const { hashPassword } = await import("./auth");
    
    // Check if we already have users
    const userCount = await this.db.select().from(users);
    
    if (userCount.length === 0) {
      console.log("Initializing database with sample data...");
      
      // Create admin user with hashed password
      await this.db.insert(users).values({
        username: "bs_admin",
        password: await hashPassword("BS2025@@"),  // Use hashed password
        email: "admin@beanstalker.com",
        credits: 100,
        fullName: "Admin User",
        phoneNumber: "123-456-7890",
        isAdmin: true,
        isActive: true
      });
      
      // Create regular user with hashed password
      await this.db.insert(users).values({
        username: "user",
        password: await hashPassword("user123"),  // Use hashed password
        email: "user@example.com",
        credits: 50,
        fullName: "Regular User",
        phoneNumber: "987-654-3210",
        isAdmin: false,
        isActive: true
      });
      
      // Initialize categories first
      console.log("Creating menu categories...");
      await this.initializeCategories();
      
      // Create menu items (using the same items as in MemStorage)
      console.log("Creating menu items...");
      
      // Add breakfast items
      await this.addMenuItem("Egg & Bacon Panini", "Scrambled eggs with crispy bacon on toasted panini bread.", 13.50, "breakfast", "/images/breakfast-panini.jpg");
      await this.addMenuItem("Avocado Toast", "Smashed avocado on sourdough with feta, cherry tomatoes and microgreens.", 12.00, "breakfast", "/images/avocado-toast.jpg");
      await this.addMenuItem("Breakfast Bowl", "Greek yogurt with granola, seasonal fruits, honey and chia seeds.", 10.50, "breakfast", "/images/breakfast-bowl.jpg");
      
      // Add lunch items
      await this.addMenuItem("Chicken Salad", "Grilled chicken with mixed greens, cherry tomatoes, cucumber and balsamic dressing.", 14.50, "lunch", "/images/chicken-salad.jpg");
      await this.addMenuItem("Turkey & Swiss Sandwich", "Sliced turkey, Swiss cheese, lettuce, tomato and mayo on multigrain bread.", 13.00, "lunch", "/images/turkey-sandwich.jpg");
      await this.addMenuItem("Vegetable Soup", "Hearty vegetable soup with seasonal vegetables and herbs, served with bread.", 9.50, "lunch", "/images/vegetable-soup.jpg");
      
      // Add coffee items
      await this.addMenuItem("Cappuccino", "Espresso with steamed milk and a thick layer of foam.", 4.50, "coffee", "/images/cappuccino.jpg");
      await this.addMenuItem("Flat White", "Espresso with steamed milk and a thin layer of microfoam.", 4.50, "coffee", "/images/flat-white.jpg");
      await this.addMenuItem("Espresso", "Concentrated coffee served in a small cup.", 3.50, "coffee", "/images/espresso.jpg");
      
      // Add hot drinks
      await this.addMenuItem("Hot Chocolate", "Rich chocolate with steamed milk topped with whipped cream.", 4.50, "hot-drinks", "/images/hot-chocolate.jpg");
      await this.addMenuItem("Green Tea", "Traditional Japanese green tea.", 3.50, "hot-drinks", "/images/green-tea.jpg");
      
      // Add iced drinks
      await this.addMenuItem("Iced Coffee", "Cold brew coffee served over ice.", 4.00, "iced-drinks", "/images/iced-coffee.jpg");
      await this.addMenuItem("Iced Tea", "Fresh brewed tea served over ice.", 3.50, "iced-drinks", "/images/iced-tea.jpg");
      
      // Add juices
      await this.addMenuItem("Orange Juice", "Freshly squeezed orange juice.", 4.50, "juices", "/images/orange-juice.jpg");
      await this.addMenuItem("Green Juice", "Spinach, kale, cucumber, apple and ginger.", 5.50, "juices", "/images/green-juice.jpg");
      
      // Add smoothies
      await this.addMenuItem("Berry Blast", "Mixed berries, banana, yogurt and honey.", 6.00, "smoothies", "/images/berry-smoothie.jpg");
      await this.addMenuItem("Tropical Paradise", "Mango, pineapple, coconut milk and banana.", 6.00, "smoothies", "/images/tropical-smoothie.jpg");
      
      console.log("Database initialization complete!");
    } else {
      // Check if we have categories already, if not, initialize them
      const categoryCount = await this.db.select().from(menuCategories);
      if (categoryCount.length === 0) {
        console.log("Initializing menu categories...");
        await this.initializeCategories();
      }
    }
  }
  
  private async initializeCategories() {
    // Add categories with proper display names and order
    await this.addCategory("breakfast", "Breakfast", "Morning favorites to start your day", 10);
    await this.addCategory("lunch", "Lunch", "Satisfying midday meals", 20);
    await this.addCategory("coffee", "Coffee", "Premium coffee beverages", 30);
    await this.addCategory("hot-drinks", "Hot Drinks", "Warm beverages for any occasion", 40);
    await this.addCategory("iced-drinks", "Iced Drinks", "Refreshing cold beverages", 50);
    await this.addCategory("juices", "Juices", "Fresh-squeezed and blended juices", 60);
    await this.addCategory("smoothies", "Smoothies", "Fruit and yogurt smoothies", 70);
  }
  
  private async addCategory(
    name: string,
    displayName: string,
    description: string,
    displayOrder: number = 999
  ) {
    await this.db.insert(menuCategories).values({
      name,
      displayName,
      description,
      displayOrder,
      createdAt: new Date()
    });
  }
  
  private async addMenuItem(
    name: string, 
    description: string, 
    price: number, 
    category: string, 
    imageUrl: string | null = null
  ) {
    await this.db.insert(menuItems).values({
      name,
      description,
      price,
      category,
      imageUrl,
      hasSizes: null,
      mediumPrice: null,
      largePrice: null,
      hasOptions: false // Initialize with no options
    });
  }

  // Push subscription methods (DatabaseStorage)
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    try {
      const result = await this.db.insert(pushSubscriptions).values(subscription).returning();
      return result[0];
    } catch (error) {
      console.error("Error saving push subscription:", error);
      throw error;
    }
  }
  
  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    try {
      return this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    } catch (error) {
      console.error("Error getting push subscriptions:", error);
      throw error;
    }
  }
  
  async deletePushSubscription(endpoint: string): Promise<void> {
    try {
      await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      throw error;
    }
  }

  // Credit transaction methods (DatabaseStorage)
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    try {
      // If balance_after is not provided, calculate it from current user balance
      let transactionData = { ...transaction };
      
      if (transactionData.balanceAfter === undefined || transactionData.balanceAfter === null) {
        const user = await this.getUser(transaction.userId);
        if (user) {
          // Calculate the new balance after this transaction
          transactionData.balanceAfter = user.credits + transaction.amount;
        }
      }
      
      const result = await this.db.insert(creditTransactions).values(transactionData).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating credit transaction:", error);
      throw error;
    }
  }
  
  async getCreditTransactionsByUserId(userId: number): Promise<CreditTransaction[]> {
    try {
      return this.db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(sql`${creditTransactions.createdAt} DESC`);
    } catch (error) {
      console.error("Error getting credit transactions:", error);
      throw error;
    }
  }

  async getCreditTransactionByTransactionId(transactionId: string): Promise<CreditTransaction | undefined> {
    try {
      const result = await this.db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.transactionId, transactionId))
        .limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error("Error fetching credit transaction by transaction ID:", error);
      throw error;
    }
  }

  // Pending Credit Transfer methods (DatabaseStorage)
  async createPendingCreditTransfer(transfer: InsertPendingCreditTransfer): Promise<PendingCreditTransfer> {
    try {
      const result = await this.db.insert(pendingCreditTransfers).values(transfer).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating pending credit transfer:", error);
      throw error;
    }
  }

  async getPendingCreditTransferByCode(verificationCode: string): Promise<PendingCreditTransfer | undefined> {
    try {
      const result = await this.db
        .select()
        .from(pendingCreditTransfers)
        .where(eq(pendingCreditTransfers.verificationCode, verificationCode))
        .limit(1);
      return result[0] || undefined;
    } catch (error) {
      console.error("Error getting pending credit transfer by code:", error);
      throw error;
    }
  }

  async getPendingCreditTransfers(senderId: number): Promise<PendingCreditTransfer[]> {
    try {
      const result = await this.db
        .select()
        .from(pendingCreditTransfers)
        .where(and(
          eq(pendingCreditTransfers.senderId, senderId),
          eq(pendingCreditTransfers.status, "pending")
        ))
        .orderBy(desc(pendingCreditTransfers.createdAt));
      return result;
    } catch (error) {
      console.error("Error getting pending credit transfers:", error);
      throw error;
    }
  }

  async verifyPendingCreditTransfer(transferId: number, verifiedByUserId: number): Promise<PendingCreditTransfer> {
    try {
      const result = await this.db
        .update(pendingCreditTransfers)
        .set({
          status: "verified",
          verifiedAt: new Date(),
          verifiedByUserId
        })
        .where(eq(pendingCreditTransfers.id, transferId))
        .returning();
      
      if (!result[0]) {
        throw new Error("Pending credit transfer not found");
      }
      
      return result[0];
    } catch (error) {
      console.error("Error verifying pending credit transfer:", error);
      throw error;
    }
  }

  async getPendingCreditTransfersBySender(senderId: number): Promise<PendingCreditTransfer[]> {
    try {
      return this.db
        .select()
        .from(pendingCreditTransfers)
        .where(eq(pendingCreditTransfers.senderId, senderId))
        .orderBy(sql`${pendingCreditTransfers.createdAt} DESC`);
    } catch (error) {
      console.error("Error getting pending credit transfers by sender:", error);
      throw error;
    }
  }

  async getAllPendingCreditTransfers(): Promise<PendingCreditTransfer[]> {
    try {
      return this.db
        .select()
        .from(pendingCreditTransfers)
        .where(eq(pendingCreditTransfers.status, "pending"))
        .orderBy(sql`${pendingCreditTransfers.createdAt} DESC`);
    } catch (error) {
      console.error("Error getting all pending credit transfers:", error);
      throw error;
    }
  }

  async getAllCreditTransfers(): Promise<PendingCreditTransfer[]> {
    try {
      return this.db
        .select()
        .from(pendingCreditTransfers)
        .orderBy(sql`${pendingCreditTransfers.createdAt} DESC`);
    } catch (error) {
      console.error("Error getting all credit transfers:", error);
      throw error;
    }
  }

  async expirePendingCreditTransfers(): Promise<void> {
    try {
      await this.db
        .update(pendingCreditTransfers)
        .set({ status: "expired" })
        .where(and(
          eq(pendingCreditTransfers.status, "pending"),
          sql`${pendingCreditTransfers.expiresAt} <= NOW()`
        ));
    } catch (error) {
      console.error("Error expiring pending credit transfers:", error);
      throw error;
    }
  }

  // Favorites methods (DatabaseStorage)
  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    try {
      const result = await this.db.insert(favorites).values(favorite).returning();
      return result[0];
    } catch (error) {
      console.error("Error adding favorite:", error);
      throw error;
    }
  }
  
  async removeFavorite(userId: number, menuItemId: number): Promise<void> {
    try {
      await this.db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.menuItemId, menuItemId)
          )
        );
    } catch (error) {
      console.error("Error removing favorite:", error);
      throw error;
    }
  }
  
  async getUserFavorites(userId: number): Promise<Favorite[]> {
    try {
      return this.db
        .select()
        .from(favorites)
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt));
    } catch (error) {
      console.error("Error getting user favorites:", error);
      throw error;
    }
  }
  

  
  async isFavorite(userId: number, menuItemId: number): Promise<boolean> {
    try {
      const result = await this.db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.menuItemId, menuItemId)
          )
        );
      
      return result.length > 0;
    } catch (error) {
      console.error("Error checking if item is favorite:", error);
      throw error;
    }
  }
  
  async getFavoriteWithOptions(userId: number, menuItemId: number): Promise<Favorite | undefined> {
    try {
      const result = await this.db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.menuItemId, menuItemId)
          )
        )
        .limit(1);
      
      return result[0] || undefined;
    } catch (error) {
      console.error("Error getting favorite with options:", error);
      throw error;
    }
  }
}

// Use database storage in production and memory storage for development fallback
// To use database storage, set USE_DATABASE=true in environment
// Always use database storage for production use
export const storage = new DatabaseStorage();