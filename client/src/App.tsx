import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page-mobile";
import HomePage from "@/pages/home-page";
import MenuPage from "@/pages/menu-page";
import OrdersPage from "@/pages/orders-page";
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

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/menu" component={MenuPage} />
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
  return (
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
                  </AppUpdateProvider>
                </PushNotificationProvider>
              </IOSNotificationProvider>
            </CartProvider>
          </MenuProvider>
        </IAPProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
