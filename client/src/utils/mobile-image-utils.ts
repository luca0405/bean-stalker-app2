// Utility functions for handling images in mobile environments

// Create a simple coffee icon as base64 data URL - minimal design for card display
export const DEFAULT_COFFEE_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmM2Y0ZjYiLz4KPHBhdGggZD0iTTI4IDE0SDMwQTIgMiAwIDAgMSAzMiAxNkEyIDIgMCAwIDEgMzAgMThIMjgiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTIgMTRWMTNBNCA0IDAgMCAxIDIwIDEzVjE0IiBzdHJva2U9IiMyMmM1NWUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTEyIDE0SDI4QTIgMiAwIDAgMSAzMCAxNlYyNkEyIDIgMCAwIDEgMjggMjhIMTJBMiAyIDAgMCAxIDEwIDI2VjE2QTIgMiAwIDAgMSAxMiAxNFoiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=";

// Create a breakfast icon as base64 data URL - minimal design for card display
export const DEFAULT_BREAKFAST_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmZWZiZWEiLz4KPHBhdGggZD0iTTggMjBIMzJMMzAgMjhIMjJMMjAgMjRIMThMMTYgMjhIOEw4IDIwWiIgc3Ryb2tlPSIjZjc5NzMwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xNCAyMFYxNkE0IDQgMCAwIDEgMjIgMTZWMjAiIHN0cm9rZT0iI2Y3OTczMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=";

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