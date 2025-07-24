import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MenuItem } from "@shared/schema";
import { Loader2, ShoppingCart } from "lucide-react";
import { FavoriteItemCard } from "./favorite-item-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useNativeNotifications } from "@/hooks/use-native-notifications";
import { useCart } from "@/contexts/cart-context";

export function FavoritesList() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { notifySuccess, notifyError } = useNativeNotifications();

  const { data: favoritesWithOptions, isLoading, error } = useQuery({
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
    if (!favoritesWithOptions || favoritesWithOptions.length === 0) {
      notifyError("No items to add", "You don't have any favorites to add to cart.");
      return;
    }
    
    // Add each favorite item to cart with saved options
    favoritesWithOptions.forEach((favorite: any) => {
      const cartItem = {
        menuItemId: favorite.menuItem.id,
        name: favorite.customName || favorite.menuItem.name,
        price: favorite.menuItem.price,
        quantity: 1,
        selectedSize: favorite.selectedSize,
        selectedOptions: favorite.selectedOptions,
        imageUrl: favorite.menuItem.imageUrl
      };
      
      addToCart(cartItem);
    });
    
    notifySuccess("Added to cart", `${favoritesWithOptions.length} items added to your cart.`);
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

  if (!favoritesWithOptions || favoritesWithOptions.length === 0) {
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
        <h2 className="text-xl font-semibold">{favoritesWithOptions.length} Favorite Item{favoritesWithOptions.length !== 1 ? 's' : ''}</h2>
        <Button 
          onClick={addAllToCart}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Add All to Cart</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
        {favoritesWithOptions.map((favorite: any) => (
          <FavoriteItemCard key={favorite.id} favorite={favorite} />
        ))}
      </div>
    </div>
  );
}