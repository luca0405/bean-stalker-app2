import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page-mobile";
import HomePage from "@/pages/home-page";
import MenuPage from "@/pages/menu-page";
import OrdersPage from "@/pages/orders-page";
import CartPage from "@/pages/cart-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import FavoritesPage from "@/pages/favorites-page";
import KitchenDisplayPage from "@/pages/kitchen-display";
import MembershipPage from "@/pages/membership-page";
import SendCreditsPage from "@/pages/send-credits-page";
import AdminCreditVerification from "@/pages/admin-credit-verification";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { MenuProvider } from "@/contexts/menu-context";
import { CartProvider } from "@/contexts/cart-context";
import { PushNotificationProvider } from "@/contexts/push-notification-context";
import { IOSNotificationProvider } from "@/contexts/ios-notification-context";
import { AppUpdateProvider } from "@/contexts/app-update-context";
import { IAPProvider } from "@/hooks/use-iap";
import { Capacitor } from '@capacitor/core';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileDebugDisplay } from "@/components/mobile-debug-display";
import { useState, useEffect } from 'react';

function Router() {
  const [location] = useLocation();
  console.log('Router rendering, current location:', location);
  
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/menu" component={MenuPage} />
      <ProtectedRoute path="/cart" component={CartPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/membership" component={MembershipPage} />
      <ProtectedRoute path="/favorites" component={FavoritesPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/admin/credit-verification" component={AdminCreditVerification} />
      <ProtectedRoute path="/kitchen" component={KitchenDisplayPage} />
      <ProtectedRoute path="/send-credits" component={SendCreditsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [appError, setAppError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Log platform information for debugging
        console.log('Bean Stalker App initializing...', {
          platform: Capacitor.getPlatform(),
          isNative: Capacitor.isNativePlatform(),
          userAgent: navigator.userAgent,
          online: navigator.onLine
        });

        // Wait for Capacitor to be ready on mobile
        if (Capacitor.isNativePlatform()) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Test server connectivity
          console.log('Testing server connectivity...');
          try {
            const response = await fetch('https://member.beanstalker.com.au/api/menu', {
              method: 'GET',
              credentials: 'include',
              signal: AbortSignal.timeout(10000)
            });
            console.log('Server connectivity test:', response.ok ? 'SUCCESS' : 'FAILED', response.status);
            if (!response.ok) {
              console.log('Response headers:', Object.fromEntries(response.headers.entries()));
              const responseText = await response.text();
              console.log('Response body:', responseText.substring(0, 200));
            }
          } catch (connError) {
            console.error('Server connectivity test failed:', connError.message);
            console.error('Connection error details:', {
              name: connError.name,
              stack: connError.stack,
              online: navigator.onLine
            });
            // Don't fail app initialization due to connectivity issues
          }
        }
        
        console.log('Bean Stalker App ready - About to render components');
        setIsReady(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setAppError(error.message);
      }
    };

    initializeApp();
  }, []);

  if (appError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white text-center max-w-md">
          <h1 className="text-xl font-bold mb-4">App Error</h1>
          <p className="mb-4">{appError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Bean Stalker...</p>
        </div>
      </div>
    );
  }

  try {
    console.log('App: Starting component render');
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <IAPProvider>
              <MenuProvider>
                <CartProvider>
                  <IOSNotificationProvider>
                    <PushNotificationProvider>
                      <AppUpdateProvider>
                        <Router />
                        <Toaster />
                        <MobileDebugDisplay />
                      </AppUpdateProvider>
                    </PushNotificationProvider>
                  </IOSNotificationProvider>
                </CartProvider>
              </MenuProvider>
            </IAPProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (renderError) {
    console.error('App: Render error caught:', renderError);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-red-600 mb-2">Render Error</h1>
          <p className="text-gray-600 mb-4">{renderError.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Restart App
          </button>
        </div>
      </div>
    );
  }
}

export default App;
