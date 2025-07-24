import { Trash2, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/cart-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotifications } from "@/hooks/use-native-notifications";

interface FavoriteItemCardProps {
  favorite: {
    id: number;
    menuItemId: number;
    selectedSize: string | null;
    selectedOptions: any;
    customName: string | null;
    createdAt: string;
    menuItem: {
      id: number;
      name: string;
      description: string | null;
      price: number;
      category: string;
      imageUrl: string | null;
      hasSizes: boolean | null;
      mediumPrice: number | null;
      largePrice: number | null;
      hasOptions: boolean | null;
    };
  };
}

export function FavoriteItemCard({ favorite }: FavoriteItemCardProps) {
  const { addToCart } = useCart();
  const { notifySuccess, notifyError } = useNativeNotifications();
  const queryClient = useQueryClient();

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: number) => {
      const response = await apiRequest('DELETE', `/api/favorites/${favoriteId}`);
      if (!response.ok) {
        throw new Error('Failed to remove from favorites');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      notifySuccess("Removed from favorites", "Item has been removed from your favorites.");
    },
    onError: () => {
      notifyError("Error", "Failed to remove item from favorites.");
    }
  });

  const handleAddToCart = () => {
    const displayName = favorite.customName || favorite.menuItem.name;
    
    // Calculate price based on selected size with proper null checking
    let price = favorite.menuItem?.price || 0;
    if (favorite.selectedSize === 'medium' && favorite.menuItem?.mediumPrice) {
      price = favorite.menuItem.mediumPrice;
    } else if (favorite.selectedSize === 'large' && favorite.menuItem?.largePrice) {
      price = favorite.menuItem.largePrice;
    }
    
    // Ensure we have a valid number for cart
    if (isNaN(price) || price === null || price === undefined) {
      price = 0;
    }

    const cartItem = {
      menuItemId: favorite.menuItem.id,
      name: displayName,
      price: price,
      quantity: 1,
      selectedSize: favorite.selectedSize,
      selectedOptions: favorite.selectedOptions,
      imageUrl: favorite.menuItem.imageUrl || undefined
    };

    addToCart(cartItem);
    notifySuccess("Added to cart", `${displayName} has been added to your cart.`);
  };

  const handleRemoveFromFavorites = () => {
    removeFavoriteMutation.mutate(favorite.id);
  };

  const displayName = favorite.customName || favorite.menuItem.name;
  
  // Calculate display price based on selected size with proper null checking
  let displayPrice = favorite.menuItem?.price || 0;
  
  if (favorite.selectedSize === 'medium' && favorite.menuItem?.mediumPrice) {
    displayPrice = favorite.menuItem.mediumPrice;
  } else if (favorite.selectedSize === 'large' && favorite.menuItem?.largePrice) {
    displayPrice = favorite.menuItem.largePrice;
  }
  
  // Ensure we have a valid number for display
  if (isNaN(displayPrice) || displayPrice === null || displayPrice === undefined) {
    displayPrice = 0;
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg leading-tight mb-1">
              {displayName}
            </h3>
            {favorite.customName && (
              <p className="text-sm text-muted-foreground mb-1">
                Original: {favorite.menuItem.name}
              </p>
            )}
            {favorite.menuItem.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {favorite.menuItem.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveFromFavorites}
            disabled={removeFavoriteMutation.isPending}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Heart className="h-4 w-4 fill-current" />
          </Button>
        </div>

        {/* Display selected options */}
        <div className="space-y-2 mb-3">
          {favorite.selectedSize && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Size: {favorite.selectedSize.charAt(0).toUpperCase() + favorite.selectedSize.slice(1)}
              </Badge>
            </div>
          )}
          
          {favorite.selectedOptions && Object.keys(favorite.selectedOptions).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(favorite.selectedOptions).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-primary">
            ${displayPrice.toFixed(2)}
          </span>
          <Button
            onClick={handleAddToCart}
            size="sm"
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          Added {new Date(favorite.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}