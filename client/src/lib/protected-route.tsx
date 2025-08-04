import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { BottomNav } from "@/components/bottom-nav";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  console.log('ProtectedRoute:', { path, user: !!user, isLoading });

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
            <p className="text-green-800 font-medium">Loading...</p>
          </div>
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log('No user, redirecting to /auth');
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if user is on auth page and prevent redirect during payment processing
  if (path === "/" && window.location.pathname === "/auth") {
    const isProcessingPayment = sessionStorage.getItem('payment-processing') === 'true';
    if (isProcessingPayment) {
      console.log('Payment processing active, staying on auth page');
      return (
        <Route path="/">
          <Redirect to="/auth" />
        </Route>
      );
    }
  }

  return (
    <Route path={path}>
      <div className="min-h-screen pb-24">
        <Component />
        <BottomNav />
      </div>
    </Route>
  );
}
