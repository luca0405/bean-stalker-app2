import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

interface AppUpdateContextType {
  updateAvailable: boolean;
  installPromptEvent: any;
  checkForUpdates: () => Promise<boolean>;
  applyUpdate: () => void;
  showInstallPrompt: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextType>({
  updateAvailable: false,
  installPromptEvent: null,
  checkForUpdates: async () => false,
  applyUpdate: () => {},
  showInstallPrompt: () => {},
});

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorker | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const { toast } = useToast();

  // Listen for beforeinstallprompt event to capture the install prompt
  useEffect(() => {
    const beforeInstallPromptHandler = (event: any) => {
      // Prevent the default prompt
      event.preventDefault();
      // Save the event for later use
      setInstallPromptEvent(event);
      console.log('Install prompt ready to use');
    };

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    };
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Initial check when component mounts
      navigator.serviceWorker.ready.then((registration) => {
        console.log('Service worker ready:', registration.scope);
        checkForUpdates();
      });

      // Set up event listeners for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          console.log('Update message received from service worker');
          setUpdateAvailable(true);
          promptForUpdate();
        }
      });
    }
  }, []);

  // Function to check for updates
  const checkForUpdates = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Explicitly check for updates
      await registration.update();
      
      if (registration.waiting) {
        console.log('New service worker waiting');
        setWaitingServiceWorker(registration.waiting);
        setUpdateAvailable(true);
        promptForUpdate();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  };

  // Function to apply update by telling the service worker to skip waiting
  const applyUpdate = () => {
    if (!waitingServiceWorker) {
      console.log('No waiting service worker found');
      return;
    }

    // Send message to service worker to skip waiting
    waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
    
    // The page will reload automatically when the new service worker takes control
    toast({
      title: "Updating...",
      description: "The app will refresh in a moment.",
    });
  };

  // Show a toast notification with update prompt
  const promptForUpdate = () => {
    toast({
      title: "App Update Available",
      description: "A new version is available. Update now for the latest features and improvements.",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={applyUpdate}
          className="gap-1 items-center"
        >
          <RefreshCw className="h-4 w-4" />
          Update
        </Button>
      ),
      duration: 10000, // Show for 10 seconds
    });
  };

  // Function to show the install prompt
  const showInstallPrompt = async () => {
    if (!installPromptEvent) {
      console.log('No install prompt available');
      return;
    }

    try {
      // Show the prompt
      const result = await installPromptEvent.prompt();
      console.log('Install prompt result:', result);
      
      // Clear the saved prompt
      setInstallPromptEvent(null);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  // Check for updates every 15 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('Checking for updates...');
      checkForUpdates();
    }, 15 * 60 * 1000); // 15 minutes in milliseconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <AppUpdateContext.Provider 
      value={{ 
        updateAvailable, 
        installPromptEvent: !!installPromptEvent,
        checkForUpdates, 
        applyUpdate,
        showInstallPrompt
      }}
    >
      {children}
    </AppUpdateContext.Provider>
  );
}

export const useAppUpdate = () => useContext(AppUpdateContext);