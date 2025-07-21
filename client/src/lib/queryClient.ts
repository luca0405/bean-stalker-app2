import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

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
    // Use native HTTP for mobile to bypass WebView restrictions
    if (Capacitor.isNativePlatform()) {
      const headers: Record<string, string> = {
        "User-Agent": "Bean Stalker Mobile App",
        "Accept": "application/json"
      };
      
      if (data) {
        headers["Content-Type"] = "application/json";
      }
      
      const options = {
        url: fullUrl,
        method: method.toUpperCase(),
        headers,
        data: data ? JSON.stringify(data) : undefined,
        connectTimeout: 15000,
        readTimeout: 15000
      };
      
      console.log('Using Capacitor HTTP for native request:', options);
      
      const nativeResponse = await CapacitorHttp.request(options);
      
      console.log('Native HTTP Response:', {
        status: nativeResponse.status,
        url: fullUrl,
        headers: nativeResponse.headers
      });
      
      // Convert native response to standard Response object
      // Handle both string and object response data
      let responseData;
      if (typeof nativeResponse.data === 'string') {
        responseData = nativeResponse.data;
      } else {
        responseData = JSON.stringify(nativeResponse.data);
      }
      
      const response = new Response(responseData, {
        status: nativeResponse.status,
        statusText: nativeResponse.status === 200 ? 'OK' : 'Error',
        headers: nativeResponse.headers
      });
      
      await throwIfResNotOk(response);
      return response;
    }
    
    // Use standard fetch for web
    const headers: Record<string, string> = {};
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: AbortSignal.timeout(15000),
    });

    console.log('Web Fetch Response:', {
      status: res.status,
      statusText: res.statusText,
      url: fullUrl
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Enhanced mobile error handling
    let errorMessage = 'Request failed';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.name === 'TypeError' && error.message.includes('Load failed')) {
        errorMessage = 'Network connection failed. Check internet connectivity.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Server response too slow.';
      } else if (error.message.includes('NETWORK_ERROR')) {
        errorMessage = 'Network error. Unable to connect to server.';
      }
      
      console.error('API Request failed:', {
        url: fullUrl,
        method,
        error: error.message,
        errorName: error.name,
        stack: error.stack,
        isNative: Capacitor.isNativePlatform(),
        online: navigator.onLine
      });
    } else {
      console.error('API Request failed with unknown error:', error);
    }
    
    throw new Error(errorMessage);
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
      let res: Response;
      
      // Use native HTTP for mobile to bypass WebView restrictions
      if (Capacitor.isNativePlatform()) {
        const options = {
          url: fullUrl,
          method: 'GET',
          headers: {
            "User-Agent": "Bean Stalker Mobile App",
            "Accept": "application/json"
          },
          connectTimeout: 15000,
          readTimeout: 15000
        };
        
        const nativeResponse = await CapacitorHttp.request(options);
        
        // Convert native response to standard Response object
        // Handle both string and object response data
        let responseData;
        if (typeof nativeResponse.data === 'string') {
          responseData = nativeResponse.data;
        } else {
          responseData = JSON.stringify(nativeResponse.data);
        }
        
        res = new Response(responseData, {
          status: nativeResponse.status,
          statusText: nativeResponse.status === 200 ? 'OK' : 'Error',
          headers: nativeResponse.headers
        });
      } else {
        // Use standard fetch for web
        res = await fetch(fullUrl, {
          credentials: "include",
          signal: AbortSignal.timeout(15000),
        });
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error('Query failed:', {
        url: fullUrl,
        error: error instanceof Error ? error.message : String(error)
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
