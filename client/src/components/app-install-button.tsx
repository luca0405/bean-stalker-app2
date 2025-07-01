import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useAppUpdate } from "@/contexts/app-update-context";
import { useEffect, useState } from "react";

export default function AppInstallButton() {
  const { installPromptEvent, showInstallPrompt } = useAppUpdate();
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDisplayed, setIsDisplayed] = useState(false);

  // Check if app is already installed
  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    
    setIsStandalone(standalone);
    
    // Only show the button if:
    // 1. The app is not already installed
    // 2. We have an install prompt event (meaning the browser supports installation)
    setIsDisplayed(!standalone && installPromptEvent);
  }, [installPromptEvent]);
  
  if (!isDisplayed) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card mb-4">
      <h3 className="text-lg font-medium">Add to Home Screen</h3>
      <p className="text-sm text-muted-foreground">
        Install Bean Stalker on your device for a better experience, offline access, and faster ordering.
      </p>
      <Button 
        onClick={showInstallPrompt}
        className="w-full gap-2"
        variant="default"
      >
        <Download className="h-4 w-4" />
        Install App
      </Button>
    </div>
  );
}