// Utility functions for handling images in mobile environments

// Create a simple coffee icon as base64 data URL for guaranteed mobile compatibility
export const DEFAULT_COFFEE_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3IDEwSDIwQTMgMyAwIDAgMSAyMyAxM0EzIDMgMCAwIDEgMjAgMTZIMTciIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTYgMTBWOUE1IDUgMCAwIDEgMTYgOVYxMCIgc3Ryb2tlPSIjMjJjNTVlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNNiAxMEgxN0EyIDIgMCAwIDEgMTkgMTJWMTlBMiAyIDAgMCAxIDE3IDIxSDZBMiAyIDAgMCAxIDQgMTlWMTJBMiAyIDAgMCAxIDYgMTBaIiBzdHJva2U9IiMyMmM1NWUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=";

// Create a breakfast icon as base64 data URL
export const DEFAULT_BREAKFAST_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIgMTJIMjJMMjAgMjBIMTRMMTIgMThIMTBMOCAyMEgyTDIgMTJaIiBzdHJva2U9IiNmNzk3MzAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik03IDEyVjhBNSA1IDAgMCAxIDE3IDhWMTIiIHN0cm9rZT0iI2Y3OTczMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==";

// Function to get the appropriate image URL based on platform and item category
export function getMobileCompatibleImageUrl(imageUrl: string | null, itemCategory?: string): string {
  // Check if we're in a Capacitor native app environment
  const isCapacitor = !!(window as any).Capacitor;
  const isNativeApp = window.location.protocol === 'capacitor:' || 
                     window.location.protocol === 'ionic:' ||
                     isCapacitor;

  // If no image URL provided, return appropriate default based on category
  if (!imageUrl) {
    if (itemCategory?.includes('breakfast') || itemCategory?.includes('lunch')) {
      return DEFAULT_BREAKFAST_ICON;
    }
    return DEFAULT_COFFEE_ICON;
  }

  // If already a data URL or absolute URL, return as is
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // For native apps, try server URL first, then fallback to icons
  if (isNativeApp) {
    // Return server URL - fallback will be handled in the component's onError
    return `https://member.beanstalker.com.au${imageUrl}`;
  }

  // For web, use the original URL
  return imageUrl;
}

// Function to preload images and provide fallback
export async function preloadImageWithFallback(src: string, fallback: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(fallback);
    img.src = src;
    
    // Timeout after 3 seconds
    setTimeout(() => resolve(fallback), 3000);
  });
}