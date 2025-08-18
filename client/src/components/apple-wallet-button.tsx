/**
 * Apple Wallet Integration Button Component
 * Allows users to add/update their credit balance pass in Apple Wallet
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, Apple } from 'lucide-react';
import { AppleWalletService } from '@/services/apple-wallet-service';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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
  
  // Only show on iOS devices
  const isIOS = Capacitor.getPlatform() === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (!isIOS) {
    return null; // Hide on non-iOS devices
  }
  
  const handleAddToWallet = async () => {
    setIsLoading(true);
    
    try {
      console.log('🍎 NATIVE: Starting Apple Wallet process...');
      console.log('🍎 NATIVE: User ID:', userId, 'Username:', username, 'Balance:', currentBalance);
      
      const result = await AppleWalletService.updateCreditPass(userId, username, currentBalance);
      
      if (result.success) {
        console.log('🍎 NATIVE: Apple Wallet pass added successfully');
        
        // Send native notification for success
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Added to Apple Wallet",
              body: `Your $${currentBalance.toFixed(2)} credit balance has been added to Apple Wallet`,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) }
            }
          ]
        });
      } else {
        console.error('🍎 NATIVE: Apple Wallet service returned error:', result.error);
        
        // Send native notification for error
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Unable to Add to Wallet",
              body: `Error: ${result.error || "Failed to add pass"}`,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) }
            }
          ]
        });
      }
      
    } catch (error: any) {
      console.error('🍎 NATIVE: Apple Wallet button error:', error);
      console.error('🍎 NATIVE: Error type:', typeof error);
      console.error('🍎 NATIVE: Error message:', error.message);
      console.error('🍎 NATIVE: Error stack:', error.stack);
      
      // Send native notification for error
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Apple Wallet Error",
            body: `Native error: ${error.message || 'Unknown error occurred'}`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) }
          }
        ]
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
  
  const isIOS = Capacitor.getPlatform() === 'ios' || /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (!isIOS) return null;
  
  const handleAddToWallet = async () => {
    setIsLoading(true);
    
    try {
      const result = await AppleWalletService.updateCreditPass(userId, username, currentBalance);
      
      if (result.success) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Added to Apple Wallet",
              body: "Credit balance pass added successfully",
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) }
            }
          ]
        });
      } else {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Unable to Add to Wallet",
              body: result.error || "Failed to add pass",
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) }
            }
          ]
        });
      }
    } catch (error) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Wallet Error",
            body: "Could not add pass to Apple Wallet",
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) }
          }
        ]
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