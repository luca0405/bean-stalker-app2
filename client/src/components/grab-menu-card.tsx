import { Card } from "@/components/ui/card";
import { MenuItem } from "@shared/schema";

import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotification } from "@/services/native-notification-service";
import { getMobileCompatibleImageUrl } from "@/utils/mobile-image-utils";

interface GrabMenuCardProps {
  item: MenuItem;
  onClick: () => void;
}

export function GrabMenuCard({ item, onClick }: GrabMenuCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useNativeNotification();

  // Get mobile-compatible image URL using utility function  
  const imageUrl = getMobileCompatibleImageUrl(item.imageUrl, item.category);
  
  // Force fallback icons for testing - remove in production
  const forceFallback = false;
  const finalImageUrl = forceFallback ? getMobileCompatibleImageUrl(null, item.category) : imageUrl;



  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200 bg-white"
      onClick={onClick}
    >
      {/* Product Image */}
      <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
        <img 
          src={finalImageUrl} 
          alt={item.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            const isCapacitor = !!(window as any).Capacitor;
            console.log(`Failed to load image: ${finalImageUrl} for ${item.name}`);
            console.log(`Platform info: protocol=${window.location.protocol}, hostname=${window.location.hostname}, isCapacitor=${isCapacitor}`);
            
            // For native apps, fallback to appropriate category icon
            if (isCapacitor && !finalImageUrl.startsWith('data:')) {
              const fallbackIcon = item.category?.includes('breakfast') || item.category?.includes('lunch') 
                ? getMobileCompatibleImageUrl(null, 'breakfast')
                : getMobileCompatibleImageUrl(null, 'coffee');
              (e.target as HTMLImageElement).src = fallbackIcon;
              return;
            }
            
            // Hide the broken image and show fallback
            (e.target as HTMLImageElement).style.display = 'none';
            const imgElement = e.target as HTMLImageElement;
            if (imgElement.parentElement) {
              const fallback = imgElement.parentElement.querySelector('.image-fallback');
              if (fallback) {
                (fallback as HTMLElement).style.display = 'flex';
              }
            }
          }}
          onLoad={() => {
            console.log(`Successfully loaded image: ${finalImageUrl} for ${item.name}`);
          }}
        />
        <div 
          className={`absolute inset-0 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-700 image-fallback ${item.imageUrl ? 'hidden' : ''}`}
        >
          <span className="text-sm font-medium text-center px-3">
            {item.imageUrl ? 'Image Loading...' : 'No Image'}
          </span>
        </div>

      </div>
      
      {/* Product Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 leading-tight">
          {item.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-green-600 text-sm">
            ${item.price.toFixed(2)}
          </span>
          {(item.hasSizes || item.hasOptions) && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Options
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}