import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Portal } from "@/components/portal";
import { X, Heart, Minus, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuItem, MenuItemOption, CartItemOption } from "@shared/schema";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotification } from "@/services/native-notification-service";
import { getMobileCompatibleImageUrl } from "@/utils/mobile-image-utils";

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
  const { notify } = useNativeNotification();
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('small');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  // Debug logging
  useEffect(() => {
    if (isOpen && item) {
      console.log('ProductDetailModal item data:', {
        name: item.name,
        imageUrl: item.imageUrl,
        squareId: item.squareId,
        id: item.id,
        price: item.price,
        hasOptions: item.hasOptions,
        hasSizes: item.hasSizes
      });
    }
  }, [isOpen, item]);

  // Fetch options if the item has options - with better error handling
  const { data: flavorOptions } = useQuery<OptionWithChildren[]>({
    queryKey: ['/api/menu', item?.id || item?.squareId, 'options'],
    queryFn: async () => {
      if (!item?.hasOptions) return [];
      try {
        // Use Square ID if database ID is null (Square items)
        const itemId = item.squareId || item.id;
        const res = await apiRequest('GET', `/api/menu/${itemId}/options`);
        if (!res.ok) {
          console.log(`Options API returned ${res.status}, using empty options`);
          return [];
        }
        return await res.json();
      } catch (error) {
        console.log("Options API error (using empty options):", error);
        return [];
      }
    },
    enabled: !!item?.hasOptions,
    retry: false,
    staleTime: 5 * 60 * 1000
  });

  // Fetch favorite status - with robust error handling
  const { data: favoriteStatus } = useQuery({
    queryKey: ['/api/favorites', item?.id || item?.squareId],
    queryFn: async () => {
      if (!user || !item) return { isFavorite: false };
      try {
        // Use Square ID if database ID is null (Square items)
        const itemId = item.squareId || item.id;
        const res = await apiRequest('GET', `/api/favorites/${itemId}`);
        if (!res.ok) {
          console.log(`Favorites API returned ${res.status}, treating as not favorite`);
          return { isFavorite: false };
        }
        return await res.json();
      } catch (error) {
        console.log('Favorites API error (treating as not favorite):', error);
        return { isFavorite: false }; // Always return fallback data
      }
    },
    enabled: !!user && !!item,
    retry: false, // Don't retry failed requests
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
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
      const selectedOptionsList = getSelectedOptionsWithPrices();
      const favoriteData = {
        menuItemId: item.squareId || item.id, // Use Square ID for Square items
        selectedSize: item.hasSizes ? selectedSize : null,
        selectedOptions: selectedOptionsList.length > 0 ? selectedOptionsList : null
      };
      const res = await apiRequest('POST', '/api/favorites', favoriteData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', item?.squareId || item?.id] });
      notify({
        title: "Added to favorites",
        description: `${item?.name} has been added to your favorites.`,
      });
    }
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const itemId = item.squareId || item.id; // Use Square ID for Square items
      const res = await apiRequest('DELETE', `/api/favorites/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', item?.squareId || item?.id] });
      notify({
        title: "Removed from favorites",
        description: `${item?.name} has been removed from your favorites.`,
      });
    }
  });

  // Get all selected options with their price adjustments
  const getSelectedOptionsWithPrices = (): CartItemOption[] => {
    if (!flavorOptions || flavorOptions.length === 0) return [];
    
    const result: CartItemOption[] = [];
    
    // Process all selected options from the selectedOptions state
    Object.entries(selectedOptions).forEach(([key, value]) => {
      if (value && value !== "") {
        // Find the option details
        if (key === "Flavor") {
          // Handle standalone flavor options
          const option = flavorOptions.find(opt => opt.name === value && !opt.isParent && !opt.parentId);
          if (option) {
            result.push({
              name: "Flavor",
              value: option.name,
              priceAdjustment: option.priceAdjustment || 0
            });
          }
        } else {
          // Handle parent-child selections
          const parentOption = flavorOptions.find(opt => opt.name === key && opt.isParent);
          if (parentOption && parentOption.children) {
            const childOption = parentOption.children.find(child => child.name === value);
            if (childOption) {
              result.push({
                name: key, // Parent name as category
                value: value, // Child name as value
                priceAdjustment: childOption.priceAdjustment || 0
              });
            }
          }
        }
      }
    });
    
    return result;
  };

  const toggleFavorite = () => {
    if (!user) {
      notify({
        title: "Login required",
        description: "Please log in to add items to favorites.",
        variant: "destructive",
      });
      return;
    }

    if (favoriteStatus?.isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
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
        menuItemId: item.squareId || item.id?.toString() || '',
        name: item.name,
        price: getPrice(),
        quantity: 1,
        imageUrl: item.imageUrl || undefined,
        size: item.hasSizes ? selectedSize : undefined,
        options: optionsList
      });
    }
    
    let message = `Added ${quantity}x ${item.name}`;
    if (item.hasSizes) message += ` (${selectedSize})`;
    
    if (optionsList.length > 0) {
      const optionText = optionsList.map(opt => `${opt.value}`).join(', ');
      message += ` with ${optionText}`;
    }
    
    notify({
      title: "Added to cart",
      description: message
    });
    
    onClose();
  };

  if (!item) {
    console.log('ProductDetailModal: No item provided, returning null');
    return null;
  }

  console.log('ProductDetailModal: Rendering modal with item:', {
    name: item.name,
    description: item.description,
    price: item.price,
    id: item.id,
    category: item.category
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div className="popup-container">
            <div className="popup-content">
              <div className="max-w-md mx-auto space-y-6">
                {/* Header */}
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="popup-header flex items-center space-x-4"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="p-2 h-auto"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h1 className="text-2xl font-bold text-slate-800">Product Details</h1>
                </motion.div>

                <div className="scroll-container momentum-scroll">

                  {/* Content */}
                  <div className="p-6 space-y-6 pb-24">
              {/* Product Image and Info */}
              <div className="relative z-0 mb-6">
                <div className="aspect-video w-full bg-gray-100 rounded-2xl overflow-hidden mb-6">
                  <img 
                    src={getMobileCompatibleImageUrl(item.imageUrl, item.category)} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const isCapacitor = !!(window as any).Capacitor;
                      console.log(`Failed to load image for ${item.name}`);
                      
                      // For native apps, fallback to appropriate category icon
                      if (isCapacitor && !item.imageUrl?.startsWith('data:')) {
                        const fallbackIcon = item.category?.includes('breakfast') || item.category?.includes('lunch') 
                          ? getMobileCompatibleImageUrl(null, 'breakfast')
                          : getMobileCompatibleImageUrl(null, 'coffee');
                        (e.target as HTMLImageElement).src = fallbackIcon;
                        return;
                      }
                      
                      // Hide the broken image and show fallback
                      (e.target as HTMLImageElement).style.display = 'none';
                      const imgElement = e.target as HTMLImageElement;
                      if (imgElement.parentElement) {
                        const fallback = imgElement.parentElement.querySelector('.image-fallback');
                        if (fallback) {
                          (fallback as HTMLElement).style.display = 'flex';
                        }
                      }
                    }}
                    onLoad={() => {
                      console.log(`Successfully loaded image for ${item.name}`);
                    }}
                  />
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-700 image-fallback ${item.imageUrl ? 'hidden' : ''}`}
                  >
                    <span className="text-lg font-medium text-center px-3">
                      {item.imageUrl ? 'Image Loading...' : 'No Image Available'}
                    </span>
                  </div>
                </div>

                {/* Heart Icon */}
                {user && (
                  <button 
                    onClick={toggleFavorite}
                    className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
                  >
                    <Heart 
                      className={`h-5 w-5 ${favoriteStatus?.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} 
                    />
                  </button>
                )}

              </div>

              {/* Product Title and Details - Fixed positioning */}
              <div className="relative z-10 bg-white p-6 rounded-lg shadow-lg border-2 border-green-100 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{item.name || "Product Name"}</h2>
                <p className="text-gray-600 text-base mb-4 leading-relaxed">
                  {item.description || "No description available"}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-3xl font-bold text-green-600">
                    ${getPrice().toFixed(2)}
                  </span>
                  {(item.hasSizes || item.hasOptions) && (
                    <span className="text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                      Customizable
                    </span>
                  )}
                </div>
              </div>

              {/* Size Selection */}
              {item.hasSizes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Choose Size</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <RadioGroup value={selectedSize} onValueChange={(value) => setSelectedSize(value as 'small' | 'medium' | 'large')}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="small" id="small" />
                        <Label htmlFor="small" className="flex-1">
                          <div className="flex justify-between">
                            <span>Small</span>
                            <span className="font-semibold">${item.price.toFixed(2)}</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium" className="flex-1">
                          <div className="flex justify-between">
                            <span>Medium</span>
                            <span className="font-semibold">${(item.mediumPrice || item.price * 1.25).toFixed(2)}</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <RadioGroupItem value="large" id="large" />
                        <Label htmlFor="large" className="flex-1">
                          <div className="flex justify-between">
                            <span>Large</span>
                            <span className="font-semibold">${(item.largePrice || item.price * 1.5).toFixed(2)}</span>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
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
                        <select 
                          value={selectedOptions[parentOption.name] || ''} 
                          onChange={(e) => {
                            setSelectedOptions(prev => ({
                              ...prev,
                              [parentOption.name]: e.target.value
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">{`Choose ${parentOption.name}`}</option>
                          {parentOption.children?.map((childOption) => (
                            <option key={childOption.id} value={childOption.name}>
                              {childOption.name}
                              {typeof childOption.priceAdjustment === 'number' && childOption.priceAdjustment > 0 && 
                                ` +$${childOption.priceAdjustment.toFixed(2)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    
                    {/* Standard flavor options */}
                    {flavorOptions.filter(opt => !opt.isParent && !opt.parentId).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Flavor (Optional)
                        </Label>
                        <select 
                          value={selectedOptions["Flavor"] || ''} 
                          onChange={(e) => {
                            setSelectedOptions(prev => ({
                              ...prev,
                              "Flavor": e.target.value
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Choose Flavor</option>
                          {flavorOptions
                            .filter(opt => !opt.isParent && !opt.parentId)
                            .map((option) => (
                              <option key={option.id} value={option.name}>
                                {option.name}
                                {typeof option.priceAdjustment === 'number' && option.priceAdjustment > 0 && 
                                  ` +$${option.priceAdjustment.toFixed(2)}`}
                              </option>
                            ))
                          }
                        </select>
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

                  </div> {/* Close scroll-container content */}

                  {/* Sticky Footer with Actions */}
                  <div className="space-y-3 pt-6">
              {/* Add to Favorites Button */}
              {user && (
                <Button 
                  onClick={toggleFavorite}
                  variant="outline"
                  className={`w-full py-3 h-auto rounded-xl border-2 transition-all ${
                    favoriteStatus?.isFavorite 
                      ? 'border-red-500 text-red-500 hover:bg-red-50' 
                      : 'border-green-600 text-green-600 hover:bg-green-50'
                  }`}
                  disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                >
                  <Heart className={`h-5 w-5 mr-2 ${favoriteStatus?.isFavorite ? 'fill-current' : ''}`} />
                  {favoriteStatus?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Button>
              )}
              
              {/* Add to Cart Button */}
              <Button 
                onClick={handleAddToCart} 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 h-auto rounded-xl shadow-lg"
              >
                Add to Cart • ${(getPrice() * quantity).toFixed(2)}
              </Button>
                  </div>
                </div> {/* Close scroll-container */}
              </div> {/* Close max-w-md */}
            </div> {/* Close popup-content */}
          </div> {/* Close popup-container */}
        </Portal>
      )}
    </AnimatePresence>
  );
}