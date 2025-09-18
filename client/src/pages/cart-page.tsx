import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotification } from "@/services/native-notification-service";


export default function CartPage() {
  const { 
    cart, 
    removeFromCart, 
    updateCartItemQuantity, 
    clearCart, 
    calculateSubtotal, 
    calculateTotal 
  } = useCart();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { notify } = useNativeNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const serviceFee = 0;

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return await response.json();
    },
    onSuccess: (data) => {
      clearCart();
      
      // Invalidate user cache to refresh credit balance immediately
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      notify({
        title: "Order Placed Successfully!",
        description: `Your order #${data.id} has been submitted to the kitchen.`,
        variant: "success"
      });
      setLocation("/orders");
    },
    onError: (error: Error) => {
      notify({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = async () => {
    if (!user) {
      notify({
        title: "Please log in",
        description: "You need to be logged in to place an order.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      notify({
        title: "Cart is empty",
        description: "Add some items to your cart first.",
        variant: "destructive",
      });
      return;
    }

    const total = calculateTotal();
    
    if (user.credits < total) {
      notify({
        title: "Insufficient credits",
        description: `You need $${total.toFixed(2)} in credits but only have $${user.credits.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      await placeOrderMutation.mutateAsync({
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          options: item.options
        })),
        total: total
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatOptionDisplay = (options?: any[]) => {
    if (!options || options.length === 0) return '';
    return options.map(opt => opt.value).join(', ');
  };

  const handleQuantityChange = (item: any, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(item.menuItemId, item.size, undefined, item.options, item.variationId);
    } else {
      updateCartItemQuantity(item.menuItemId, newQuantity, item.size, undefined, item.options, item.variationId);
    }
  };

  const handleRemoveItem = (item: any) => {
    removeFromCart(item.menuItemId, item.size, item.option, item.options, item.variationId);
  };

  if (cart.length === 0) {
    return (
      <div className="popup-container">
        <div className="popup-content">
          <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="popup-header flex items-center space-x-4"
            >
              <Link href="/menu">
                <Button variant="ghost" size="sm" className="p-2 h-auto">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-800">Your Cart</h1>
            </motion.div>

            {/* Empty State */}
            <div className="flex-1 flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-6">Looks like you haven't added any items to your cart yet.</p>
                <Link href="/menu">
                  <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                    Browse Menu
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-content">
        <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="popup-header flex items-center space-x-4"
          >
            <Link href="/menu">
              <Button variant="ghost" size="sm" className="p-2 h-auto">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Your Cart</h1>
              <p className="text-sm text-gray-600">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
            </div>
          </motion.div>

          <div className="scroll-container momentum-scroll">
            <div className="space-y-6">

              {/* Cart Items */}
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <motion.div
                    key={`${item.menuItemId}-${item.variationId || item.variationName || item.size}-${JSON.stringify(item.options)}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Item Image */}
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                                <span className="text-xs text-green-700 font-medium">No Image</span>
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.name}</h3>
                            
                            {/* Variation and Options */}
                            <div className="space-y-1">
                              {item.variationName && (
                                <p className="text-xs text-gray-600">
                                  {item.variationName}
                                </p>
                              )}
                              {item.size && !item.variationName && (
                                <p className="text-xs text-gray-600">
                                  Size: {item.size.charAt(0).toUpperCase() + item.size.slice(1)}
                                </p>
                              )}
                              {item.options && item.options.length > 0 && (
                                <p className="text-xs text-gray-600">
                                  {formatOptionDisplay(item.options)}
                                </p>
                              )}
                            </div>

                            {/* Price and Quantity Controls */}
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-semibold text-green-600">
                                ${item.price.toFixed(2)}
                              </span>
                              
                              <div className="flex items-center gap-3">
                                {/* Remove Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item)}
                                  className="p-1 h-auto text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>

                                {/* Quantity Controls */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="font-semibold text-sm w-8 text-center">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Order Summary */}
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-3">
                      <div className="flex justify-between font-semibold text-base">
                        <span className="text-gray-900">Total</span>
                        <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clear Cart Button */}
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  Clear Cart
                </Button>
              </div>

              {/* Place Order Button */}
              <div className="space-y-4">
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || !user || cart.length === 0}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 h-auto rounded-xl shadow-lg"
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : (
                    `Place Order • $${calculateTotal().toFixed(2)}`
                  )}
                </Button>
                
                {user && (
                  <div className="text-center text-sm text-gray-600">
                    Available Credits: ${user.credits.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}