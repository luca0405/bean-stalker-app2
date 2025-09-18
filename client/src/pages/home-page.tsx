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
import { useState, useEffect, useRef } from "react";
import { EnhancedBuyCredits } from "@/components/enhanced-buy-credits";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { getMobileCompatibleImageUrl } from "@/utils/mobile-image-utils";


import { useNativeNotification } from "@/services/native-notification-service";
import { usePushNotificationContext } from "@/contexts/push-notification-context";
import { useCart } from "@/contexts/cart-context";
import { MenuItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Portal } from "@/components/portal";
import { backgroundNotificationService } from "@/services/background-notification-service";

export default function HomePage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [favoritesPopupOpen, setFavoritesPopupOpen] = useState(false);
  const [selectedFavorites, setSelectedFavorites] = useState<Set<number>>(new Set());
  const { notify } = useNativeNotification();
  const { notificationsEnabled } = usePushNotificationContext();
  const { addToCart } = useCart();
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const maxPullDistance = 100;
  
  const { data: orders = [] } = useQuery<Order[], Error>({
    queryKey: ["/api/orders"],
    refetchOnWindowFocus: true, // Enable refetch when user returns to tab
    refetchOnMount: true,
    refetchInterval: 15000, // Check for updates every 15 seconds (matches backend polling)
    refetchIntervalInBackground: false, // Only poll when app is active
  });

  // Fetch favorites for the popup
  const { data: favoriteItems = [] } = useQuery<(MenuItem & { favoriteId: number; selectedSize?: string; selectedOptions?: any[]; customName?: string })[], Error>({
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
        notify({
          title: "Orders Updated",
          description: `${data.updatedOrders.length} order(s) status updated from Square Kitchen`,
        });
      } else {
        notify({
          title: "Up to Date",
          description: "All orders are already up to date",
        });
      }
    },
    onError: (error: Error) => {
      notify({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Square Kitchen",
        variant: "destructive",
      });
    },
  });
  
  // Add an effect to register and handle service worker message events for notifications
  useEffect(() => {
    if (!user) return;
    
    // Initialize background notification service for native apps
    backgroundNotificationService.initialize();
    
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
          // Force refresh orders when notification arrives
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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

  // Track order status changes for background notifications (native apps)
  useEffect(() => {
    if (!user || !orders) return;
    
    // Update tracked orders in background notification service
    orders.forEach(order => {
      backgroundNotificationService.updateOrderStatus(order.id, order.status);
    });
  }, [orders, user]);

  // Pull-to-refresh functionality
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Invalidate user data to refresh credit balance
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      // Invalidate orders to get latest status
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Add a small delay to ensure the UI feels responsive
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      notify({
        title: "Refresh Failed",
        description: "Unable to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && startY > 0 && scrollContainerRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      
      if (distance > 0) {
        e.preventDefault(); // Prevent default scroll behavior
        setPullDistance(Math.min(distance, maxPullDistance));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 60) { // Trigger refresh if pulled far enough
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    setStartY(0);
  };
  
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
      notify({
        title: "No Items Selected",
        description: "Please select some favorites to add to your cart.",
        variant: "default",
      });
      return;
    }

    let addedCount = 0;
    let itemDetails: string[] = [];
    
    selectedFavorites.forEach(itemId => {
      const item = favoriteItems.find(f => f.id === itemId);
      if (item) {
        try {
          // Use stored size if available, otherwise default to small
          const storedSize = item.selectedSize || (item.hasSizes ? "small" : undefined);
          const storedOptions = item.selectedOptions || [];
          
          // Calculate price based on stored configuration using Square variation data
          let finalPrice = item.price || 0;
          if (item.hasSizes && storedSize && item.variations && item.variations.length > 0) {
            // Use actual Square variation pricing instead of hardcoded multipliers
            const matchingVariation = item.variations.find((variation: any) => {
              const variationName = variation.name?.toLowerCase() || '';
              const selectedSize = storedSize.toLowerCase();
              
              // Match variation names with selected size
              return (
                variationName.includes(selectedSize) ||
                (selectedSize === 'small' && variation.isDefault) ||
                (selectedSize === 'medium' && (variationName.includes('med') || variationName.includes('12') || variationName.includes('16'))) ||
                (selectedSize === 'large' && (variationName.includes('large') || variationName.includes('20') || variationName.includes('24')))
              );
            });
            
            if (matchingVariation) {
              finalPrice = matchingVariation.price;
              console.log(`✅ Using Square variation price for ${item.name} ${storedSize}: $${finalPrice} (variation: "${matchingVariation.name}")`);
            } else {
              // Fallback to legacy pricing if no matching variation found
              console.log(`⚠️  No matching Square variation found for ${item.name} ${storedSize}, using fallback pricing`);
              switch (storedSize) {
                case 'medium':
                  finalPrice = item.mediumPrice || finalPrice * 1.25;
                  break;
                case 'large':
                  finalPrice = item.largePrice || finalPrice * 1.5;
                  break;
                default:
                  finalPrice = item.price || 0;
              }
            }
          } else if (item.hasSizes) {
            // Legacy fallback for items without Square variations
            switch (storedSize) {
              case 'medium':
                finalPrice = item.mediumPrice || finalPrice * 1.25;
                break;
              case 'large':
                finalPrice = item.largePrice || finalPrice * 1.5;
                break;
              default:
                finalPrice = item.price || 0;
            }
          }
          
          // Add option price adjustments
          const optionAdjustment = storedOptions.reduce((total: number, option: any) => 
            total + (option.priceAdjustment || 0), 0);
          finalPrice += optionAdjustment;
          
          addToCart({
            menuItemId: item.id.toString(), // Convert number to string for CartItem schema
            name: item.name,
            price: finalPrice,
            quantity: 1,
            imageUrl: item.imageUrl || undefined,
            size: storedSize as 'small' | 'medium' | 'large' | undefined, // Type assertion for legacy field
            options: storedOptions
          });
          
          // Build detailed description for notification
          let itemDesc = item.name;
          if (storedSize) {
            itemDesc += ` (${storedSize.charAt(0).toUpperCase() + storedSize.slice(1)})`;
          }
          if (storedOptions.length > 0) {
            const optionText = storedOptions.map((opt: any) => opt.value).join(', ');
            itemDesc += ` with ${optionText}`;
          }
          itemDesc += ` - ${formatCurrency(finalPrice)}`;
          itemDetails.push(itemDesc);
          addedCount++;
        } catch (error) {
          console.error(`Error adding ${item.name} to cart:`, error);
        }
      }
    });

    // Create detailed notification with all added items
    const detailedDescription = addedCount === 1 
      ? itemDetails[0] + " added to your cart"
      : `${addedCount} items added:\n${itemDetails.join(', ')}`;

    notify({
      title: "Favorites Added to Cart",
      description: detailedDescription,
    });

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
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-green-50/30 native-page-scroll"
    >
      <AppHeader />
      
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-16 left-0 right-0 z-50 flex justify-center transition-all duration-200"
          style={{ 
            transform: `translateY(${Math.min(pullDistance - 20, 40)}px)`,
            opacity: Math.min(pullDistance / 60, 1)
          }}
        >
          <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 text-green-600 ${pullDistance >= 60 || isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm text-gray-700">
              {pullDistance >= 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      <main 
        ref={scrollContainerRef}
        className="px-6 py-8 pb-32 w-full mx-auto overflow-y-auto h-full
          sm:max-w-none sm:px-8 
          md:max-w-5xl md:px-10
          lg:max-w-6xl lg:px-12"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          paddingTop: `${Math.max(32, 32 + pullDistance * 0.5)}px`,
          transition: isRefreshing ? 'padding-top 0.3s ease' : 'none'
        }}
      >
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Hi, {user?.fullName || user?.username}</h1>
          <p className="text-sm text-gray-600">Manage your account and enjoy premium coffee experiences</p>
        </div>
      
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Available Balance Card - Full Width */}
          <div className="md:col-span-2 lg:col-span-3">
            <Card className="bg-green-800 border-0 shadow-lg rounded-xl">
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
                  
                  <div className="space-y-2">
                    <Button 
                      className="bg-green-600 hover:bg-green-500 text-white border-0 px-6 py-2.5 rounded-lg transition-colors shadow-md w-full"
                      onClick={() => setBuyCreditsOpen(true)}
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      <span className="text-sm">Add Credits</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Coffee & Food Card */}
          <Card className="md:col-span-2 lg:col-span-3 bg-green-800 border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 cursor-pointer group mb-2 relative overflow-hidden" onClick={() => navigate("/menu")}>
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
          <Card className="md:col-span-2 lg:col-span-3 bg-white border-2 border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 cursor-pointer group mb-2">
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
          <div className="grid grid-cols-3 md:col-span-2 lg:col-span-3 gap-4">
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
        <div className="grid grid-cols-1 gap-6">
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
        <Portal>
          <div className="popup-container">
            <div className="popup-content">
              <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto space-y-6">
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
        </Portal>
      )}

      {/* Favorites Selection Popup */}
      {favoritesPopupOpen && (
        <Portal>
          <div className="popup-container">
            <div className="popup-content">
              <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto space-y-6">
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
                        Select your favorite items to add to cart. Items with sizes/options will be added with default selections. You can customize them in your cart.
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
                              {/* Product Image Thumbnail */}
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                {item.imageUrl ? (
                                  <img
                                    src={getMobileCompatibleImageUrl(item.imageUrl, item.category)}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.log(`Failed to load favorite image: ${item.imageUrl} for ${item.name}`);
                                      
                                      // Hide the broken image and show text fallback
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      const imgElement = e.target as HTMLImageElement;
                                      if (imgElement.parentElement) {
                                        const fallback = imgElement.parentElement.querySelector('.image-fallback');
                                        if (fallback) {
                                          (fallback as HTMLElement).style.display = 'flex';
                                        }
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log(`Successfully loaded favorite image: ${item.imageUrl} for ${item.name}`);
                                    }}
                                  />
                                ) : null}
                                <div className="absolute inset-0 bg-gray-50 flex items-center justify-center text-gray-500 image-fallback" style={{ display: item.imageUrl ? 'none' : 'flex' }}>
                                  <span className="text-xs font-medium text-center px-1">No Image Available</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                                <p className="text-xs text-slate-600 truncate">{item.description}</p>
                                {/* Show stored configuration if available */}
                                {(item.selectedSize || (item.selectedOptions && item.selectedOptions.length > 0)) && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Saved: {item.selectedSize ? `${item.selectedSize.charAt(0).toUpperCase() + item.selectedSize.slice(1)}` : 'Default size'}
                                    {item.selectedOptions && item.selectedOptions.length > 0 && 
                                      ` with ${item.selectedOptions.map((opt: any) => opt.value).join(', ')}`
                                    }
                                  </p>
                                )}
                                {/* Show size options if available but no saved config */}
                                {item.hasSizes && !item.selectedSize && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Sizes: Small {formatCurrency(item.price || 0)} | Medium {formatCurrency(item.mediumPrice || (item.price || 0) * 1.25)} | Large {formatCurrency(item.largePrice || (item.price || 0) * 1.5)}
                                  </p>
                                )}
                                {/* Show calculated price based on saved config */}
                                <p className="text-sm font-semibold text-green-600">
                                  {(() => {
                                    // Calculate price with stored configuration
                                    let price = item.price || 0;
                                    
                                    // Add size price adjustments if size is selected
                                    if (item.selectedSize) {
                                      if (item.selectedSize === 'medium') {
                                        price = item.mediumPrice || price * 1.25;
                                      } else if (item.selectedSize === 'large') {
                                        price = item.largePrice || price * 1.5;
                                      }
                                    }
                                    
                                    // Add option adjustments (regardless of size)
                                    if (item.selectedOptions && item.selectedOptions.length > 0) {
                                      price += item.selectedOptions.reduce((total: number, opt: any) => total + (opt.priceAdjustment || 0), 0);
                                    }
                                    
                                    // Show calculated price if we have saved options or size, otherwise show base price
                                    if ((item.selectedOptions && item.selectedOptions.length > 0) || item.selectedSize) {
                                      return formatCurrency(price);
                                    }
                                    
                                    return item.hasSizes ? `From ${formatCurrency(item.price || 0)}` : formatCurrency(item.price || 0);
                                  })()}
                                </p>
                              </div>
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
                          <p>Items will be added with saved size and options, or defaults</p>
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
        </Portal>
      )}

    </div>
  );
}