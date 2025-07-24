import { AppHeader } from "@/components/app-header";
import { SettingsIcon } from "@/components/icons";
import { Send, Menu, ShoppingCart, CreditCard, User, Gift, TrendingUp, Sparkles, DollarSign, Heart, Crown, QrCode, Coffee, Settings, RefreshCw, ArrowLeft, CheckCircle, X, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { EnhancedBuyCredits } from "@/components/enhanced-buy-credits";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";

import { useNativeNotifications } from "@/hooks/use-native-notifications";
import { usePushNotificationContext } from "@/contexts/push-notification-context";
import { useCart } from "@/contexts/cart-context";
import { MenuItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function HomePage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [favoritesPopupOpen, setFavoritesPopupOpen] = useState(false);
  const [selectedFavorites, setSelectedFavorites] = useState<Set<number>>(new Set());
  const { notifySuccess, notifyError } = useNativeNotifications();
  const { notificationsEnabled } = usePushNotificationContext();
  const { addToCart } = useCart();
  
  const { data: orders = [] } = useQuery<Order[], Error>({
    queryKey: ["/api/orders"],
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Completely disable automatic loading
    refetchInterval: false, // Completely disable automatic polling - let notifications handle updates
    staleTime: Infinity, // Never consider stale - only update via notifications
    enabled: false, // Start disabled, only fetch when manually triggered
  });

  // Fetch favorites for the popup
  const { data: favoriteItems = [] } = useQuery<MenuItem[], Error>({
    queryKey: ["/api/favorites"],
    enabled: favoritesPopupOpen, // Only fetch when popup is open
    refetchOnWindowFocus: false,
  });

  // Manual sync mutation to check Square for order status updates
  const syncOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/square/sync-my-orders");
      return response.json();
    },
    onSuccess: (data) => {
      // Refresh orders after sync
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      if (data.updatedOrders && data.updatedOrders.length > 0) {
        notifySuccess("Orders Updated", `${data.updatedOrders.length} order(s) status updated from Square Kitchen`);
      } else {
        notifySuccess("Up to Date", "All orders are already up to date");
      }
    },
    onError: (error: Error) => {
      notifyError("Sync Failed", error.message || "Failed to sync with Square Kitchen");
    },
  });
  
  // Manually trigger orders fetch only when needed
  useEffect(() => {
    if (user) {
      // Only fetch once on mount, then rely on notifications for updates
      queryClient.fetchQuery({ queryKey: ["/api/orders"] });
    }
  }, [user]);

  // Add an effect to register and handle service worker message events for notifications
  useEffect(() => {
    if (!user) return;
    
    // Check if service worker is available
    if (!('serviceWorker' in navigator)) {
      console.log("Service worker not available");
      return;
    }

    // Log notification status
    console.log("Home page notification setup. Notifications enabled:", notificationsEnabled);
    
    // This handler processes messages from the service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log("Service worker message received in home page:", event.data);
      
      // If it's a notification message
      if (event.data && event.data.type === 'NOTIFICATION_SHOWN') {
        // If it's an order notification, we refresh the orders list
        if (
          (event.data.title && event.data.title.toLowerCase().includes('order')) ||
          (event.data.body && event.data.body.toLowerCase().includes('order'))
        ) {
          console.log("Order notification received, refreshing orders list");
        }
      }
    };
    
    // Add the event listener
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    // Cleanup when component unmounts
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [user, notificationsEnabled]);
  
  // Sort orders by date, most recent first
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3); // Get only the 3 most recent orders
  
  const handleOrderFavorites = () => {
    setFavoritesPopupOpen(true);
    setSelectedFavorites(new Set()); // Reset selection when opening
  };

  const handleFavoriteToggle = (itemId: number) => {
    const newSelection = new Set(selectedFavorites);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedFavorites(newSelection);
  };

  const handleAddSelectedToCart = () => {
    if (selectedFavorites.size === 0) {
      notifyError("No Items Selected", "Please select some favorites to add to your cart.");
      return;
    }

    let addedCount = 0;
    selectedFavorites.forEach(itemId => {
      const item = favoriteItems.find(f => f.id === itemId);
      if (item) {
        try {
          const menuItem = item.menuItem || item;
          
          // Convert selectedOptions object to array for cart
          let cartOptions = [];
          if (item.selectedOptions && typeof item.selectedOptions === 'object') {
            Object.entries(item.selectedOptions).forEach(([key, value]) => {
              if (value && value.toString().trim() !== '') {
                cartOptions.push(value.toString());
              }
            });
          } else if (Array.isArray(item.selectedOptions)) {
            cartOptions = item.selectedOptions;
          }
          
          addToCart({
            menuItemId: menuItem.id || item.menuItemId,
            name: item.customName || menuItem.name,
            price: menuItem.price || 0,
            quantity: 1,
            imageUrl: menuItem.imageUrl || undefined,
            size: item.selectedSize || (menuItem.hasSizes ? "small" : undefined),
            options: cartOptions
          });
          addedCount++;
        } catch (error) {
          console.error(`Error adding ${item.customName || menuItem?.name || item.name} to cart:`, error);
        }
      }
    });

    notifySuccess("Favorites Added to Cart", `${addedCount} favorite item${addedCount !== 1 ? 's' : ''} added to your cart!`);

    setFavoritesPopupOpen(false);
    setSelectedFavorites(new Set());
  };

  const handleNavigateToMenu = () => {
    navigate("/menu");
  };
  
  const handleNavigateToProfile = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-green-50/30 mobile-scroll">
      <AppHeader />
      
      <main className="flex-1 px-6 max-w-7xl mx-auto w-full main-content-with-header mobile-scroll">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Hi, {user?.fullName || user?.username}</h1>
          <p className="text-sm text-gray-600">Manage your account and enjoy premium coffee experiences</p>
        </div>
      
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Available Balance Card */}
          <Card className="lg:col-span-2 bg-green-800 border-0 shadow-lg rounded-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-white" />
                    <span className="text-sm font-medium text-white opacity-90">Available Balance</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    ${user?.credits.toFixed(2)}
                  </div>
                </div>
                
                <div>
                  <Button 
                    className="bg-green-600 hover:bg-green-500 text-white border-0 px-6 py-2.5 rounded-lg transition-colors shadow-md"
                    onClick={() => setBuyCreditsOpen(true)}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    <span className="text-sm">Add Credits</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Coffee & Food Card */}
          <Card className="lg:col-span-3 bg-green-800 border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 cursor-pointer group mb-2 relative overflow-hidden" onClick={() => navigate("/menu")}>
            <CardContent className="px-6 py-0 relative">
              <div className="flex items-center justify-between h-full py-6">
                {/* Content */}
                <div className="flex-1 space-y-4 pr-4">
                  <h2 className="text-2xl font-bold text-white">Order Coffee<br />& Food</h2>
                  <Button 
                    className="bg-white text-green-800 hover:bg-gray-100 font-semibold px-6 py-2.5 rounded-lg shadow-md transition-all duration-200 text-sm flex items-center gap-2"
                  >
                    <Coffee className="h-4 w-4" />
                    Browse Menu
                  </Button>
                </div>
                
                {/* Right side with coffee cup and sandwich */}
                <div className="relative flex-shrink-0">
                  {/* Coffee cup outline icon */}
                  <div className="absolute top-4 right-8 z-10">
                    <div className="w-16 h-16 rounded-full border-4 border-white/80 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white/80 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Breakfast sandwich image */}
                  <div className="relative -mb-16">
                    <img 
                      src="/breakfast-coffee.png" 
                      alt="Breakfast sandwich and coffee"
                      className="w-64 h-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Featured Action - Order Favorites */}
          <Card className="lg:col-span-3 bg-white border-2 border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 cursor-pointer group mb-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-gray-900">
                  <h3 className="text-lg font-semibold mb-1">Order Your Favorites</h3>
                  <p className="text-gray-600 text-sm">Quick access to your most loved items</p>
                </div>
                <Button 
                  className="bg-green-800 hover:bg-green-800/90 text-white transition-all duration-200"
                  onClick={handleOrderFavorites}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Order Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Other Action Boxes Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Buy Coffee Credits */}
            <Card 
              className="bg-white border-2 border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 cursor-pointer group"
              onClick={() => setBuyCreditsOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <CreditCard className="h-6 w-6 text-green-800 mx-auto mb-2" />
                <h3 className="text-gray-900 font-semibold text-sm">Buy Credits</h3>
              </CardContent>
            </Card>

            {/* Send Credits */}
            <Card 
              className="bg-white border-2 border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/send-credits")}
            >
              <CardContent className="p-4 text-center">
                <Gift className="h-6 w-6 text-green-800 mx-auto mb-2" />
                <h3 className="text-gray-900 font-semibold text-sm">Send Credits</h3>
              </CardContent>
            </Card>

            {/* Profile Settings */}
            <Card 
              className="bg-white border-2 border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 cursor-pointer group"
              onClick={handleNavigateToProfile}
            >
              <CardContent className="p-4 text-center">
                <Settings className="h-6 w-6 text-green-800 mx-auto mb-2" />
                <h3 className="text-gray-900 font-semibold text-sm">Profile Settings</h3>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-800" />
                  Recent Orders
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => syncOrdersMutation.mutate()}
                    disabled={syncOrdersMutation.isPending}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${syncOrdersMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncOrdersMutation.isPending ? 'Syncing...' : 'Check Updates'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate("/orders")}
                    className="text-green-800 hover:text-green-800 hover:bg-green-50"
                  >
                    View All
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {recentOrders.length > 0 ? (
                  recentOrders.slice(0, 3).map((order) => (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" key={order.id}>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Order #{order.id}</div>
                        <div className="text-xs text-gray-600">
                          {Array.isArray(order.items) ? `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}` : '1 item'} • {formatCurrency(order.total)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No recent orders</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-green-800 text-green-800 hover:bg-green-50"
                      onClick={() => navigate("/menu")}
                    >
                      Start Ordering
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


        </div>
      </main>
      
      {/* Buy Credits Popup */}
      {buyCreditsOpen && (
        <div className="popup-container">
          <div className="popup-content">
            <div className="max-w-md mx-auto space-y-6">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="popup-header flex items-center space-x-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBuyCreditsOpen(false)}
                  className="p-2 h-auto"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold text-slate-800">Buy Credits</h1>
              </motion.div>

              <div className="scroll-container momentum-scroll">
                <EnhancedBuyCredits />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Favorites Selection Popup */}
      {favoritesPopupOpen && (
        <div className="popup-container">
          <div className="popup-content">
            <div className="max-w-md mx-auto space-y-6">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="popup-header flex items-center space-x-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFavoritesPopupOpen(false)}
                  className="p-2 h-auto"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold text-slate-800">Select Favorites</h1>
              </motion.div>

            {/* Favorites Count */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Heart className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-green-100 text-sm">Your Favorites</p>
                      <p className="text-2xl font-bold">{favoriteItems.length} items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

              <div className="scroll-container momentum-scroll">
                {/* Favorites List */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Heart className="h-5 w-5 text-green-600" />
                        <span>Choose Items to Order</span>
                      </CardTitle>
                      <CardDescription>
                        Select your favorite items to add to cart. All items will be added with default options.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {favoriteItems.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <Heart className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                          <p className="text-sm mb-2">No favorites found</p>
                          <p className="text-xs text-slate-400 mb-4">Visit the menu to add items to your favorites!</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setFavoritesPopupOpen(false);
                              navigate("/menu");
                            }}
                            className="border-green-600 text-green-600 hover:bg-green-50"
                          >
                            Browse Menu
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {favoriteItems.map((item) => (
                            <div key={item.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <Checkbox
                                checked={selectedFavorites.has(item.id)}
                                onCheckedChange={() => handleFavoriteToggle(item.id)}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{item.customName || item.menuItem?.name || item.name}</p>
                                <p className="text-xs text-slate-600 truncate">
                                  {(() => {
                                    const parts = [];
                                    if (item.selectedSize) {
                                      parts.push(`${item.selectedSize.charAt(0).toUpperCase() + item.selectedSize.slice(1)} size`);
                                    }
                                    
                                    // Handle selectedOptions as object (from database)
                                    if (item.selectedOptions && typeof item.selectedOptions === 'object') {
                                      const optionStrings = [];
                                      Object.entries(item.selectedOptions).forEach(([key, value]) => {
                                        if (value && value.toString().trim() !== '') {
                                          optionStrings.push(value.toString());
                                        }
                                      });
                                      if (optionStrings.length > 0) {
                                        parts.push(optionStrings.join(', '));
                                      }
                                    }
                                    // Handle selectedOptions as array (legacy)
                                    else if (Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
                                      parts.push(item.selectedOptions.join(', '));
                                    }
                                    
                                    return parts.length > 0 ? parts.join(' • ') : 'Default options';
                                  })()}
                                </p>
                                <p className="text-sm font-semibold text-green-600">{formatCurrency(item.menuItem?.price || item.price || 0)}</p>
                              </div>
                              {(item.menuItem?.imageUrl || item.imageUrl) && (
                                <div className="w-12 h-12 bg-slate-200 rounded-lg flex-shrink-0 overflow-hidden">
                                  <img 
                                    src={item.menuItem?.imageUrl || item.imageUrl} 
                                    alt={item.menuItem?.name || item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {favoriteItems.length > 0 && (
                        <div className="space-y-3 pt-4 mt-4 border-t border-slate-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Selected items:</span>
                            <span className="font-semibold">{selectedFavorites.size}</span>
                          </div>
                          
                          <Button
                            onClick={handleAddSelectedToCart}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                            disabled={selectedFavorites.size === 0}
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Add {selectedFavorites.size} Item{selectedFavorites.size !== 1 ? 's' : ''} to Cart
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={() => setFavoritesPopupOpen(false)}
                            className="w-full"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* How It Works */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-slate-100 border-slate-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-800 mb-3">Quick Order</h3>
                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex items-start space-x-2">
                          <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
                          <p>Select your favorite items using the checkboxes</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
                          <p>Items will be added with default size and options</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
                          <p>Customize them later in your cart if needed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}