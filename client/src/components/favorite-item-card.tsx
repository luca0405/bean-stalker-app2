import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { MenuItem, CartItemOption } from "@shared/schema";
import { Heart, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotification } from "@/services/native-notification-service";
import { formatCurrency } from "@/lib/utils";

interface FavoriteItemCardProps {
  item: MenuItem & { favoriteId: number; selectedSize?: string; selectedOptions?: CartItemOption[]; customName?: string };
}

export function FavoriteItemCard({ item }: FavoriteItemCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useNativeNotification();

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/favorites/by-id/${item.favoriteId}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', item.id] });
      
      notify({
        title: "Removed from favorites",
        description: `${item.name} has been removed from your favorites.`,
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Failed to remove favorite",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Calculate price based on stored configuration
  const getCalculatedPrice = (): number => {
    let finalPrice = item.price || 0;
    
    // Apply size pricing if stored
    if (item.hasSizes && item.selectedSize) {
      switch (item.selectedSize) {
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
    if (item.selectedOptions) {
      const optionAdjustment = item.selectedOptions.reduce((total, option) => 
        total + (option.priceAdjustment || 0), 0);
      finalPrice += optionAdjustment;
    }
    
    return finalPrice;
  };

  const handleAddToCart = () => {
    const storedSize = item.selectedSize || (item.hasSizes ? "small" : undefined);
    const storedOptions = item.selectedOptions || [];
    
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: getCalculatedPrice(),
      quantity: 1,
      imageUrl: item.imageUrl || undefined,
      size: storedSize,
      options: storedOptions
    });
    
    // Build detailed description
    let message = `Added ${item.name}`;
    if (storedSize) message += ` (${storedSize.charAt(0).toUpperCase() + storedSize.slice(1)})`;
    
    if (storedOptions.length > 0) {
      const optionText = storedOptions.map(opt => opt.value).join(', ');
      message += ` with ${optionText}`;
    }
    
    notify({
      title: "Added to cart",
      description: message
    });
  };

  const handleRemoveFavorite = () => {
    removeFavoriteMutation.mutate();
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-0 bg-white/90 backdrop-blur-sm">
      <div className="h-32 sm:h-36 w-full bg-muted relative overflow-hidden">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-700">
            <span className="text-xs font-medium text-center px-2">No Image Available</span>
          </div>
        )}
        {user && (
          <button 
            onClick={handleRemoveFavorite}
            className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white transition-colors"
            aria-label="Remove from favorites"
          >
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
          </button>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
        
        {/* Show stored configuration */}
        <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
          <p className="text-xs font-medium text-green-800 mb-1">Saved Configuration:</p>
          {item.selectedSize ? (
            <p className="text-xs text-green-700">
              Size: {item.selectedSize.charAt(0).toUpperCase() + item.selectedSize.slice(1)}
            </p>
          ) : item.hasSizes ? (
            <p className="text-xs text-gray-600">Size: Default (Small)</p>
          ) : null}
          
          {item.selectedOptions && item.selectedOptions.length > 0 ? (
            <p className="text-xs text-green-700">
              Options: {item.selectedOptions.map(opt => opt.value).join(', ')}
            </p>
          ) : item.hasOptions ? (
            <p className="text-xs text-gray-600">Options: None selected</p>
          ) : null}
          
          {!item.selectedSize && !item.selectedOptions && !item.hasSizes && !item.hasOptions && (
            <p className="text-xs text-gray-600">No customization options</p>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-green-700 text-sm">
            {formatCurrency(getCalculatedPrice())}
          </span>
          {item.selectedSize && (
            <span className="text-xs text-gray-500">
              {item.selectedSize.charAt(0).toUpperCase() + item.selectedSize.slice(1)}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button 
          onClick={handleAddToCart}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-8"
        >
          <ShoppingCart className="h-3 w-3 mr-1" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}