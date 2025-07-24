import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuItem, MenuItemOption, CartItemOption } from "@shared/schema";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotifications } from "@/hooks/use-native-notifications";

interface ProductDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface OptionWithChildren extends MenuItemOption {
  children?: MenuItemOption[];
}

export function ProductDetailModal({ item, isOpen, onClose }: ProductDetailModalProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notifySuccess, notifyError } = useNativeNotifications();
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('small');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  // Fetch options if the item has options
  const { data: flavorOptions } = useQuery<OptionWithChildren[]>({
    queryKey: ['/api/menu', item?.id, 'options'],
    queryFn: async () => {
      if (!item?.hasOptions) return [];
      try {
        const res = await apiRequest('GET', `/api/menu/${item.id}/options`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching options:", error);
        return [];
      }
    },
    enabled: !!item?.hasOptions
  });

  // Fetch favorite status
  const { data: favoriteStatus } = useQuery({
    queryKey: ['/api/favorites', item?.id],
    queryFn: async () => {
      if (!user || !item) return { isFavorite: false };
      try {
        const res = await apiRequest('GET', `/api/favorites/${item.id}`);
        return await res.json();
      } catch (error) {
        return { isFavorite: false };
      }
    },
    enabled: !!user && !!item
  });

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('No item selected');
      
      const response = await apiRequest('POST', '/api/favorites', {
        menuItemId: item.id,
        selectedSize: item.hasSizes ? selectedSize : null,
        selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : null,
        customName: null // Could be extended to allow custom names
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to favorites');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', item?.id] });
      notifySuccess("Added to favorites", "Item has been saved to your favorites with selected options.");
    },
    onError: (error: any) => {
      notifyError("Error", error.message || "Failed to add item to favorites.");
    }
  });

  // Reset state when modal opens/closes or item changes
  useEffect(() => {
    if (isOpen && item) {
      setSelectedSize('small');
      setQuantity(1);
      
      if (flavorOptions && flavorOptions.length > 0) {
        const initialOptions: Record<string, string> = {};
        
        // Add a "Flavor" key for standalone flavor options, but don't select any by default
        if (flavorOptions.filter(opt => !opt.isParent && !opt.parentId).length > 0) {
          initialOptions["Flavor"] = "";
        }
        
        setSelectedOptions(initialOptions);
      } else {
        setSelectedOptions({});
      }
    }
  }, [isOpen, item, flavorOptions]);

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const res = await apiRequest('POST', '/api/favorites', { menuItemId: item.id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', item?.id] });
      notifySuccess("Added to favorites", `${item?.name} has been added to your favorites.`);
    }
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const res = await apiRequest('DELETE', `/api/favorites/${item.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', item?.id] });
      notifySuccess("Removed from favorites", `${item?.name} has been removed from your favorites.`);
    }
  });

  const toggleFavorite = () => {
    if (!user) {
      notifyError("Login required", "Please log in to add items to favorites.");
      return;
    }

    if (favoriteStatus?.isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const getSelectedOptionsWithPrices = (): CartItemOption[] => {
    if (!flavorOptions || flavorOptions.length === 0) return [];
    
    const result: CartItemOption[] = [];
    
    flavorOptions.forEach(option => {
      if (option.isParent && option.children) {
        const selectedChildName = selectedOptions[option.name];
        if (selectedChildName) {
          const selectedChild = option.children.find(child => child.name === selectedChildName);
          if (selectedChild) {
            result.push({
              name: option.name,
              value: selectedChild.name,
              priceAdjustment: selectedChild.priceAdjustment || 0
            });
          }
        }
      } else if (!option.parentId && !option.isParent) {
        if (selectedOptions["Flavor"] === option.name) {
          result.push({
            name: "Flavor",
            value: option.name,
            priceAdjustment: option.priceAdjustment || 0
          });
        }
      }
    });
    
    return result;
  };

  const getTotalOptionPriceAdjustment = (): number => {
    const selectedOptionsList = getSelectedOptionsWithPrices();
    return selectedOptionsList.reduce((total, opt) => total + opt.priceAdjustment, 0);
  };

  const getPrice = (): number => {
    if (!item) return 0;
    
    let basePrice = item.price;
    
    if (item.hasSizes) {
      switch (selectedSize) {
        case 'small': basePrice = item.price; break;
        case 'medium': basePrice = item.mediumPrice || item.price * 1.25; break;
        case 'large': basePrice = item.largePrice || item.price * 1.5; break;
      }
    }
    
    const optionAdjustments = getTotalOptionPriceAdjustment();
    return basePrice + optionAdjustments;
  };

  const handleAddToCart = () => {
    if (!item) return;
    
    const optionsList = getSelectedOptionsWithPrices();
    
    for (let i = 0; i < quantity; i++) {
      addToCart({
        menuItemId: item.id,
        name: item.name,
        price: getPrice(),
        quantity: 1,
        imageUrl: item.imageUrl || undefined,
        size: item.hasSizes ? selectedSize : undefined,
        options: optionsList
      });
    }
    
    // Cart context will handle the notification, so no need to notify here
    
    onClose();
  };

  const handleSaveToFavorites = () => {
    if (!user) {
      notifyError("Login required", "Please log in to save favorites.");
      return;
    }
    
    addToFavoritesMutation.mutate();
  };

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-end justify-center product-detail-modal" style={{ zIndex: 10000 }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 product-modal-overlay"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto product-modal-content"
            style={{ zIndex: 10001 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 p-4 flex justify-between items-center rounded-t-3xl z-10">
              <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 h-auto"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 pb-24">
              {/* Product Image and Info */}
              <div className="relative z-0">
                <div className="aspect-video w-full bg-gray-100 rounded-2xl overflow-hidden mb-4">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-700">
                      <span className="text-lg font-medium">No Image Available</span>
                    </div>
                  )}
                </div>

                {/* Heart Icon */}
                {user && (
                  <button 
                    onClick={handleSaveToFavorites}
                    disabled={addToFavoritesMutation.isPending}
                    className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <Heart 
                      className={`h-5 w-5 text-red-500 hover:fill-red-500 transition-colors`} 
                    />
                  </button>
                )}

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">
                      ${getPrice().toFixed(2)}
                    </span>
                    {(item.hasSizes || item.hasOptions) && (
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        Customizable
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Size Selection */}
              {item.hasSizes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Choose Size</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <input 
                          type="radio" 
                          id="small" 
                          name="size" 
                          value="small" 
                          checked={selectedSize === 'small'}
                          onChange={(e) => setSelectedSize(e.target.value as 'small' | 'medium' | 'large')}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
                        />
                        <Label htmlFor="small" className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span>Small</span>
                            <span className="font-semibold">${item.price.toFixed(2)}</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <input 
                          type="radio" 
                          id="medium" 
                          name="size" 
                          value="medium" 
                          checked={selectedSize === 'medium'}
                          onChange={(e) => setSelectedSize(e.target.value as 'small' | 'medium' | 'large')}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
                        />
                        <Label htmlFor="medium" className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span>Medium</span>
                            <span className="font-semibold">${(item.mediumPrice || item.price * 1.25).toFixed(2)}</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <input 
                          type="radio" 
                          id="large" 
                          name="size" 
                          value="large" 
                          checked={selectedSize === 'large'}
                          onChange={(e) => setSelectedSize(e.target.value as 'small' | 'medium' | 'large')}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 focus:ring-2"
                        />
                        <Label htmlFor="large" className="flex-1 cursor-pointer">
                          <div className="flex justify-between">
                            <span>Large</span>
                            <span className="font-semibold">${(item.largePrice || item.price * 1.5).toFixed(2)}</span>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Options Selection */}
              {item.hasOptions && flavorOptions && flavorOptions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customize Your Order</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {/* Parent options with children */}
                    {flavorOptions.filter(opt => opt.isParent && opt.children && opt.children.length > 0).map((parentOption) => (
                      <div key={parentOption.id}>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          {parentOption.name} (Optional)
                        </Label>
                        <div className="relative">
                          <select 
                            value={selectedOptions[parentOption.name] || ''} 
                            onChange={(e) => {
                              setSelectedOptions(prev => ({
                                ...prev,
                                [parentOption.name]: e.target.value
                              }));
                            }}
                            className="w-full h-11 px-3 pr-10 bg-white border border-gray-200 rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">{`Choose ${parentOption.name}`}</option>
                            {parentOption.children?.map((childOption) => (
                              <option key={childOption.id} value={childOption.name}>
                                {childOption.name}{typeof childOption.priceAdjustment === 'number' && childOption.priceAdjustment > 0 && ` +$${childOption.priceAdjustment.toFixed(2)}`}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                    
                    {/* Standard flavor options */}
                    {flavorOptions.filter(opt => !opt.isParent && !opt.parentId).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Flavor (Optional)
                        </Label>
                        <div className="relative">
                          <select 
                            value={selectedOptions["Flavor"] || ''} 
                            onChange={(e) => {
                              setSelectedOptions(prev => ({
                                ...prev,
                                "Flavor": e.target.value
                              }));
                            }}
                            className="w-full h-11 px-3 pr-10 bg-white border border-gray-200 rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">Choose Flavor</option>
                            {flavorOptions
                              .filter(opt => !opt.isParent && !opt.parentId)
                              .map((option) => (
                                <option key={option.id} value={option.name}>
                                  {option.name}{typeof option.priceAdjustment === 'number' && option.priceAdjustment > 0 && ` +$${option.priceAdjustment.toFixed(2)}`}
                                </option>
                              ))
                            }
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Quantity Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quantity</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">How many would you like?</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold text-lg w-8 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Sticky Footer with Add to Cart and Save to Favorites */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-6 z-10 space-y-3">
              <Button 
                onClick={handleAddToCart} 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 h-auto rounded-xl shadow-lg"
              >
                Add to Cart • ${(getPrice() * quantity).toFixed(2)}
              </Button>
              
              {user && (
                <Button 
                  onClick={handleSaveToFavorites}
                  disabled={addToFavoritesMutation.isPending}
                  variant="outline"
                  className="w-full py-2 h-auto rounded-xl border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {addToFavoritesMutation.isPending ? 'Saving...' : 'Save to Favorites'}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}