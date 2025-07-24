import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { MenuItem, MenuItemOption, CartItemOption } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MenuItemCardProps {
  item: MenuItem;
}

// Define a type for options with hierarchical structure
interface OptionWithChildren extends MenuItemOption {
  children?: MenuItemOption[];
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('small');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  
  // Fetch options if the item has options
  const { data: flavorOptions } = useQuery<OptionWithChildren[]>({
    queryKey: ['/api/menu', item.id, 'options'],
    queryFn: async () => {
      if (!item.hasOptions) return [];
      try {
        const res = await apiRequest('GET', `/api/menu/${item.id}/options`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching options:", error);
        return [];
      }
    },
    enabled: !!item.hasOptions // Only run if item has options
  });
  
  // Initialize options container, but don't select anything by default
  useEffect(() => {
    if (flavorOptions && flavorOptions.length > 0) {
      // Only initialize parent options that require a selection (dropdown menus)
      const initialOptions: Record<string, string> = {};
      
      // Do not set initial values for any options - user must explicitly select everything
      // This applies to both parent options and standalone flavor options
      
      // Add a "Flavor" key for standalone flavor options, but don't select any by default
      if (flavorOptions.filter(opt => !opt.isParent && !opt.parentId).length > 0) {
        initialOptions["Flavor"] = ""; // Empty string means no selection
      }
      
      setSelectedOptions(initialOptions);
    }
  }, [flavorOptions]);
  

  
  // Get all selected options with their price adjustments
  const getSelectedOptionsWithPrices = (): CartItemOption[] => {
    if (!flavorOptions || flavorOptions.length === 0) return [];
    
    const result: CartItemOption[] = [];
    
    // Process parent-child selections
    flavorOptions.forEach(option => {
      if (option.isParent && option.children) {
        // Get the selected child option for this parent
        const selectedChildName = selectedOptions[option.name];
        if (selectedChildName) {
          const selectedChild = option.children.find(child => child.name === selectedChildName);
          if (selectedChild) {
            result.push({
              name: option.name, // Parent name as category
              value: selectedChild.name, // Child name as value
              priceAdjustment: selectedChild.priceAdjustment || 0
            });
          }
        }
      } else if (!option.parentId && !option.isParent) {
        // Handle standard flavor options (using the "Flavor" key now)
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
  
  // Calculate total price adjustment from all selected options
  const getTotalOptionPriceAdjustment = (): number => {
    const selectedOptionsList = getSelectedOptionsWithPrices();
    return selectedOptionsList.reduce((total, opt) => total + opt.priceAdjustment, 0);
  };
  
  // Get the price based on selected size and all options
  const getPrice = (): number => {
    let basePrice = item.price;
    
    // Apply size pricing if applicable
    if (item.hasSizes) {
      switch (selectedSize) {
        case 'small': basePrice = item.price; break;
        case 'medium': basePrice = item.mediumPrice || item.price * 1.25; break;
        case 'large': basePrice = item.largePrice || item.price * 1.5; break;
      }
    }
    
    // Add all option price adjustments
    const optionAdjustments = getTotalOptionPriceAdjustment();
    
    return basePrice + optionAdjustments;
  };
  
  const handleAddToCart = () => {
    // Get all selected options
    const optionsList = getSelectedOptionsWithPrices();
    
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: getPrice(),
      quantity: 1,
      imageUrl: item.imageUrl || undefined,
      size: item.hasSizes ? selectedSize : undefined,
      options: optionsList
    });
    
    // Cart context will handle the notification, so no need to notify here
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
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-green-700 text-sm">
            ${getPrice().toFixed(2)}
          </span>
          {item.hasSizes && (
            <span className="text-xs text-gray-500">
              {selectedSize.charAt(0).toUpperCase() + selectedSize.slice(1)}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col p-3 pt-0 gap-2">
        {item.hasSizes && (
          <div className="w-full">
            <Select 
              value={selectedSize}
              onValueChange={(value) => setSelectedSize(value as 'small' | 'medium' | 'large')}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small - ${item.price.toFixed(2)}</SelectItem>
                <SelectItem value="medium">Medium - ${(item.mediumPrice || item.price * 1.25).toFixed(2)}</SelectItem>
                <SelectItem value="large">Large - ${(item.largePrice || item.price * 1.5).toFixed(2)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {item.hasOptions && flavorOptions && flavorOptions.length > 0 && (
          <div className="w-full space-y-2">
            {/* Parent options with children (like "Milk Alternatives") */}
            {flavorOptions.filter(opt => opt.isParent && opt.children && opt.children.length > 0).map((parentOption) => (
              <div key={parentOption.id}>
                <Select 
                  value={selectedOptions[parentOption.name] || ''} 
                  onValueChange={(value) => {
                    setSelectedOptions(prev => ({
                      ...prev,
                      [parentOption.name]: value
                    }));
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder={`${parentOption.name} (Optional)`} />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOption.children?.map((childOption) => (
                      <SelectItem key={childOption.id} value={childOption.name}>
                        {childOption.name}
                        {typeof childOption.priceAdjustment === 'number' && childOption.priceAdjustment > 0 && 
                          ` +$${childOption.priceAdjustment.toFixed(2)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            
            {/* Standard flavor options */}
            {flavorOptions.filter(opt => !opt.isParent && !opt.parentId).length > 0 && (
              <div>
                <Select 
                  value={selectedOptions["Flavor"] || ''} 
                  onValueChange={(value) => {
                    setSelectedOptions(prev => ({
                      ...prev,
                      "Flavor": value
                    }));
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Choose Flavor (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {flavorOptions
                      .filter(opt => !opt.isParent && !opt.parentId)
                      .map((option) => (
                        <SelectItem key={option.id} value={option.name}>
                          {option.name}
                          {typeof option.priceAdjustment === 'number' && option.priceAdjustment > 0 && 
                            ` +$${option.priceAdjustment.toFixed(2)}`}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        
        <Button 
          onClick={handleAddToCart} 
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs py-2 h-8 rounded-md shadow-sm"
          disabled={false}
        >
          Add ${getPrice().toFixed(2)}
        </Button>
      </CardFooter>
    </Card>
  );
}
