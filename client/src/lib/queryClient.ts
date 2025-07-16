import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';

// Get the correct API base URL for mobile vs web
function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    // Use production server for mobile with proper error handling
    return 'https://member.beanstalker.com.au';
  }
  return ''; // Use relative URLs for web
}

const API_BASE_URL = getApiBaseUrl();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  console.log('API Request:', {
    method,
    url: fullUrl,
    hasData: !!data,
    isNative: Capacitor.isNativePlatform()
  });
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      // Add timeout for mobile
      signal: AbortSignal.timeout(15000),
    });

    console.log('API Response:', {
      status: res.status,
      statusText: res.statusText,
      url: fullUrl
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request failed:', {
      url: fullUrl,
      method,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
        // Add timeout for mobile
        signal: AbortSignal.timeout(15000),
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error('Query failed:', {
        url: fullUrl,
        error: error.message
      });
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, 
      staleTime: 30000, // 30 seconds
      retry: (failureCount, error) => {
        // Retry up to 3 times for network errors on mobile
        if (Capacitor.isNativePlatform() && failureCount < 3) {
          console.log(`Retrying query (attempt ${failureCount + 1}/3)...`);
          return true;
        }
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: false,
    },
  },
});
