// Native browser notification service to replace popup toasts
export class NativeNotificationService {
  private static instance: NativeNotificationService;
  
  private constructor() {}
  
  static getInstance(): NativeNotificationService {
    if (!NativeNotificationService.instance) {
      NativeNotificationService.instance = new NativeNotificationService();
    }
    return NativeNotificationService.instance;
  }
  
  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }
    
    if (Notification.permission === "granted") {
      return true;
    }
    
    if (Notification.permission === "denied") {
      console.warn("Notification permission denied");
      return false;
    }
    
    // Request permission
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  // Show native notification
  async showNotification(options: {
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    icon?: string;
    onClick?: () => void;
  }): Promise<void> {
    const { title, message, type = 'info', duration = 5000, icon, onClick } = options;
    
    // First try native browser notifications
    const hasPermission = await this.requestPermission();
    
    if (hasPermission && document.hidden) {
      // Show native notification when page is not visible
      const notification = new Notification(title, {
        body: message,
        icon: icon || this.getDefaultIcon(type),
        badge: '/favicon.ico',
        tag: `bean-stalker-${Date.now()}`, // Prevent duplicate notifications
        requireInteraction: type === 'error', // Keep error notifications until clicked
      });
      
      if (onClick) {
        notification.onclick = () => {
          onClick();
          notification.close();
          window.focus(); // Focus the app window
        };
      }
      
      // Auto-close after duration
      if (duration > 0) {
        setTimeout(() => {
          notification.close();
        }, duration);
      }
    } else {
      // Fallback to in-page notification when page is visible
      this.showInPageNotification({ title, message, type, duration });
    }
  }
  
  // Get default icon based on notification type
  private getDefaultIcon(type: 'success' | 'error' | 'info' | 'warning'): string {
    const icons = {
      success: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMyMmM1NWUiLz4KPHBhdGggZD0ibTkgMTIgMiAyIDQtNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+',
      error: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNlZjQ0NDQiLz4KPHBhdGggZD0ibTggOCA4IDgiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Im0xNiA4LTggOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+',
      warning: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNmNTk1MDkiLz4KPHBhdGggZD0iTTEyIDh2NCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHBhdGggZD0ibTEyIDE2IC4wMSAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=',
      info: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMzYjgyZjYiLz4KPHBhdGggZD0iTTEyIDEydjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Im0xMiA4IC4wMSAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4='
    };
    return icons[type];
  }
  
  // Fallback in-page notification for when page is visible
  private showInPageNotification(options: {
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration: number;
  }): void {
    const { title, message, type, duration } = options;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[9999] max-w-sm p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-x-full`;
    
    // Style based on type
    const styles = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    
    notification.classList.add(...styles[type].split(' '));
    
    // Add content
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <img src="${this.getDefaultIcon(type)}" alt="${type}" class="w-5 h-5" />
        </div>
        <div class="flex-1">
          <div class="font-medium text-sm">${title}</div>
          ${message ? `<div class="text-sm mt-1 opacity-90">${message}</div>` : ''}
        </div>
        <button class="flex-shrink-0 ml-2 opacity-60 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }, duration);
    }
  }
  
  // Convenience methods for different notification types
  async success(title: string, message: string = '', options: { duration?: number; onClick?: () => void } = {}) {
    return this.showNotification({ 
      title, 
      message, 
      type: 'success', 
      duration: options.duration || 4000,
      onClick: options.onClick 
    });
  }
  
  async error(title: string, message: string = '', options: { duration?: number; onClick?: () => void } = {}) {
    return this.showNotification({ 
      title, 
      message, 
      type: 'error', 
      duration: options.duration || 7000,
      onClick: options.onClick 
    });
  }
  
  async warning(title: string, message: string = '', options: { duration?: number; onClick?: () => void } = {}) {
    return this.showNotification({ 
      title, 
      message, 
      type: 'warning', 
      duration: options.duration || 5000,
      onClick: options.onClick 
    });
  }
  
  async info(title: string, message: string = '', options: { duration?: number; onClick?: () => void } = {}) {
    return this.showNotification({ 
      title, 
      message, 
      type: 'info', 
      duration: options.duration || 4000,
      onClick: options.onClick 
    });
  }
}

// Export singleton instance
export const nativeNotification = NativeNotificationService.getInstance();