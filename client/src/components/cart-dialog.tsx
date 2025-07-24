import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotifications } from "@/hooks/use-native-notifications";

interface CartDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDialog({ isOpen, onClose }: CartDialogProps) {
  const { 
    cart, 
    removeFromCart, 
    updateCartItemQuantity, 
    clearCart, 
    calculateSubtotal, 
    calculateTotal 
  } = useCart();
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNativeNotifications();
  const [isProcessing, setIsProcessing] = useState(false);

  const serviceFee = 0;
  const total = calculateTotal() + serviceFee;

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      const orderData = {
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          size: item.size || null,
          options: item.options || []
        })),
        total: calculateTotal()
      };
      
      const response = await apiRequest('POST', '/api/orders', orderData);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to place order');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      notifySuccess("Order placed!", `Your order #${data?.id || 'N/A'} has been placed successfully.`);
      clearCart();
      onClose();
    },
    onError: (error: Error) => {
      notifyError("Order failed", error.message || "Failed to place order. Please try again.");
    }
  });

  const handlePlaceOrder = async () => {
    if (!user) {
      notifyError("Login required", "Please log in to place an order.");
      return;
    }

    if (cart.length === 0) {
      notifyError("Empty cart", "Please add items to your cart before placing an order.");
      return;
    }

    if (calculateTotal() > (user.credits || 0)) {
      notifyError("Insufficient credits", "You don't have enough credits to place this order.");
      return;
    }

    setIsProcessing(true);
    try {
      await placeOrderMutation.mutateAsync();
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
      removeFromCart(item.menuItemId, item.size, undefined, item.options);
    } else {
      updateCartItemQuantity(item.menuItemId, newQuantity, item.size, undefined, item.options);
    }
  };

  const handleRemoveItem = (item: any) => {
    removeFromCart(item.menuItemId, item.size, undefined, item.options);
  };

  if (!isOpen) return null;

  return (
    <div className="popup-container">
      <div className="popup-content">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="popup-header flex items-center space-x-4"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 h-auto"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <ShoppingCart className="h-6 w-6" />
              Your Cart
            </h1>
          </motion.div>

          <div className="scroll-container momentum-scroll"
               style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {cart.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Looks like you haven't added any items to your cart yet.</p>
              <Button 
                onClick={onClose}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                Browse Menu
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.map((item, index) => (
                  <motion.div
                    key={`${item.menuItemId}-${item.size}-${JSON.stringify(item.options)}`}
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
                            
                            {/* Size and Options */}
                            <div className="space-y-1">
                              {item.size && (
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
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-green-600">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || placeOrderMutation.isPending || !user || total > (user.credits || 0)}
                    className="w-full mt-4 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold relative"
                  >
                    {isProcessing || placeOrderMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing Order...
                      </div>
                    ) : !user ? (
                      "Please Login"
                    ) : total > (user.credits || 0) ? (
                      "Insufficient Credits"
                    ) : (
                      `Place Order • $${calculateSubtotal().toFixed(2)}`
                    )}
                  </Button>
                  
                  {user && (
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Your balance: ${user.credits?.toFixed(2) || '0.00'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}