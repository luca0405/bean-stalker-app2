// Native mobile app - image utilities

// Create a simple coffee icon as base64 data URL - minimal design for card display
export const DEFAULT_COFFEE_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmM2Y0ZjYiLz4KPHBhdGggZD0iTTI4IDE0SDMwQTIgMiAwIDAgMSAzMiAxNkEyIDIgMCAwIDEgMzAgMThIMjgiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTIgMTRWMTNBNCA0IDAgMCAxIDIwIDEzVjE0IiBzdHJva2U9IiMyMmM1NWUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTEyIDE0SDI4QTIgMiAwIDAgMSAzMCAxNlYyNkEyIDIgMCAwIDEgMjggMjhIMTJBMiAyIDAgMCAxIDEwIDI2VjE2QTIgMiAwIDAgMSAxMiAxNFoiIHN0cm9rZT0iIzIyYzU1ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=";

// Create a breakfast icon as base64 data URL - minimal design for card display
export const DEFAULT_BREAKFAST_ICON = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmZWZiZWEiLz4KPHBhdGggZD0iTTggMjBIMzJMMzAgMjhIMjJMMjAgMjRIMThMMTYgMjhIOEw4IDIwWiIgc3Ryb2tlPSIjZjc5NzMwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xNCAyMFYxNkE0IDQgMCAwIDEgMjIgMTZWMjAiIHN0cm9rZT0iI2Y3OTczMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=";

// Native mobile app - get image URL with appropriate fallback
export function getMobileCompatibleImageUrl(imageUrl: string | null, itemCategory?: string): string {
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

  // For web browser, use relative URLs (same origin)
  // For native app, use full server URL
  if (typeof window !== 'undefined' && !window.location.protocol.startsWith('capacitor')) {
    // Web browser - use relative URL with proper encoding
    const encodedUrl = encodeURI(imageUrl);
    console.log(`🔍 Web Image URL: ${imageUrl} -> ${encodedUrl}`);
    return encodedUrl;
  }

  // Native mobile app - use server URL with fallback handling in component
  // In development, use local server; in production, use production domain
  const baseUrl = import.meta.env.DEV ? 'http://localhost:5000' : 'https://member.beanstalker.com.au';
  const finalUrl = `${baseUrl}${encodeURI(imageUrl)}`;
  
  // Debug logging for image URL generation
  console.log(`🔍 Native Image URL: ${imageUrl} -> ${finalUrl}`);
  
  return finalUrl;
}

// Native mobile app - preload images with fallback
export async function preloadImageWithFallback(src: string, fallback: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(fallback);
    img.src = src;
    
    // Timeout after 3 seconds for native app
    setTimeout(() => resolve(fallback), 3000);
  });
}