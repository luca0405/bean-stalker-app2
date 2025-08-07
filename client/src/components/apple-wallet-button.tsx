/**
 * Apple Wallet Integration Button Component
 * Allows users to add/update their credit balance pass in Apple Wallet
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, Apple } from 'lucide-react';
import { AppleWalletService } from '@/services/apple-wallet-service';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface AppleWalletButtonProps {
  userId: number;
  username: string;
  currentBalance: number;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function AppleWalletButton({ 
  userId, 
  username, 
  currentBalance, 
  variant = 'outline',
  size = 'default',
  className = ''
}: AppleWalletButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Only show on iOS devices
  const isIOS = Capacitor.getPlatform() === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (!isIOS) {
    return null; // Hide on non-iOS devices
  }
  
  const handleAddToWallet = async () => {
    setIsLoading(true);
    
    try {
      console.log('🍎 Adding Bean Stalker credits to Apple Wallet...');
      
      const result = await AppleWalletService.updateCreditPass(userId, username, currentBalance);
      
      if (result.success) {
        toast({
          title: "Added to Apple Wallet",
          description: `Your $${currentBalance.toFixed(2)} credit balance has been added to Apple Wallet`,
        });
      } else {
        toast({
          title: "Unable to Add to Wallet",
          description: result.error || "Failed to add pass to Apple Wallet",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('Apple Wallet error:', error);
      toast({
        title: "Wallet Error",
        description: "Could not add pass to Apple Wallet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleAddToWallet}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Apple className="h-4 w-4" />
      )}
      {isLoading ? 'Adding to Wallet...' : 'Add to Apple Wallet'}
    </Button>
  );
}

/**
 * Compact version for use in card headers or tight spaces
 */
export function AppleWalletIconButton({ userId, username, currentBalance }: Pick<AppleWalletButtonProps, 'userId' | 'username' | 'currentBalance'>) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const isIOS = Capacitor.getPlatform() === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (!isIOS) return null;
  
  const handleAddToWallet = async () => {
    setIsLoading(true);
    
    try {
      const result = await AppleWalletService.updateCreditPass(userId, username, currentBalance);
      
      if (result.success) {
        toast({
          title: "Added to Apple Wallet",
          description: "Credit balance pass added successfully",
        });
      } else {
        toast({
          title: "Unable to Add to Wallet",
          description: result.error || "Failed to add pass",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Wallet Error", 
        description: "Could not add pass to Apple Wallet",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleAddToWallet}
      disabled={isLoading}
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Apple className="h-4 w-4" />
      )}
    </Button>
  );
}