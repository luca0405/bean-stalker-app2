import * as React from "react";
import { Logo } from "@/components/logo";
import { QRCodeIcon, CartIcon, LogoutIcon, MailboxIcon } from "@/components/icons";
import { Crown, QrCode, ShoppingBag, Trash2, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QRCode } from "@/components/qr-code";
import { CartItemCard } from "@/components/cart-item";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/contexts/cart-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

export function AppHeader() {
  const [qrOpen, setQrOpen] = React.useState(false);
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const { cart, calculateSubtotal, calculateTax, calculateTotal, clearCart, isCartOpen, setIsCartOpen } = useCart();

  const handleLogout = async () => {
    await logout();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalAmount = calculateTotal();
      const orderItems = cart.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      await apiRequest("POST", "/api/orders", {
        items: orderItems,
        total: totalAmount,
        status: "pending"
      });

      toast({
        title: "Order placed successfully",
        description: `Total: $${totalAmount.toFixed(2)}`,
      });

      clearCart();
      setIsCartOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } catch (error) {
      console.error("Checkout error:", error);
      
      // Handle specific authentication errors
      if (error instanceof Error && error.message.includes('401')) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to place your order",
          variant: "destructive",
        });
        // Redirect to auth page or trigger re-authentication
        window.location.href = '/auth';
        return;
      }
      
      toast({
        title: "Failed to place order",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // No need for local tax calculation functions as we now have them from the cart context

  return (
    <>
      <header className="bg-gradient-to-r from-green-900 via-green-800 to-green-900 shadow-lg pt-safe sticky top-0 z-50 border-b border-green-700/20">
        <div className="flex justify-between items-center px-6 py-4 mt-2">
          <div className="flex items-center space-x-4">
            <Logo />
            <div className="hidden md:block h-6 w-px bg-green-600/30"></div>
            <span className="hidden md:inline-block text-green-100/80 text-sm font-medium">Premium Coffee Experience</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex flex-col items-center h-auto w-auto text-green-100 hover:text-white hover:bg-green-800/50 transition-all duration-200" 
              onClick={() => setQrOpen(true)}
            >
              <QrCode className="w-5 h-5" />
              <span className="text-xs mt-1">QR</span>
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="flex flex-col items-center h-auto w-auto relative text-green-100 hover:text-white hover:bg-green-800/50 transition-all duration-200" 
              onClick={() => setIsCartOpen(true)}
            >
              <CartIcon className="" />
              <span className="text-xs mt-1">Cart</span>
              {cart.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </div>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex flex-col items-center h-auto w-auto text-green-100 hover:text-white hover:bg-green-800/50 transition-all duration-200" 
              onClick={handleLogout}
            >
              <LogoutIcon className="" />
              <span className="text-xs mt-1">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-primary">Your QR Code</DialogTitle>
            <DialogDescription className="text-center">
              Scan this code to identify your account in-store
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-100 p-3 rounded-lg mb-4">
            <QRCode />
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Cart Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-t-lg"
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <ShoppingBag className="h-6 w-6" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-semibold">Your Cart</h2>
                  <p className="text-green-100 text-sm">
                    {cart.length === 0 ? "Ready for your order" : `${cart.length} item${cart.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-white hover:bg-green-800/50 h-8"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
          
          {/* Cart Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 flex flex-col items-center justify-center py-12 px-6"
              >
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-4"
                >
                  <ShoppingBag className="h-10 w-10 text-green-600" />
                </motion.div>
                <h3 className="font-semibold text-xl text-gray-800 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 text-center leading-relaxed">
                  Browse our delicious menu and add items to get started with your order.
                </p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6"
                >
                  <Button 
                    onClick={() => setIsCartOpen(false)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Browse Menu
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {cart.map((item, index) => (
                      <motion.div
                        key={`${item.menuItemId}-${item.size}-${item.option}-${JSON.stringify(item.options)}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ 
                          duration: 0.3,
                          delay: index * 0.05
                        }}
                        layout
                      >
                        <CartItemCard item={item} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* Cart Summary */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="border-t bg-gray-50 p-4 space-y-4"
                >
                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal ({cart.reduce((total, item) => total + item.quantity, 0)} items)</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Service Fee</span>
                      <span>Free</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg text-gray-900">Total</span>
                      <motion.span 
                        key={calculateTotal()}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="font-bold text-xl text-green-600"
                      >
                        ${calculateTotal().toFixed(2)}
                      </motion.span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base shadow-lg"
                        onClick={handleCheckout}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Place Order
                      </Button>
                    </motion.div>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full text-gray-600 hover:text-gray-800"
                      onClick={() => setIsCartOpen(false)}
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
