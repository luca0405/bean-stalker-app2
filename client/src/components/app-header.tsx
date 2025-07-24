import * as React from "react";
import { Logo } from "@/components/logo";
import { QRCodeIcon, CartIcon, LogoutIcon } from "@/components/icons";
import { QrCode } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/contexts/cart-context";
import { CartDialog } from "@/components/cart-dialog";

export function AppHeader() {
  const [qrOpen, setQrOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const { logout, user } = useAuth();
  const { cart } = useCart();

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-50" 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998 }}
      >
        <div className="bg-green-800 text-white shadow-lg border-b border-green-600">
          <div className="px-4 py-3" style={{ paddingTop: `calc(12px + env(safe-area-inset-top, 0px))` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Logo className="h-8 w-8 text-white" />
                <div className="flex flex-col">
                  <h1 className="font-bold text-lg leading-tight">Bean Stalker</h1>
                  <p className="text-green-100 text-xs">Premium Coffee Experience</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* QR Code temporarily disabled
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="flex flex-col items-center h-auto w-auto text-green-100 hover:text-white hover:bg-green-800/50 transition-all duration-200" 
                  onClick={() => setQrOpen(true)}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs mt-1">QR</span>
                </Button>
                */}

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="flex flex-col items-center h-auto w-auto relative text-green-100 hover:text-white hover:bg-green-800/50 transition-all duration-200"
                  onClick={() => setCartOpen(true)}
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
          </div>
        </div>
      </header>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QRCodeIcon className="h-5 w-5" />
              Your QR Code
            </DialogTitle>
            <DialogDescription>
              Show this QR code to staff for quick identification and credit transfers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <QRCode />
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Username: {user.username}</p>
            <p className="text-xs text-muted-foreground">
              This QR code contains your username for easy identification.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Dialog */}
      <CartDialog isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}