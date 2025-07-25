import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface NotificationOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

class NativeNotificationService {
  private isNative = Capacitor.isNativePlatform();
  private notificationId = 1;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isNative) {
      try {
        // Request permissions for local notifications
        const permissions = await LocalNotifications.requestPermissions();
        console.log('Local notification permissions:', permissions.display);
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
      }
    }
  }

  async showNotification({ title, description, variant = 'default', duration = 5000 }: NotificationOptions) {
    if (this.isNative) {
      try {
        // Show native notification on mobile
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body: description,
              id: this.notificationId++,
              schedule: { at: new Date(Date.now()) },
              sound: variant === 'destructive' ? 'beep.wav' : 'default',
              attachments: [],
              actionTypeId: '',
              extra: {
                variant
              }
            }
          ]
        });
      } catch (error) {
        console.error('Error showing native notification:', error);
        // Fallback to browser notification
        this.showBrowserNotification({ title, description, variant });
      }
    } else {
      // Fallback to browser notification for web
      this.showBrowserNotification({ title, description, variant });
    }
  }

  private showBrowserNotification({ title, description, variant }: NotificationOptions) {
    if ('Notification' in window) {
      // Request permission if not granted
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.createBrowserNotification(title, description, variant);
          }
        });
      } else if (Notification.permission === 'granted') {
        this.createBrowserNotification(title, description, variant);
      }
    }
  }

  private createBrowserNotification(title: string, body: string, variant?: string) {
    const notification = new Notification(title, {
      body,
      icon: '/icon-192x192.png', // App icon
      badge: '/icon-192x192.png',
      tag: 'bean-stalker-notification'
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  // Method to handle success notifications specifically
  async showSuccess(title: string, description: string) {
    await this.showNotification({ title, description, variant: 'success' });
  }

  // Method to handle error notifications specifically
  async showError(title: string, description: string) {
    await this.showNotification({ title, description, variant: 'destructive' });
  }
}

// Create singleton instance
export const nativeNotificationService = new NativeNotificationService();

// Hook for easy usage in components
export function useNativeNotification() {
  return {
    notify: (options: NotificationOptions) => nativeNotificationService.showNotification(options),
    success: (title: string, description: string) => nativeNotificationService.showSuccess(title, description),
    error: (title: string, description: string) => nativeNotificationService.showError(title, description)
  };
}