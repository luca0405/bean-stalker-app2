import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { iapService, IAPProduct, PurchaseResult } from '@/services/iap-service';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface IAPContextType {
  isInitialized: boolean;
  products: IAPProduct[];
  isLoading: boolean;
  purchaseProduct: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<boolean>;
  isAvailable: boolean;
}

const IAPContext = createContext<IAPContextType | null>(null);

export function IAPProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    initializeIAP();
  }, []);

  useEffect(() => {
    if (user && isInitialized) {
      console.log('IAP Hook: Setting user ID for RevenueCat:', user.id.toString());
      iapService.setUserID(user.id.toString());
    }
  }, [user, isInitialized]);

  const initializeIAP = async () => {
    setIsLoading(true);
    try {
      const initialized = await iapService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        const availableProducts = await iapService.getAvailableProducts();
        setProducts(availableProducts);
      }
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseProduct = async (productId: string): Promise<PurchaseResult> => {
    if (!isInitialized) {
      toast({
        title: "Purchase Error",
        description: "Payment system not available",
        variant: "destructive",
      });
      return { success: false, productId, error: "Not initialized" };
    }

    setIsLoading(true);
    
    try {
      const result = await iapService.purchaseProduct(productId);
      
      if (result.success) {
        // Verify purchase with backend
        await verifyPurchase(result);
        
        toast({
          title: "Purchase Successful",
          description: "Your purchase has been completed successfully!",
        });
      } else {
        if (result.error !== 'Purchase cancelled by user') {
          toast({
            title: "Purchase Failed",
            description: result.error || "An error occurred during purchase",
            variant: "destructive",
          });
        }
      }
      
      return result;
    } catch (error: any) {
      toast({
        title: "Purchase Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return { 
        success: false, 
        productId, 
        error: error.message || "Unexpected error" 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPurchase = async (purchaseResult: PurchaseResult) => {
    try {
      const response = await apiRequest('POST', '/api/iap/verify-purchase', {
        productId: purchaseResult.productId,
        transactionId: purchaseResult.transactionId,
        receipt: purchaseResult.receipt,
        platform: 'ios' // Will be detected automatically
      });

      if (response.ok) {
        // Refresh user data to get updated credits/membership
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to verify purchase:', error);
      toast({
        title: "Verification Error",
        description: "Purchase successful but verification failed. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!isInitialized) return false;
    
    setIsLoading(true);
    try {
      const success = await iapService.restorePurchases();
      
      if (success) {
        toast({
          title: "Purchases Restored",
          description: "Your previous purchases have been restored successfully!",
        });
      } else {
        toast({
          title: "Restore Failed",
          description: "No previous purchases found to restore",
          variant: "destructive",
        });
      }
      
      return success;
    } catch (error: any) {
      toast({
        title: "Restore Error", 
        description: error.message || "Failed to restore purchases",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IAPContext.Provider
      value={{
        isInitialized,
        products,
        isLoading,
        purchaseProduct,
        restorePurchases,
        isAvailable: iapService.isAvailable(),
      }}
    >
      {children}
    </IAPContext.Provider>
  );
}

export function useIAP() {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error('useIAP must be used within an IAPProvider');
  }
  return context;
}