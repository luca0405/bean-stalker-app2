import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MenuItem, CartItemOption } from "@shared/schema";
import { Loader2, ShoppingCart } from "lucide-react";
import { FavoriteItemCard } from "./favorite-item-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useNativeNotification } from "@/services/native-notification-service";
import { useCart } from "@/contexts/cart-context";

export function FavoritesList() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { notify } = useNativeNotification();

  const { data: favorites, isLoading, error } = useQuery<(MenuItem & { favoriteId: number; selectedSize?: string; selectedOptions?: CartItemOption[]; customName?: string })[]>({
    queryKey: ['/api/favorites'],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiRequest('GET', '/api/favorites');
      return await res.json();
    },
    enabled: !!user
  });
  
  // Function to add all favorites to cart
  const addAllToCart = () => {
    if (!favorites || favorites.length === 0) {
      notify({
        title: "No items to add",
        description: "You don't have any favorites to add to cart.",
        variant: "destructive",
      });
      return;
    }
    
    // Add each favorite item to cart with stored configurations
    favorites.forEach(item => {
      // Use stored size if available, otherwise default to small
      const storedSize = item.selectedSize || (item.hasSizes ? "small" : undefined);
      const storedOptions = item.selectedOptions || [];
      
      // Calculate price based on stored configuration
      let finalPrice = item.price || 0;
      if (item.hasSizes && storedSize) {
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
      
      const cartItem = {
        menuItemId: item.id,
        name: item.name,
        price: finalPrice,
        quantity: 1,
        imageUrl: item.imageUrl || undefined,
        size: storedSize,
        options: storedOptions
      };
      
      addToCart(cartItem);
    });
    
    notify({
      title: "Added to cart",
      description: `${favorites.length} items added to your cart.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load favorites. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
        <p className="text-muted-foreground mb-4">
          You haven't added any items to your favorites.
        </p>
        <Link href="/menu">
          <a className="text-primary hover:underline">Browse the menu</a>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{favorites.length} Favorite Item{favorites.length !== 1 ? 's' : ''}</h2>
        <Button 
          onClick={addAllToCart}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Add All to Cart</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
        {favorites.map((item) => (
          <FavoriteItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}