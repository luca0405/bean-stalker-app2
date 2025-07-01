import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface CartSuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  itemName?: string;
}

export function CartSuccessAnimation({ 
  isVisible, 
  onComplete, 
  itemName 
}: CartSuccessAnimationProps) {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShowCheck(true);
      }, 500);

      const completeTimer = setTimeout(() => {
        onComplete();
        setShowCheck(false);
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(completeTimer);
      };
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -50 }}
          transition={{ 
            type: "spring",
            duration: 0.6,
            bounce: 0.4
          }}
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-green-600 text-white px-6 py-4 rounded-full shadow-lg flex items-center space-x-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
              className="relative"
            >
              <ShoppingBag className="h-6 w-6" />
              <AnimatePresence>
                {showCheck && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1 bg-white text-green-600 rounded-full p-1"
                  >
                    <Check className="h-3 w-3" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="font-semibold text-sm">
                {itemName ? `${itemName} added!` : "Item added to cart!"}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}