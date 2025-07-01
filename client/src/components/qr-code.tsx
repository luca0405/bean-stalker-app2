import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

// Define the response type for the QR code API
interface QRCodeResponse {
  qrCode: string;
}

export function QRCode() {
  const { user } = useAuth();
  const userId = user?.id || "";
  
  const { data, isLoading, error } = useQuery<QRCodeResponse>({
    queryKey: ["/api/user/qrcode"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId,
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full aspect-square flex items-center justify-center bg-white p-4 rounded-md">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Show error state
  if (error || !data?.qrCode) {
    return (
      <div className="w-full aspect-square flex items-center justify-center bg-white p-4 rounded-md">
        <div className="w-full aspect-square relative border-4 border-primary">
          <div className="border-4 border-primary absolute top-0 left-0 w-1/4 h-1/4 border-r-0 border-b-0"></div>
          <div className="border-4 border-primary absolute top-0 right-0 w-1/4 h-1/4 border-l-0 border-b-0"></div>
          <div className="border-4 border-primary absolute bottom-0 left-0 w-1/4 h-1/4 border-r-0 border-t-0"></div>
          <div className="border-4 border-primary absolute bottom-0 right-0 w-1/4 h-1/4 border-l-0 border-t-0"></div>
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <div className="text-sm text-gray-600">Unable to load QR code. Please try again later.</div>
          </div>
          <div className="absolute -bottom-8 left-0 right-0 text-center text-xs">
            ID: {userId}
          </div>
        </div>
      </div>
    );
  }
  
  // Show the actual QR code
  return (
    <div className="w-full aspect-square flex items-center justify-center bg-white p-4 rounded-md">
      <div className="w-full aspect-square relative">
        <img 
          src={data.qrCode} 
          alt="User QR Code" 
          className="w-full h-full object-contain"
        />
        <div className="absolute -bottom-8 left-0 right-0 text-center text-xs">
          ID: {userId}
        </div>
      </div>
    </div>
  );
}
