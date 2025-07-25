import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { CartItem, CartItemOption } from "@shared/schema";
import { useNativeNotification } from "@/services/native-notification-service";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (menuItemId: number, size?: string, option?: string, options?: CartItemOption[]) => void;
  updateCartItemQuantity: (menuItemId: number, quantity: number, size?: string, option?: string, options?: CartItemOption[]) => void;
  clearCart: () => void;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  calculateTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper function to check if two arrays of options are equal
function areOptionsEqual(options1?: CartItemOption[], options2?: CartItemOption[]): boolean {
  if (!options1 && !options2) return true;
  if (!options1 || !options2) return false;
  if (options1.length !== options2.length) return false;
  
  // Sort both arrays to ensure consistent comparison
  const sortedOptions1 = [...options1].sort((a, b) => a.name.localeCompare(b.name));
  const sortedOptions2 = [...options2].sort((a, b) => a.name.localeCompare(b.name));
  
  // Check each option
  return sortedOptions1.every((opt1, index) => {
    const opt2 = sortedOptions2[index];
    return opt1.name === opt2.name && 
           opt1.value === opt2.value && 
           opt1.priceAdjustment === opt2.priceAdjustment;
  });
}

// Format options for display in toast messages
function formatOptionsForDisplay(options?: CartItemOption[]): string {
  if (!options || options.length === 0) return '';
  
  return options.map(opt => {
    if (opt.name === opt.value) {
      return opt.value;
    } else {
      return `${opt.value} ${opt.name}`;
    }
  }).join(', ');
}

// Cart persistence helper functions
const CART_STORAGE_KEY = "bean-stalker-cart";

const saveCartToStorage = (cart: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.warn("Failed to save cart to localStorage:", error);
  }
};

const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Failed to load cart from localStorage:", error);
    return [];
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { notify } = useNativeNotification();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = loadCartFromStorage();
    if (savedCart.length > 0) {
      setCart(savedCart);
    }
  }, []); // Empty dependency array - only run on mount

  // Save cart to localStorage whenever it changes (but not on initial load)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage(cart);
    } else {
      setIsInitialized(true);
    }
  }, [cart, isInitialized]);

  const addToCart = (newItem: CartItem) => {
    setCart((prevCart) => {
      // Check if the item exists with the same ID, size, and options (if applicable)
      const existingItemIndex = prevCart.findIndex(
        (item) => item.menuItemId === newItem.menuItemId && 
                 ((!item.size && !newItem.size) || item.size === newItem.size) &&
                 // Check legacy option field
                 ((!item.option && !newItem.option) || item.option === newItem.option) &&
                 // Check new options array
                 areOptionsEqual(item.options, newItem.options)
      );

      if (existingItemIndex !== -1) {
        // Item already exists with same properties, update quantity
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + newItem.quantity,
        };
        
        // Create description message
        const sizeLabel = newItem.size ? ` (${newItem.size})` : '';
        const optionsLabel = newItem.options && newItem.options.length > 0 
          ? ` with ${formatOptionsForDisplay(newItem.options)}` 
          : newItem.option 
            ? ` with ${newItem.option}`
            : '';
            
        notify({
          title: "Cart updated",
          description: `Increased ${newItem.name}${sizeLabel}${optionsLabel} quantity.`,
        });
        
        return updatedCart;
      } else {
        // New item combination, add to cart
        const sizeLabel = newItem.size ? ` (${newItem.size})` : '';
        const optionsLabel = newItem.options && newItem.options.length > 0 
          ? ` with ${formatOptionsForDisplay(newItem.options)}` 
          : newItem.option 
            ? ` with ${newItem.option}`
            : '';
            
        notify({
          title: "Item added to cart",
          description: `${newItem.name}${sizeLabel}${optionsLabel} has been added to your cart.`,
        });
        
        return [...prevCart, newItem];
      }
    });
  };

  const removeFromCart = (menuItemId: number, size?: string, option?: string, options?: CartItemOption[]) => {
    setCart((prevCart) => {
      let updatedCart;
      let removedItem;
      
      if (size || option || (options && options.length > 0)) {
        // If size, option, or options array is provided, remove only matching items
        updatedCart = prevCart.filter(item => {
          const sizeMatches = size ? item.size === size : true;
          const optionMatches = option ? item.option === option : true;
          
          // Check options array match
          const optionsMatch = options && options.length > 0 
            ? areOptionsEqual(item.options || [], options)
            : true;
            
          return !(item.menuItemId === menuItemId && sizeMatches && optionMatches && optionsMatch);
        });
        
        removedItem = prevCart.find(item => {
          const sizeMatches = size ? item.size === size : true;
          const optionMatches = option ? item.option === option : true;
          
          // Check options array match
          const optionsMatch = options && options.length > 0 
            ? areOptionsEqual(item.options || [], options)
            : true;
            
          return item.menuItemId === menuItemId && sizeMatches && optionMatches && optionsMatch;
        });
      } else {
        // If no size, option, or options array provided, remove all items with matching menuItemId
        updatedCart = prevCart.filter(item => item.menuItemId !== menuItemId);
        removedItem = prevCart.find(item => item.menuItemId === menuItemId);
      }
      
      if (removedItem) {
        const sizeLabel = removedItem.size ? ` (${removedItem.size})` : '';
        const optionsLabel = removedItem.options && removedItem.options.length > 0 
          ? ` with ${formatOptionsForDisplay(removedItem.options)}` 
          : removedItem.option 
            ? ` with ${removedItem.option}`
            : '';
            
        notify({
          title: "Item removed",
          description: `${removedItem.name}${sizeLabel}${optionsLabel} has been removed from your cart.`,
        });
      }
      
      return updatedCart;
    });
  };

  const updateCartItemQuantity = (menuItemId: number, quantity: number, size?: string, option?: string, options?: CartItemOption[]) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId, size, option, options);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        // If size, option, or options array is provided, only update matching items
        const sizeMatches = size ? item.size === size : true;
        const optionMatches = option ? item.option === option : true;
        
        // Check options array match
        const optionsMatch = options && options.length > 0 
          ? areOptionsEqual(item.options || [], options)
          : true;
        
        if ((size || option || (options && options.length > 0)) && item.menuItemId === menuItemId) {
          if (sizeMatches && optionMatches && optionsMatch) {
            return { ...item, quantity };
          }
        } else if (!size && !option && (!options || options.length === 0) && item.menuItemId === menuItemId) {
          // If no size, option, or options array provided, update all items with matching ID
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    notify({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  };

  // Calculate subtotal
  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };
  
  // Tax is not calculated in this app
  const calculateTax = () => {
    return 0; // No tax
  };
  
  // Calculate total (same as subtotal since no tax)
  const calculateTotal = () => {
    return calculateSubtotal();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        calculateSubtotal,
        calculateTax,
        calculateTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
