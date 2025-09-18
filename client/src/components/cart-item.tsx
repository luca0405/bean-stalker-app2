import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { CartItem, CartItemOption } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { getMobileCompatibleImageUrl } from "@/utils/mobile-image-utils";

interface CartItemCardProps {
  item: CartItem;
}

export function CartItemCard({ item }: CartItemCardProps) {
  const { updateCartItemQuantity, removeFromCart } = useCart();
  const [isRemoving, setIsRemoving] = useState(false);
  
  const handleIncrement = () => {
    updateCartItemQuantity(
      item.menuItemId, 
      item.quantity + 1, 
      item.size, 
      item.option, 
      item.options,
      item.variationId
    );
  };
  
  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateCartItemQuantity(
        item.menuItemId, 
        item.quantity - 1, 
        item.size, 
        item.option, 
        item.options,
        item.variationId
      );
    } else {
      handleRemove();
    }
  };
  
  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      removeFromCart(
        item.menuItemId, 
        item.size, 
        item.option, 
        item.options,
        item.variationId
      );
    }, 300);
  };
  
  // Group options by category/name for display
  const groupedOptions = (item.options || []).reduce<Record<string, string[]>>((acc, option) => {
    if (!acc[option.name]) {
      acc[option.name] = [];
    }
    acc[option.name].push(option.value);
    return acc;
  }, {});

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isRemoving ? 0 : 1, 
        x: isRemoving ? -100 : 0,
        height: isRemoving ? 0 : "auto"
      }}
      exit={{ opacity: 0, x: -100, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="border-b last:border-b-0 overflow-hidden"
    >
      <div className="flex py-4 px-1">
        {/* Item Image */}
        <motion.div 
          className="h-16 w-16 bg-gradient-to-br from-green-50 to-green-100 rounded-xl overflow-hidden mr-4 flex items-center justify-center shadow-sm"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          {item.imageUrl ? (
            <img 
              src={getMobileCompatibleImageUrl(item.imageUrl)} 
              alt={item.name} 
              className="h-full w-full object-cover" 
            />
          ) : (
            <span className="text-green-600 font-semibold text-lg">
              {item.name[0]}
            </span>
          )}
        </motion.div>
        
        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                {item.name}
              </h3>
              
              {/* Variation and Size */}
              <div className="flex flex-col gap-1 mt-1">
                {item.variationName && (
                  <div className="text-xs text-green-600 font-medium">
                    {item.variationName}
                  </div>
                )}
                {item.size && !item.variationName && (
                  <div className="text-xs text-green-600 font-medium">
                    {item.size === 'small' ? 'Small' : item.size === 'medium' ? 'Medium' : 'Large'}
                  </div>
                )}
                
                {/* Legacy option field support */}
                {item.option && !item.options && (
                  <Badge variant="secondary" className="text-xs w-fit">
                    {item.option}
                  </Badge>
                )}
                
                {/* Display hierarchical options */}
                {item.options && item.options.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(groupedOptions).map(([category, values], index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {category !== values[0] ? `${values[0]} ${category}` : values[0]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Price */}
            <div className="text-right">
              <div className="font-bold text-green-600 text-base">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
              {item.quantity > 1 && (
                <div className="text-xs text-gray-500">
                  ${item.price.toFixed(2)} each
                </div>
              )}
            </div>
          </div>
          
          {/* Quantity Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center bg-gray-50 rounded-full p-1">
              <motion.div
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-gray-200 transition-colors"
                  onClick={handleDecrement}
                >
                  <Minus className="h-3 w-3" />
                </Button>
              </motion.div>
              
              <motion.span 
                key={item.quantity}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="mx-3 font-semibold text-gray-900 min-w-[20px] text-center"
              >
                {item.quantity}
              </motion.span>
              
              <motion.div
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-gray-200 transition-colors"
                  onClick={handleIncrement}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </motion.div>
            </div>
            
            {/* Remove Button */}
            <motion.div
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full transition-colors"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
