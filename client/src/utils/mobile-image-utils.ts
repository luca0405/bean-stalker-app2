// Utility functions for handling images in mobile environments

// Create properly sized coffee icon as base64 data URL (clean design with better visibility)
export const DEFAULT_COFFEE_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMiIgZmlsbD0iI2Y5ZmFmYiIvPgogIDxwYXRoIGQ9Ik0yMCAyMmgyMGEyIDIgMCAwIDEgMiAydjE2YTYgNiAwIDAgMS02IDZIMjRhNiA2IDAgMCAxLTYtNlYyNGEyIDIgMCAwIDEgMi0yWiIgZmlsbD0iIzIyYzU1ZSIgc3Ryb2tlPSIjMTY3ZjM5IiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDxwYXRoIGQ9Ik00MCAyOGg0YTQgNCAwIDAgMSA0IDR2NGE0IDQgMCAwIDEtNCA0aC00IiBzdHJva2U9IiMxNjdmMzkiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KICA8cGF0aCBkPSJNMjQgMTh2LTJhNCA0IDAgMCAxIDQtNGg0YTQgNCAwIDAgMSA0IDR2MiIgc3Ryb2tlPSIjMTY3ZjM5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CiAgPGNpcmNsZSBjeD0iMjgiIGN5PSIzNCIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC44Ii8+CiAgPGNpcmNsZSBjeD0iMzYiIGN5PSIzMCIgcj0iMSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuNiIvPgo8L3N2Zz4=";

// Create properly sized breakfast icon as base64 data URL (sandwich/food design)
export const DEFAULT_BREAKFAST_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMiIgZmlsbD0iI2ZmZjdlZCIvPgogIDwhLS0gQm90dG9tIGJyZWFkIC0tPgogIDxwYXRoIGQ9Ik0xNiA0MGgzMmE0IDQgMCAwIDEgMCA4SDE2YTQgNCAwIDAgMSAwLThaIiBmaWxsPSIjZGQ2YjIwIiBzdHJva2U9IiNjYThlMWQiIHN0cm9rZS13aWR0aD0iMSIvPgogIDwhLS0gRmlsbGluZ3MgLS0+CiAgPHJlY3QgeD0iMTgiIHk9IjM0IiB3aWR0aD0iMjgiIGhlaWdodD0iMiIgZmlsbD0iIzIyYzU1ZSIgcng9IjEiLz4gPCEtLSBMZXR0dWNlIC0tPgogIDxyZWN0IHg9IjIwIiB5PSIzMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjMiIGZpbGw9IiNkYzI2MjYiIHJ4PSIxLjUiLz4gPCEtLSBUb21hdG8gLS0+CiAgPHJlY3QgeD0iMTkiIHk9IjI2IiB3aWR0aD0iMjYiIGhlaWdodD0iMyIgZmlsbD0iI2ZiYmY0OSIgcng9IjEuNSIvPiA8IS0tIENoZWVzZSAtLT4KICA8IS0tIFRvcCBicmVhZCAtLT4KICA8cGF0aCBkPSJNMTYgMjRoMzJhNCA0IDAgMCAxIDAgOEgxNmE0IDQgMCAwIDEgMC04WiIgZmlsbD0iI2Y1OTMwOSIgc3Ryb2tlPSIjZWE1ODA2IiBzdHJva2Utd2lkdGg9IjEiLz4KICA8IS0tIFNlc2FtZSBzZWVkcyAtLT4KICA8Y2lyY2xlIGN4PSIyNCIgY3k9IjI4IiByPSIxIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPGNpcmNsZSBjeD0iMzIiIGN5PSIyNiIgcj0iMSIgZmlsbD0iI2YzZjRmNiIvPgogIDxjaXJjbGUgY3g9IjQwIiBjeT0iMjgiIHI9IjEiIGZpbGw9IiNmM2Y0ZjYiLz4KPC9zdmc+";

// Function to get the appropriate image URL based on platform and item category
export function getMobileCompatibleImageUrl(imageUrl: string | null, itemCategory?: string): string {
  // Check if we're in a Capacitor native app environment
  const isCapacitor = !!(window as any).Capacitor;
  const isNativeApp = window.location.protocol === 'capacitor:' || 
                     window.location.protocol === 'ionic:' ||
                     isCapacitor;

  // If no image URL provided, return appropriate default based on category
  if (!imageUrl) {
    if (itemCategory?.includes('breakfast') || 
        itemCategory?.includes('lunch') || 
        itemCategory?.includes('food') || 
        itemCategory?.includes('sandwich') || 
        itemCategory?.includes('panini') ||
        itemCategory?.includes('bagel') ||
        itemCategory?.includes('toast')) {
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