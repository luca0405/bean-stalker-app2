import { AppHeader } from "@/components/app-header";
import { SettingsIcon } from "@/components/icons";
import { Send, Menu, ShoppingCart, CreditCard, User, Gift, TrendingUp, Sparkles, DollarSign, Heart, Crown, QrCode, Coffee, Settings, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

import { useToast } from "@/hooks/use-toast";
import { usePushNotificationContext } from "@/contexts/push-notification-context";
import { useCart } from "@/contexts/cart-context";
import { MenuItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function HomePage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const { toast } = useToast();
  const { notificationsEnabled } = usePushNotificationContext();
  const { addToCart } = useCart();
  
  const { data: orders = [] } = useQuery<Order[], Error>({
    queryKey: ["/api/orders"],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 5000, // Refresh every 5 seconds
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
        toast({
          title: "Orders Updated",
          description: `${data.updatedOrders.length} order(s) status updated from Square Kitchen`,
        });
      } else {
        toast({
          title: "Up to Date",
          description: "All orders are already up to date",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Square Kitchen",
        variant: "destructive",
      });
    },
  });
  
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
  
  const handleOrderFavorites = async () => {
    if (!user) return;
    
    try {
      // Fetch user's favorite items directly
      const favoritesResponse = await apiRequest("GET", "/api/favorites");
      const favoriteItems: MenuItem[] = await favoritesResponse.json();
      
      if (favoriteItems.length === 0) {
        toast({
          title: "No Favorites Found",
          description: "You haven't marked any items as favorites yet. Visit the menu to add favorites!",
          variant: "default",
        });
        return;
      }
      
      // Add all favorite items to cart
      let addedCount = 0;
      for (const item of favoriteItems) {
        try {
          addToCart({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            imageUrl: item.imageUrl || undefined,
            size: item.hasSizes ? "small" : undefined,
            options: []
          });
          addedCount++;
        } catch (error) {
          console.error(`Error adding ${item.name} to cart:`, error);
        }
      }
      
      toast({
        title: "Favorites Added to Cart",
        description: `${addedCount} favorite item${addedCount !== 1 ? 's' : ''} added to your cart!`,
      });
      
      // Open the cart popup to show the items
      // Cart automatically updates through context
      
    } catch (error) {
      console.error("Error ordering favorites:", error);
      toast({
        title: "Error",
        description: "Failed to load your favorite items. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNavigateToMenu = () => {
    navigate("/menu");
  };
  
  const handleNavigateToProfile = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-green-50/30">
      <AppHeader />
      
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Welcome back, {user?.username}</h1>
          <p className="text-sm text-gray-600">Manage your account and enjoy premium coffee experiences</p>
        </div>
      
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Enhanced Credit Balance Card */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-green-800 via-green-700 to-green-900 border-0 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
            {/* Subtle pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
            </div>
            
            <CardContent className="p-8">
              <div className="flex justify-between items-start">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-green-300" />
                    <span className="text-sm font-medium text-green-100">Available Balance</span>
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    ${user?.credits.toFixed(2)}
                  </div>
                  <p className="text-green-100/80 text-sm">Ready for your next order</p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-200 border border-white/30"
                    onClick={() => setBuyCreditsOpen(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Credits
                  </Button>
                  {user?.credits && user.credits > 0 && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                      onClick={() => navigate("/send-credits")}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Send Credits
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Featured Action - Order Favorites */}
          <Card className="lg:col-span-3 bg-white border-2 border-green-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-300 cursor-pointer group mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-gray-900">
                  <h3 className="text-lg font-semibold mb-1">Order Your Favorites</h3>
                  <p className="text-gray-600 text-sm">Quick access to your most loved items</p>
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
                  onClick={handleOrderFavorites}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Order Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Boxes Grid */}
          <div className="grid grid-cols-4 gap-3">
            {/* Order Coffee & Food */}
            <Card 
              className="bg-white border-2 border-green-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/menu")}
            >
              <CardContent className="p-4 text-center">
                <Coffee className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <h3 className="text-gray-900 font-semibold text-sm">Order Coffee</h3>
              </CardContent>
            </Card>

            {/* Buy Coffee Credits */}
            <Card 
              className="bg-white border-2 border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer group"
              onClick={() => setBuyCreditsOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <CreditCard className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <h3 className="text-gray-900 font-semibold text-sm">Buy Credits</h3>
              </CardContent>
            </Card>

            {/* Send Credits */}
            <Card 
              className="bg-white border-2 border-purple-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate("/send-credits")}
            >
              <CardContent className="p-4 text-center">
                <Gift className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <h3 className="text-gray-900 font-semibold text-sm">Send Credits</h3>
              </CardContent>
            </Card>

            {/* Profile Settings */}
            <Card 
              className="bg-white border-2 border-orange-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 cursor-pointer group"
              onClick={handleNavigateToProfile}
            >
              <CardContent className="p-4 text-center">
                <Settings className="h-6 w-6 text-orange-600 mx-auto mb-2" />
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
                  <TrendingUp className="h-5 w-5 text-green-600" />
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
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                        order.status === 'completed' ? 'bg-green-100 text-green-600' : 
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
                      className="mt-2 border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => navigate("/menu")}
                    >
                      Start Ordering
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Summary */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Account Summary
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Current Balance</div>
                      <div className="text-xs text-gray-600">Available credits</div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    ${user?.credits.toFixed(2)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Crown className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Membership Status</div>
                      <div className="text-xs text-gray-600">Premium member</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-blue-600">
                    Active
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Total Orders</div>
                      <div className="text-xs text-gray-600">Lifetime orders</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-purple-600">
                    {orders.length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Buy Credits Dialog */}
      <Dialog open={buyCreditsOpen} onOpenChange={setBuyCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Credits</DialogTitle>
            <DialogDescription>
              Add credits to your account to use for purchases.
            </DialogDescription>
          </DialogHeader>
          
          <EnhancedBuyCredits />
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBuyCreditsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}