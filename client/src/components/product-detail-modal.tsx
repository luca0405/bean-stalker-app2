import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Portal } from "@/components/portal";
import { X, Heart, Minus, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MenuItem, MenuItemOption, CartItemOption, MenuItemVariation } from "@shared/schema";
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

interface SquareModifier {
  id: number;
  squareId: string;
  name: string;
  priceMoney: number; // Price in cents
  displayOrder?: number;
}

interface SquareModifierList {
  id: number;
  squareId: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  minSelections: number;
  maxSelections?: number;
  displayOrder?: number;
  modifiers: SquareModifier[];
}

interface OptionWithChildren extends MenuItemOption {
  children?: MenuItemOption[];
}

export function ProductDetailModal({ item, isOpen, onClose }: ProductDetailModalProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useNativeNotification();
  const [selectedVariation, setSelectedVariation] = useState<MenuItemVariation | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
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

  // Fetch Square modifiers for ALL Square items (ignore hasOptions flag)
  const { data: modifierLists } = useQuery<SquareModifierList[]>({
    queryKey: ['/api/menu', item?.squareId || item?.id, 'modifiers'],
    queryFn: async () => {
      if (!item?.squareId) return []; // Only fetch for Square items
      try {
        const itemId = item.squareId || item.id;
        const res = await apiRequest('GET', `/api/menu/${itemId}/modifiers`);
        if (!res.ok) {
          console.log(`Modifiers API returned ${res.status}, using empty modifiers`);
          return [];
        }
        return await res.json();
      } catch (error) {
        console.log("Modifiers API error (using empty modifiers):", error);
        return [];
      }
    },
    enabled: !!item?.squareId, // Fetch for ALL Square items
    retry: false,
    staleTime: 5 * 60 * 1000
  });

  // Fetch variations/options for all items (including Square items)
  const { data: flavorOptions } = useQuery<OptionWithChildren[]>({
    queryKey: ['/api/menu', item?.id || item?.squareId, 'options'],
    queryFn: async () => {
      if (!item) return []; // Always fetch if item exists
      try {
        const itemId = item.squareId || item.id; // Use Square ID for Square items
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
    enabled: !!item, // Fetch for ALL items
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

  // Convert size options to variations format with ABSOLUTE pricing
  const variations = useMemo(() => {
    return flavorOptions?.filter(opt => (opt as any).category === 'size').map(opt => ({
      id: opt.id.toString(),
      name: opt.name,
      price: (opt as any).price || (opt as any).priceModifier || (opt.priceAdjustmentCents || 0) / 100 + (item?.price || 0), // Convert cents to dollars and add base price
      squarePrice: 0, // Not used for display
      isDefault: (opt as any).isDefault || false // Use Square's isDefault
    })) || [];
  }, [flavorOptions, item?.price]);
  
  // Reset state when modal opens/closes or item changes
  useEffect(() => {
    if (isOpen && item) {
      // Set default variation (first one or null if no variations)
      const defaultVariation = variations.find(v => v.isDefault) || variations[0] || null;
      setSelectedVariation(defaultVariation);
      setQuantity(1);
      
      // Initialize modifier selections
      if (modifierLists && modifierLists.length > 0) {
        const initialModifiers: Record<string, string[]> = {};
        modifierLists.forEach(list => {
          initialModifiers[list.squareId] = [];
        });
        setSelectedModifiers(initialModifiers);
      } else {
        setSelectedModifiers({});
      }
      
      // Initialize legacy options for non-Square database items only
      if (flavorOptions && flavorOptions.length > 0 && !item.squareId) {
        const initialOptions: Record<string, string> = {};
        
        // Add a "Flavor" key for standalone flavor options (excluding size options)
        const nonSizeOptions = flavorOptions.filter(opt => opt.optionType !== 'size' && !opt.isParent && !opt.parentId);
        if (nonSizeOptions.length > 0) {
          initialOptions["Flavor"] = "";
        }
        
        setSelectedOptions(initialOptions);
      } else {
        setSelectedOptions({});
      }
    }
  }, [isOpen, item, flavorOptions, modifierLists]);

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const selectedOptionsList = getAllSelectedOptions();
      const favoriteData = {
        menuItemId: item.squareId || item.id, // Use Square ID for Square items
        selectedSize: selectedVariation?.name || null, // Use variation name as size
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

  // Get all selected modifiers with their price adjustments
  const getSelectedModifiersWithPrices = (): CartItemOption[] => {
    if (!modifierLists || modifierLists.length === 0) return [];
    
    const result: CartItemOption[] = [];
    
    Object.entries(selectedModifiers).forEach(([listSquareId, modifierIds]) => {
      const modifierList = modifierLists.find(list => list.squareId === listSquareId);
      if (!modifierList) return;
      
      modifierIds.forEach(modifierId => {
        const modifier = modifierList.modifiers.find(mod => mod.squareId === modifierId);
        if (modifier) {
          result.push({
            name: modifierList.name,
            value: modifier.name,
            priceAdjustmentCents: modifier.priceMoney
          });
        }
      });
    });
    
    return result;
  };

  // Get all selected options with their price adjustments (legacy)
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
              priceAdjustmentCents: option.priceAdjustmentCents || 0
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
                priceAdjustmentCents: childOption.priceAdjustmentCents || 0
              });
            }
          }
        }
      }
    });
    
    return result;
  };

  // Get combined options (modifiers + legacy options)
  const getAllSelectedOptions = (): CartItemOption[] => {
    const modifierOptions = getSelectedModifiersWithPrices();
    const legacyOptions = getSelectedOptionsWithPrices();
    return [...modifierOptions, ...legacyOptions];
  };

  // Handle modifier selection change
  const handleModifierChange = (listSquareId: string, modifierSquareId: string, isSelected: boolean) => {
    setSelectedModifiers(prev => {
      const currentSelections = prev[listSquareId] || [];
      
      if (isSelected) {
        // Add the modifier if not already selected
        if (!currentSelections.includes(modifierSquareId)) {
          return {
            ...prev,
            [listSquareId]: [...currentSelections, modifierSquareId]
          };
        }
      } else {
        // Remove the modifier
        return {
          ...prev,
          [listSquareId]: currentSelections.filter(id => id !== modifierSquareId)
        };
      }
      
      return prev;
    });
  };

  // Handle single selection modifier change (radio button style)
  const handleSingleModifierChange = (listSquareId: string, modifierSquareId: string) => {
    setSelectedModifiers(prev => ({
      ...prev,
      [listSquareId]: [modifierSquareId]
    }));
  };

  // Validation logic for Add to Cart
  const canAddToCart = (): boolean => {
    if (!modifierLists || modifierLists.length === 0) return true;
    
    return modifierLists.every(list => {
      const selectedCount = selectedModifiers[list.squareId]?.length || 0;
      const minRequired = list.minSelections > 0 ? list.minSelections : 0;
      const maxAllowed = (list.maxSelections && list.maxSelections > 0) ? list.maxSelections : Infinity;
      
      return selectedCount >= minRequired && selectedCount <= maxAllowed;
    });
  };

  const getValidationMessage = (): string => {
    if (!modifierLists || modifierLists.length === 0) return "Add to Cart";
    
    for (const list of modifierLists) {
      const selectedCount = selectedModifiers[list.squareId]?.length || 0;
      const minRequired = list.minSelections > 0 ? list.minSelections : 0;
      
      if (selectedCount < minRequired) {
        return `Select ${minRequired - selectedCount} more from ${list.name}`;
      }
    }
    
    return "Add to Cart";
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
    const selectedOptionsList = getAllSelectedOptions();
    return selectedOptionsList.reduce((total, opt) => total + (opt.priceAdjustmentCents || 0) / 100, 0);
  };

  const getPrice = (): number => {
    if (!item) return 0;
    
    // For Square items: Use absolute variation price, or fall back to item.price
    // For database items: Use item.price + adjustments
    let basePrice: number;
    if (item.squareId && selectedVariation) {
      // Square item with variation - use absolute price
      basePrice = selectedVariation.price;
    } else {
      // Database item or Square item without variation
      basePrice = item.price || 0;
    }
    
    // Add modifier price adjustments (these are still relative)
    const modifierAdjustments = getSelectedModifiersWithPrices().reduce((total, opt) => total + (opt.priceAdjustmentCents || 0) / 100, 0);
    
    // Add legacy option adjustments (for database items)
    const legacyAdjustments = item.squareId ? 0 : getSelectedOptionsWithPrices().reduce((total, opt) => total + (opt.priceAdjustmentCents || 0) / 100, 0);
    
    return basePrice + modifierAdjustments + legacyAdjustments;
  };

  const handleAddToCart = () => {
    if (!item) return;
    
    const optionsList = getAllSelectedOptions();
    
    for (let i = 0; i < quantity; i++) {
      addToCart({
        menuItemId: item.squareId || item.id?.toString() || '',
        name: item.name,
        price: getPrice(),
        quantity: 1,
        imageUrl: item.imageUrl || undefined,
        // Use new variation system instead of hardcoded sizes
        variationId: selectedVariation?.id,
        variationName: selectedVariation?.name,
        // Keep legacy size field for backwards compatibility
        size: selectedVariation?.name?.toLowerCase().includes('small') ? 'small' :
              selectedVariation?.name?.toLowerCase().includes('medium') ? 'medium' :
              selectedVariation?.name?.toLowerCase().includes('large') ? 'large' : undefined,
        options: optionsList
      });
    }
    
    let message = `Added ${quantity}x ${item.name}`;
    if (selectedVariation) message += ` (${selectedVariation.name})`;
    
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
              <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto space-y-6">
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
                  {(variations.length > 0 || (modifierLists && modifierLists.length > 0)) && (
                    <span className="text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                      Customizable
                    </span>
                  )}
                </div>
              </div>

              {/* Variation Selection - Use actual Square variations */}
              {variations.length > 0 && (
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4 bg-gray-50/50">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="h-5 w-5 bg-green-600 rounded-full mr-3 flex items-center justify-center">
                        <span className="h-2 w-2 bg-white rounded-full"></span>
                      </span>
                      Choose Your Size
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-2">
                      Select your preferred size - pricing varies by selection
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <RadioGroup 
                      value={selectedVariation?.id || ''} 
                      onValueChange={(value) => {
                        const variation = variations.find((v: MenuItemVariation) => v.id === value);
                        setSelectedVariation(variation || null);
                      }}
                      className="space-y-3"
                    >
                      {variations.map((variation: MenuItemVariation) => (
                        <div key={variation.id} className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-all duration-200 group">
                          <RadioGroupItem 
                            value={variation.id} 
                            id={variation.id}
                            className="border-gray-300 text-green-600"
                          />
                          <Label htmlFor={variation.id} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900 group-hover:text-green-900 transition-colors">
                                {variation.name}
                              </span>
                              <span className="text-lg font-bold text-green-600 bg-green-50 px-3 py-1 rounded-md">
                                ${variation.price.toFixed(2)}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Square Modifiers Selection - Show for all Square items with modifiers */}
              {modifierLists && modifierLists.length > 0 && (
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="pb-4 bg-gray-50/50">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="h-5 w-5 bg-green-600 rounded-full mr-3 flex items-center justify-center">
                        <span className="h-2 w-2 bg-white rounded-full"></span>
                      </span>
                      Customize Your Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-8">
                    {modifierLists.map((modifierList, index) => (
                      <div key={modifierList.squareId} className={`${index > 0 ? 'border-t border-gray-100 pt-6' : ''}`}>
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-medium text-gray-900 tracking-tight">
                              {modifierList.name.replace(/^BS\s+/, '')}
                            </h3>
                            {modifierList.minSelections > 0 && (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                                {modifierList.selectionType === 'SINGLE' ? 'Required' : `Min: ${modifierList.minSelections}`}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {modifierList.selectionType === 'SINGLE' 
                              ? 'Choose one option' 
                              : `Select ${modifierList.maxSelections ? `up to ${modifierList.maxSelections}` : 'multiple'} options`}
                          </p>
                        </div>
                        
                        {modifierList.selectionType === 'SINGLE' ? (
                          // Radio button style for single selection
                          <RadioGroup
                            value={selectedModifiers[modifierList.squareId]?.[0] || ""}
                            onValueChange={(value) => handleSingleModifierChange(modifierList.squareId, value)}
                            className="space-y-3"
                          >
                            {modifierList.modifiers.map(modifier => (
                              <div key={modifier.squareId} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-all duration-200 group">
                                <RadioGroupItem 
                                  value={modifier.squareId} 
                                  id={`modifier-${modifier.squareId}`}
                                  className="border-gray-300 text-green-600"
                                  data-testid={`radio-${modifierList.name.toLowerCase()}-${modifier.name.toLowerCase()}`}
                                />
                                <Label 
                                  htmlFor={`modifier-${modifier.squareId}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 group-hover:text-green-900 transition-colors">
                                      {modifier.name}
                                    </span>
                                    {modifier.priceMoney > 0 && (
                                      <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                        +${(modifier.priceMoney / 100).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        ) : (
                          // Checkbox style for multiple selection
                          <div className="space-y-3">
                            {modifierList.modifiers.map(modifier => (
                              <div key={modifier.squareId} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-all duration-200 group">
                                <Checkbox
                                  id={`modifier-${modifier.squareId}`}
                                  checked={selectedModifiers[modifierList.squareId]?.includes(modifier.squareId) || false}
                                  onCheckedChange={(checked) => 
                                    handleModifierChange(modifierList.squareId, modifier.squareId, checked as boolean)
                                  }
                                  className="border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                  data-testid={`checkbox-${modifierList.name.toLowerCase()}-${modifier.name.toLowerCase()}`}
                                />
                                <Label 
                                  htmlFor={`modifier-${modifier.squareId}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900 group-hover:text-green-900 transition-colors">
                                      {modifier.name}
                                    </span>
                                    {modifier.priceMoney > 0 && (
                                      <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                                        +${(modifier.priceMoney / 100).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Empty state for items marked as customizable but with no modifier data */}
              {item.hasOptions && (!modifierLists || modifierLists.length === 0) && (!flavorOptions || flavorOptions.length === 0) && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600 text-center">
                      This item is marked as customizable, but no customization options are currently available.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Legacy Options Selection DISABLED for Square items */}
              {!item.squareId && item.hasOptions && flavorOptions && flavorOptions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Options</CardTitle>
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
                              {typeof childOption.priceAdjustmentCents === 'number' && childOption.priceAdjustmentCents > 0 && 
                                ` +$${(childOption.priceAdjustmentCents / 100).toFixed(2)}`}
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
                                {typeof option.priceAdjustmentCents === 'number' && option.priceAdjustmentCents > 0 && 
                                  ` +$${(option.priceAdjustmentCents / 100).toFixed(2)}`}
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
              
              {/* Add to Cart Button with validation */}
              <Button 
                onClick={handleAddToCart} 
                disabled={!canAddToCart()}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 h-auto rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canAddToCart() ? `Add to Cart • $${(getPrice() * quantity).toFixed(2)}` : getValidationMessage()}
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