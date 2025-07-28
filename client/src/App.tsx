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
import { SplashScreen } from "@/components/splash-screen";
import { DeviceBindingManager } from "@/components/device-binding-manager";

import { useState, useEffect } from 'react';

function Router() {
  const [location] = useLocation();
  
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Native iOS app initialization
        if (Capacitor.isNativePlatform()) {
          // Hide Capacitor's default splash screen since we're using our own
          const { SplashScreen } = await import('@capacitor/splash-screen');
          await SplashScreen.hide();
        }
        
        // App initialization delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsReady(true);
      } catch (error) {
        setAppError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initializeApp();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash && !appError) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appError) {
    return (
      <div className="iphone-fullscreen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center p-4">
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
      <div className="iphone-fullscreen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Bean Stalker...</p>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="iphone-fullscreen">
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <DeviceBindingManager>
                <IAPProvider>
                  <MenuProvider>
                    <CartProvider>
                      <IOSNotificationProvider>
                        <PushNotificationProvider>
                          <AppUpdateProvider>
                            <Router />
                            <Toaster />
                          </AppUpdateProvider>
                        </PushNotificationProvider>
                      </IOSNotificationProvider>
                    </CartProvider>
                  </MenuProvider>
                </IAPProvider>
              </DeviceBindingManager>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </div>
    );
  } catch (renderError) {
    console.error('App: Render error caught:', renderError);
    return (
      <div className="iphone-fullscreen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-red-600 mb-2">Render Error</h1>
          <p className="text-gray-600 mb-4">{renderError instanceof Error ? renderError.message : String(renderError)}</p>
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
