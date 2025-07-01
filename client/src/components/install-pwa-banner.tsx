import * as React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Browser detection function
const detectBrowser = () => {
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  return {
    isiOS,
    isSafari,
    isiOSSafari: isiOS && isSafari
  };
};

// Check if the app is already installed
const isPWAInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

export function InstallPWABanner({ className }: { className?: string }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);
  
  React.useEffect(() => {
    // Check if we should show the banner
    const { isiOSSafari } = detectBrowser();
    const installed = isPWAInstalled();
    const dismissed = localStorage.getItem('pwa-banner-dismissed') === 'true';
    
    setIsDismissed(dismissed);
    setIsVisible(isiOSSafari && !installed && !dismissed);
  }, []);
  
  // Handle dismissing the banner
  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };
  
  if (!isVisible) return null;
  
  return (
    <Card className={cn("w-full mb-4 border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Install Bean Stalker App</CardTitle>
            <CardDescription>Get the full app experience</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-2">
          <p>Add Bean Stalker to your home screen for a better experience:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Tap the <span className="font-medium">Share</span> button in your browser</li>
            <li>Scroll down and select <span className="font-medium">Add to Home Screen</span></li>
            <li>Confirm by tapping <span className="font-medium">Add</span></li>
          </ol>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleDismiss}>
          <Download className="mr-2 h-4 w-4" />
          I'll do it later
        </Button>
      </CardFooter>
    </Card>
  );
}