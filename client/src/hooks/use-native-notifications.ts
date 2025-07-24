import { useCallback } from 'react';
import { nativeNotification } from '@/services/native-notification-service';

// Custom hook to use native notifications instead of toast
export function useNativeNotifications() {
  // Success notification
  const notifySuccess = useCallback((title: string, message: string = '', options?: { duration?: number; onClick?: () => void }) => {
    nativeNotification.success(title, message, options);
  }, []);
  
  // Error notification
  const notifyError = useCallback((title: string, message: string = '', options?: { duration?: number; onClick?: () => void }) => {
    nativeNotification.error(title, message, options);
  }, []);
  
  // Warning notification
  const notifyWarning = useCallback((title: string, message: string = '', options?: { duration?: number; onClick?: () => void }) => {
    nativeNotification.warning(title, message, options);
  }, []);
  
  // Info notification
  const notifyInfo = useCallback((title: string, message: string = '', options?: { duration?: number; onClick?: () => void }) => {
    nativeNotification.info(title, message, options);
  }, []);
  
  // Generic notification
  const notify = useCallback((options: {
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClick?: () => void;
  }) => {
    nativeNotification.showNotification(options);
  }, []);
  
  return {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notify
  };
}