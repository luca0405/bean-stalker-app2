import { useState, useEffect, useRef } from "react";
import { AppHeader } from "@/components/app-header";

import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Order, MenuItem, InsertMenuItem, InsertUser, CartItem, MenuCategory, InsertMenuCategory, MenuItemOption } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useNativeNotification } from "@/services/native-notification-service";
import { AdminPushNotificationToggle } from "@/components/push-notification-toggle";
import { QRScanner, type QRCodeResult } from "@/utils/qr-scanner";
import { 
  QrCode, Camera, AlertCircle, X, CreditCard, Info, Loader2, UserIcon, Mail
} from "lucide-react";
import { 
  Alert, AlertDescription, AlertTitle 
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, UserCog, UserCheck, CoffeeIcon, Edit, Trash2, UserPlus, Bell, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

type UserWithoutPassword = Omit<User, 'password'>;

export default function AdminPage() {
  console.log("AdminPage rendering");
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { notify } = useNativeNotification();
  const [activeTab, setActiveTab] = useState("orders");
  
  console.log("Active tab:", activeTab);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithUserDetails | null>(null);
  const [orderStatusDialog, setOrderStatusDialog] = useState(false);
  const [orderDetailsDialog, setOrderDetailsDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithoutPassword | null>(null);
  const [userDialog, setUserDialog] = useState(false);
  const [creditAmount, setCreditAmount] = useState("10");
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);
  const [clearDataDialog, setClearDataDialog] = useState(false);
  const [testNotificationLoading, setTestNotificationLoading] = useState(false);
  
  // QR code scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedUser, setScannedUser] = useState<UserWithoutPassword | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const qrScannerRef = useRef<QRScanner | null>(null);
  const [addCreditDialog, setAddCreditDialog] = useState(false);
  
  // Update notification state
  const [updateNotificationDialog, setUpdateNotificationDialog] = useState(false);
  const [updateVersion, setUpdateVersion] = useState("");
  const [includeAdmins, setIncludeAdmins] = useState(false);
  
  // QR scanner handlers
  const handleStartScan = async () => {
    console.log("Starting QR scanner");
    
    // Clear previous state
    setIsScanning(true);
    setScannerError(null);
    setScannedUser(null);
    
    // Add a small delay to ensure the DOM has fully rendered the video element
    setTimeout(async () => {
      try {
        // Check for video reference after the delay
        if (!videoRef.current) {
          throw new Error("Video element reference is missing - cannot start scanner");
        }
        
        console.log("Video element available:", videoRef.current);
        
        // First ensure we properly clean up any existing scanner
        if (qrScannerRef.current) {
          console.log("Stopping existing scanner before reinitializing");
          qrScannerRef.current.stop();
          qrScannerRef.current = null;
        }
        
        // Create new scanner instance
        console.log("Creating new QR scanner instance");
        qrScannerRef.current = new QRScanner((result) => {
          // When a QR code is detected
          try {
            const qrData = result.data;
            console.log("QR code detected:", qrData);
            
            // Stop scanning once we detect a code
            handleStopScan();
            
            // Try to parse the QR data as JSON to extract user ID
            try {
              const parsedData = JSON.parse(qrData);
              console.log("Parsed QR data:", parsedData);
              
              if (parsedData && parsedData.id) {
                // If we have a user ID, use that directly
                console.log("Using user ID from QR code:", parsedData.id);
                getUserByIdMutation.mutate(parsedData.id);
              } else {
                // Fall back to the raw QR code data
                console.log("No user ID found in QR data, using raw data");
                getUserByQrCodeMutation.mutate(qrData);
              }
            } catch (parseError) {
              console.error("Failed to parse QR data as JSON:", parseError);
              // Fall back to the raw QR code data
              getUserByQrCodeMutation.mutate(qrData);
            }
          } catch (error) {
            console.error("Error processing QR code:", error);
            setScannerError("Failed to process QR code data");
            setIsScanning(false);
          }
        });
        
        console.log("Checking browser capabilities...");
        
        // First check if the browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          // Legacy support for older browsers
          const legacyGetUserMedia = (navigator as any).getUserMedia || 
                                    (navigator as any).webkitGetUserMedia || 
                                    (navigator as any).mozGetUserMedia || 
                                    (navigator as any).msGetUserMedia;
                                    
          if (legacyGetUserMedia) {
            notify({
              title: "Legacy Browser Detected",
              description: "Using compatibility mode for camera access. For best results, please update your browser.",
            });
          } else {
            throw new Error(
              "Your browser doesn't support camera access. Please try using a modern browser like Chrome, Firefox, or Safari."
            );
          }
        }
        
        // Verify the video element is still valid
        if (!videoRef.current) {
          throw new Error("Video element is no longer available");
        }
        
        console.log("Requesting camera access...");
        
        // Try with minimal constraints first to just get permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: { ideal: "environment" }
          } 
        });
        
        console.log("Camera access granted, stream:", stream);
        
        // Double check that video element still exists before proceeding
        if (!videoRef.current) {
          // Clean up the stream since we can't use it
          stream.getTracks().forEach(track => track.stop());
          throw new Error("Video element became unavailable");
        }
        
        // Manually set the stream to the video element
        videoRef.current.srcObject = stream;
        console.log("Stream attached to video element");
        
        // Wait a brief moment for the video to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // One final check before starting the scanner
        if (!videoRef.current || !qrScannerRef.current) {
          throw new Error("Required elements are no longer available");
        }
        
        // Start the scanner with the video element
        console.log("Starting QR scanner with video element");
        await qrScannerRef.current.start(videoRef.current);
        
        console.log("QR scanner started successfully");
        setScannerActive(true);
        notify({
          title: "Scanner Active",
          description: "Camera is now scanning for QR codes.",
        });
      } catch (error: any) {
        console.error("QR scanner error:", error);
        
        // Provide specific error messages based on the error type
        let errorMessage = "Failed to access camera.";
        let toastMessage = "Failed to access camera. Please ensure you've granted camera permissions.";
        
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
          toastMessage = "Camera permission denied. Please click the camera icon in your address bar and allow access.";
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          errorMessage = "No camera found on this device.";
          toastMessage = "No camera was detected on your device.";
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          errorMessage = "Camera is in use by another application or not accessible.";
          toastMessage = "Camera is in use by another application. Please close other apps using your camera.";
        } else if (error.name === "OverconstrainedError") {
          errorMessage = "Camera cannot satisfy the requested constraints. Try with different settings.";
          toastMessage = "Camera cannot satisfy the requested settings. Please try again with default settings.";
        } else if (error.name === "AbortError") {
          errorMessage = "Camera access was aborted. Please try again.";
          toastMessage = "Camera access was interrupted. Please try again.";
        } else if (error.name === "SecurityError") {
          errorMessage = "Camera access is blocked due to security restrictions.";
          toastMessage = "Camera access is blocked. Try using HTTPS or check your browser settings.";
        } else if (error.message && error.message.includes("Video element")) {
          errorMessage = "Video element issue: " + error.message;
          toastMessage = "Could not access camera element. Please try refreshing the page.";
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setScannerError(errorMessage);
        setIsScanning(false);
        notify({
          title: "Camera Error",
          description: toastMessage,
          variant: "destructive",
        });
        
        // Additional help for common platforms
        if (error.name === "NotAllowedError") {
          // Provide additional hints based on browser
          const isChrome = navigator.userAgent.indexOf("Chrome") > -1;
          const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
          const isSafari = navigator.userAgent.indexOf("Safari") > -1 && !isChrome;
          
          if (isChrome) {
            notify({
              title: "Camera Permission Help",
              description: "In Chrome, click the camera icon in the address bar and select 'Allow'.",
            });
          } else if (isFirefox) {
            notify({
              title: "Camera Permission Help",
              description: "In Firefox, click the camera icon in the address bar and choose 'Remember this decision'.",
            });
          } else if (isSafari) {
            notify({
              title: "Camera Permission Help",
              description: "In Safari, go to Preferences > Websites > Camera and allow access for this site.",
            });
          }
        }
        
        // Automatically retry once for transient errors
        if (error.message?.includes("Could not access camera") || error.message?.includes("Video element")) {
          notify({
            title: "Auto-retry",
            description: "We'll try to access your camera again in 2 seconds...",
          });
          
          // Clean up before retry
          if (qrScannerRef.current) {
            qrScannerRef.current.stop();
            qrScannerRef.current = null;
          }
          
          setTimeout(() => {
            if (activeTab === "qrscanner") {
              handleStartScan();
            }
          }, 2000);
        }
      }
    }, 500); // Give DOM 500ms to update
  };
  
  const handleStopScan = () => {
    console.log("Stopping QR scanner...");
    
    // First stop the scanner
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    
    // Then manually clear the video source if it exists
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        // Stop all tracks in the stream
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach(track => {
            console.log(`Manually stopping track: ${track.kind}`);
            track.stop();
          });
        }
        // Clear the source
        videoRef.current.srcObject = null;
        console.log("Video source cleared");
      } catch (error) {
        console.error("Error cleaning up video element:", error);
      }
    }
    
    // Reset state
    setIsScanning(false);
    setScannerActive(false);
    console.log("QR scanner stopped and resources released");
  };
  
  // Initialize QR scanner when tab changes to qrscanner
  useEffect(() => {
    if (activeTab === "qrscanner") {
      console.log("QR scanner tab activated");
      
      // Give DOM time to render the video element before trying to access it
      const initTimer = setTimeout(() => {
        console.log("Checking if video element is available:", videoRef.current);
        if (videoRef.current) {
          console.log("Video element is available, can start scanning");
          // Don't auto-start the scanner, let the user click the button
        } else {
          console.log("Video element is not available yet after timeout");
        }
      }, 500); // Allow 500ms for the DOM to update
      
      return () => clearTimeout(initTimer);
    } else if (qrScannerRef.current) {
      // Stop scanner when user switches away from qrscanner tab
      console.log("Stopping scanner due to tab change");
      handleStopScan();
    }
    
    // Cleanup function for component unmount
    return () => {
      console.log("Cleaning up QR scanner on component unmount");
      handleStopScan();
    };
  }, [activeTab]);
  
  // Test notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/test-notification");
      return await res.json();
    },
    onSuccess: (data) => {
      notify({
        title: "Test Notification Sent",
        description: `${data.message}`,
      });
      setTestNotificationLoading(false);
    },
    onError: (error: Error) => {
      notify({
        title: "Test Failed",
        description: error.message || "Failed to send test notification",
        variant: "destructive",
      });
      setTestNotificationLoading(false);
    },
  });
  
  const handleSendTestNotification = () => {
    setTestNotificationLoading(true);
    testNotificationMutation.mutate();
  };
  
  // Menu management state
  const [menuItemDialog, setMenuItemDialog] = useState(false);
  const [isEditingMenuItem, setIsEditingMenuItem] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [menuItemForm, setMenuItemForm] = useState<Partial<InsertMenuItem>>({
    name: "",
    description: "",
    category: "",
    price: 0,
    imageUrl: "",
    hasSizes: false,
    mediumPrice: 0,
    largePrice: 0,
    hasOptions: false
  });
  
  // Define a local interface for menu item options that matches what we use in the UI
  interface LocalMenuItemOption {
    id?: number;
    name: string;
    priceAdjustment: number;
    isParent?: boolean;
    parentId?: number | null;
    optionType?: string | null;
    menuItemId?: number;
    displayOrder?: number | null;
    createdAt?: Date;
    children?: LocalMenuItemOption[]; // Add children property for parent options
  }
  
  // Menu item options state (for flavors/options)
  const [menuItemOptions, setMenuItemOptions] = useState<LocalMenuItemOption[]>([]);
  
  const [optionForm, setOptionForm] = useState<{
    name: string, 
    priceAdjustment: number,
    isParent: boolean,
    parentId?: number
  }>({
    name: "",
    priceAdjustment: 0,
    isParent: false
  });
  
  // Redirect if not admin
  useEffect(() => {
    if (!user) {
      // User is not authenticated yet
      return;
    }
    
    if (!user.isAdmin) {
      notify({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, navigate, notify]);

  // Define type for orders with user details
  type OrderWithUserDetails = Order & { 
    userName: string;
    userFullName: string | null;
  };

  // Fetch all orders with user details (admin only)
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery<OrderWithUserDetails[], Error>({
    queryKey: ["/api/admin/orders/detailed"],
    enabled: !!user?.isAdmin,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch all users (admin only)
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery<UserWithoutPassword[], Error>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin
  });
  
  // Fetch all menu items
  const menuItemsQuery = useQuery<MenuItem[], Error>({
    queryKey: ["/api/menu"],
    enabled: !!user?.isAdmin,
  });
  
  const {
    data: menuItems = [],
    isLoading: menuItemsLoading,
    error: menuItemsError,
  } = menuItemsQuery;
  
  // Fetch all menu categories as strings (legacy endpoint)
  const {
    data: categoryNames = [],
    isLoading: categoryNamesLoading,
    error: categoryNamesError,
  } = useQuery<string[], Error>({
    queryKey: ["/api/menu/categories"],
    enabled: !!user?.isAdmin,
  });
  
  // Fetch all menu categories as objects
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<MenuCategory[], Error>({
    queryKey: ["/api/categories"],
    enabled: !!user?.isAdmin,
  });
  
  // Category management state
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<Partial<InsertMenuCategory>>({
    name: "",
    displayName: "",
    description: "",
    displayOrder: 0
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${orderId}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate both admin and customer-facing orders queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setOrderStatusDialog(false);
      notify({
        title: "Order Updated",
        description: `Order status has been updated to ${selectedStatus}.`,
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add credits to user mutation
  const addUserCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/credits`, { amount });
      return true; // Just return success
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      notify({
        title: "Credits Added",
        description: `${formatCurrency(Number(creditAmount))} has been added to the user's account.`,
      });
      setUserDialog(false);
    },
    onError: (error: Error) => {
      notify({
        title: "Failed to Add Credits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user admin status mutation
  const updateUserAdminStatusMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, { isAdmin });
      return true; // Just return success
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      notify({
        title: "User Updated",
        description: `User admin status has been updated.`,
      });
      setUserDialog(false);
    },
    onError: (error: Error) => {
      notify({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update user active status mutation
  const updateUserActiveStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/active`, { isActive });
      return true; // Just return success
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      notify({
        title: "User Updated",
        description: `User active status has been updated.`,
      });
      setUserDialog(false);
    },
    onError: (error: Error) => {
      notify({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Clear all users mutation
  const clearAllUsersMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/users/clear");
      return true; // Just return success
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setClearDataDialog(false);
      notify({
        title: "Users Cleared",
        description: "All non-admin users have been removed from the system.",
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Clear all orders mutation
  const clearAllOrdersMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/orders/clear");
      return true; // Just return success
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders/detailed"] });
      setClearDataDialog(false);
      notify({
        title: "Orders Cleared",
        description: "All orders have been removed from the system.",
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: async (menuItem: InsertMenuItem) => {
      const res = await apiRequest("POST", "/api/admin/menu", menuItem);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      setMenuItemDialog(false);
      resetMenuItemForm();
      notify({
        title: "Menu Item Created",
        description: "The menu item has been successfully added."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update menu item mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, menuItem }: { id: number; menuItem: Partial<InsertMenuItem> }) => {
      const res = await apiRequest("PATCH", `/api/admin/menu/${id}`, menuItem);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      setMenuItemDialog(false);
      resetMenuItemForm();
      notify({
        title: "Menu Item Updated",
        description: "The menu item has been successfully updated."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/menu/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      notify({
        title: "Menu Item Deleted",
        description: "The menu item has been successfully deleted."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Update the menu item form with the new image URL
      setMenuItemForm(prev => ({
        ...prev,
        imageUrl: data.imageUrl
      }));
      
      notify({
        title: "Image Uploaded",
        description: "Image was uploaded successfully."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (category: InsertMenuCategory) => {
      const res = await apiRequest("POST", "/api/admin/categories", category);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      setCategoryDialog(false);
      resetCategoryForm();
      notify({
        title: "Category Created",
        description: "The menu category has been successfully added."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, category }: { id: number; category: Partial<InsertMenuCategory> }) => {
      const res = await apiRequest("PATCH", `/api/admin/categories/${id}`, category);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      setCategoryDialog(false);
      resetCategoryForm();
      notify({
        title: "Category Updated",
        description: "The menu category has been successfully updated."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Send update notification mutation
  const sendUpdateNotificationMutation = useMutation({
    mutationFn: async ({ version, includeAdmins }: { version: string; includeAdmins: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/send-update-notification", { version, includeAdmins });
      return await res.json();
    },
    onSuccess: (data) => {
      notify({
        title: "Update Notification Sent",
        description: `Email notification sent to ${data.emailsSent} users for version ${data.version}.`,
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Notification Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      notify({
        title: "Category Deleted",
        description: "The menu category has been successfully deleted."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      // Use the admin API endpoint instead of the regular register endpoint
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setNewUserDialog(false);
      resetNewUserForm();
      notify({
        title: "User Created",
        description: "The new user has been successfully created."
      });
    },
    onError: (error: Error) => {
      notify({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Get user by QR code mutation
  const getUserByQrCodeMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      console.log(`Searching for user with QR code: ${qrCode}`);
      try {
        const res = await apiRequest("GET", `/api/admin/user-by-qr/${encodeURIComponent(qrCode)}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (res.status === 404) {
            throw new Error("No user found with this QR code. Verify the QR code is valid.");
          } else {
            throw new Error(errorData.message || `Server error: ${res.status}`);
          }
        }
        
        return await res.json();
      } catch (error: any) {
        console.error("QR code lookup error:", error);
        throw new Error(error.message || "Failed to find user with that QR code");
      }
    },
    onSuccess: (data) => {
      console.log("User found by QR code:", data);
      setScannedUser(data);
      setScannerError(null);
      setIsScanning(false);
      
      // Stop the scanner since we've found a user
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
      
      notify({
        title: "User Found",
        description: `Successfully found ${data.isAdmin ? "admin" : "customer"}: ${data.username}`
      });
    },
    onError: (error: Error) => {
      console.error("QR code mutation error:", error);
      setScannedUser(null);
      setScannerError(error.message || "Failed to find user with that QR code");
      setIsScanning(false);
      
      // Show helpful error message
      notify({
        title: "QR Code Scan Failed",
        description: error.message || "Could not find a user with this QR code. Make sure it's a valid Bean Stalker QR code.",
        variant: "destructive"
      });
      
      // Offer retry option
      notify({
        title: "Try Again",
        description: "You can try scanning again or manually search for the user in the Users tab.",
      });
      
      // Reset the scanner state after error
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
    }
  });
  
  // Get user by ID (for QR scanner with parsed JSON data)
  const getUserByIdMutation = useMutation({
    mutationFn: async (userId: number) => {
      console.log(`Searching for user with ID: ${userId}`);
      try {
        const res = await apiRequest("GET", `/api/admin/users/${userId}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (res.status === 404) {
            throw new Error("No user found with this ID.");
          } else {
            throw new Error(errorData.message || `Server error: ${res.status}`);
          }
        }
        
        return await res.json();
      } catch (error: any) {
        console.error("User lookup error:", error);
        throw new Error(error.message || "Failed to find user with that ID");
      }
    },
    onSuccess: (data) => {
      console.log("User found by ID:", data);
      setScannedUser(data);
      setScannerError(null);
      setIsScanning(false);
      
      notify({
        title: "User Found",
        description: `Successfully found ${data.isAdmin ? "admin" : "customer"}: ${data.username}`
      });
      
      // Stop scanner if it's still running
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
    },
    onError: (error: Error) => {
      console.error("User ID lookup error:", error);
      setScannedUser(null);
      setScannerError(error.message || "Failed to find user with that ID");
      setIsScanning(false);
      
      notify({
        title: "User Lookup Failed",
        description: error.message || "Could not find a user with this ID",
        variant: "destructive"
      });
      
      // Reset the scanner state after error
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
    }
  });

  const handleUpdateOrderStatus = () => {
    if (selectedOrder && selectedStatus) {
      updateOrderStatusMutation.mutate({
        orderId: selectedOrder.id,
        status: selectedStatus,
      });
    }
  };

  const handleAddUserCredits = () => {
    if (selectedUser && creditAmount) {
      const amount = Number(creditAmount);
      if (isNaN(amount) || amount <= 0) {
        notify({
          title: "Invalid Amount",
          description: "Please enter a valid amount greater than 0.",
          variant: "destructive",
        });
        return;
      }

      addUserCreditsMutation.mutate({
        userId: selectedUser.id,
        amount,
      });
    }
  };

  const handleUpdateUserAdminStatus = () => {
    if (selectedUser) {
      updateUserAdminStatusMutation.mutate({
        userId: selectedUser.id,
        isAdmin: isUserAdmin,
      });
    }
  };
  
  const handleUpdateUserActiveStatus = () => {
    if (selectedUser) {
      updateUserActiveStatusMutation.mutate({
        userId: selectedUser.id,
        isActive: isUserActive,
      });
    }
  };

  const openOrderStatusDialog = (order: OrderWithUserDetails) => {
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setOrderStatusDialog(true);
  };
  
  const openOrderDetailsDialog = (order: OrderWithUserDetails) => {
    setSelectedOrder(order);
    setOrderDetailsDialog(true);
  };

  const openUserDialog = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setIsUserAdmin(user.isAdmin);
    setIsUserActive(user.isActive !== false); // Default to true if undefined
    setCreditAmount("10");
    setUserDialog(true);
  };
  
  // State for new user form
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    password: "",
    credits: 0,
    isAdmin: false
  });
  
  // Helper functions for menu item management
  const resetMenuItemForm = () => {
    setMenuItemForm({
      name: "",
      description: "",
      category: "",
      price: 0,
      imageUrl: "",
      hasSizes: false,
      mediumPrice: 0,
      largePrice: 0,
      hasOptions: false
    });
    setMenuItemOptions([]);
    setOptionForm({
      name: "",
      priceAdjustment: 0,
      isParent: false
    });
    setIsEditingMenuItem(false);
    setSelectedMenuItem(null);
  };
  
  // Helper functions for category management
  function resetCategoryForm() {
    setCategoryForm({
      name: "",
      displayName: "",
      description: "",
      displayOrder: 0
    });
    setIsEditingCategory(false);
    setSelectedCategory(null);
  }
  
  const openCategoryDialog = (category?: MenuCategory) => {
    if (category) {
      // Edit existing category
      setSelectedCategory(category);
      setIsEditingCategory(true);
      setCategoryForm({
        name: category.name,
        displayName: category.displayName,
        description: category.description || "",
        displayOrder: category.displayOrder || 0
      });
    } else {
      // Create new category
      resetCategoryForm();
      setIsEditingCategory(false);
    }
    setCategoryDialog(true);
  };
  
  const handleCategoryFormChange = (field: keyof InsertMenuCategory, value: string | number) => {
    setCategoryForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleCategorySubmit = () => {
    // Validate form
    if (!categoryForm.name || !categoryForm.displayName) {
      notify({
        title: "Invalid Form",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditingCategory && selectedCategory) {
      // Update existing category
      updateCategoryMutation.mutate({ 
        id: selectedCategory.id,
        category: categoryForm
      });
    } else {
      // Create new category
      createCategoryMutation.mutate(categoryForm as InsertMenuCategory);
    }
  };
  
  const handleDeleteCategory = (id: number) => {
    if (confirm("Are you sure you want to delete this category? This will affect all menu items in this category.")) {
      deleteCategoryMutation.mutate(id);
    }
  };
  
  // Helper functions for user management
  const resetNewUserForm = () => {
    setNewUserForm({
      username: "",
      email: "",
      password: "",
      credits: 0,
      isAdmin: false
    });
  };
  
  const handleCreateUser = () => {
    // Validate form
    if (!newUserForm.username || !newUserForm.password) {
      notify({
        title: "Invalid Form",
        description: "Username and password are required.",
        variant: "destructive",
      });
      return;
    }
    
    // Create the user
    createUserMutation.mutate(newUserForm);
  };
  
  const openMenuItemDialog = (menuItem?: MenuItem) => {
    if (menuItem) {
      // Edit existing menu item
      setSelectedMenuItem(menuItem);
      setIsEditingMenuItem(true);
      setMenuItemForm({
        name: menuItem.name,
        description: menuItem.description || "",
        category: menuItem.category,
        price: menuItem.price,
        imageUrl: menuItem.imageUrl || "",
        hasSizes: menuItem.hasSizes || false,
        mediumPrice: menuItem.mediumPrice || 0,
        largePrice: menuItem.largePrice || 0,
        hasOptions: menuItem.hasOptions || false
      });
      
      // Fetch options if this menu item has options
      if (menuItem.hasOptions) {
        fetch(`/api/admin/menu/${menuItem.id}/options`, {
          credentials: 'include' // Add credentials to include session cookies
        })
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
          })
          .then(options => {
            console.log("Fetched options:", options); // Debug log
            
            // Process the options - we need to ensure childOptions are properly associated
            const processedOptions: LocalMenuItemOption[] = [];
            
            console.log("Processing options, including standalone options...");
            
            // First process parent groups (options with isParent=true)
            options.filter((option: LocalMenuItemOption) => option.isParent).forEach((parentOption: LocalMenuItemOption) => {
              // Add the parent to our list
              processedOptions.push({
                id: parentOption.id,
                name: parentOption.name,
                priceAdjustment: parentOption.priceAdjustment || 0,
                isParent: true,
                parentId: null,
                optionType: parentOption.optionType || 'group'
              });
              
              // If this parent has children in the 'children' array, process them
              if (parentOption.children && Array.isArray(parentOption.children)) {
                parentOption.children.forEach((childOption: LocalMenuItemOption) => {
                  processedOptions.push({
                    id: childOption.id,
                    name: childOption.name,
                    priceAdjustment: childOption.priceAdjustment || 0,
                    isParent: false,
                    parentId: parentOption.id, // Link to the parent ID
                    optionType: childOption.optionType || 'item'
                  });
                });
              }
            });
            
            // Then add standalone options (non-parent options without a parentId)
            options.filter((option: LocalMenuItemOption) => 
              !option.isParent && !option.parentId && 
              // Skip options that might be in a children array of a parent
              !options.some((p: LocalMenuItemOption) => p.isParent && p.children && p.children.some((c: LocalMenuItemOption) => c.id === option.id))
            ).forEach((option: LocalMenuItemOption) => {
              processedOptions.push({
                id: option.id,
                name: option.name,
                priceAdjustment: option.priceAdjustment || 0,
                isParent: false,
                parentId: null,
                optionType: option.optionType || 'item'
              });
            });
            
            console.log("Processed options:", processedOptions);
            setMenuItemOptions(processedOptions);
          })
          .catch(err => {
            console.error("Error fetching menu item options:", err);
            notify({
              title: "Error",
              description: "Failed to load menu item options",
              variant: "destructive"
            });
          });
      } else {
        // Reset options
        setMenuItemOptions([]);
      }
    } else {
      // Create new menu item
      resetMenuItemForm();
      setIsEditingMenuItem(false);
    }
    setMenuItemDialog(true);
  };
  
  const handleMenuItemFormChange = (field: keyof InsertMenuItem, value: string | number | boolean) => {
    setMenuItemForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle option form changes
  const handleOptionFormChange = (field: string, value: string | number | boolean | undefined) => {
    setOptionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Add a new menu item option
  const handleAddOption = () => {
    if (!optionForm.name) {
      notify({
        title: "Invalid Option",
        description: "Please enter a name for the option",
        variant: "destructive"
      });
      return;
    }
    
    // Add to local state
    setMenuItemOptions(prev => [...prev, {
      name: optionForm.name,
      priceAdjustment: optionForm.priceAdjustment,
      isParent: optionForm.isParent,
      parentId: optionForm.parentId
    }]);
    
    // Reset the form but preserve the parentId if this was a child option
    setOptionForm({
      name: "",
      priceAdjustment: 0,
      isParent: false,
      parentId: optionForm.isParent ? undefined : optionForm.parentId // preserve parentId for child options
    });
  };
  
  // Remove an option from the list
  const handleRemoveOption = async (index: number) => {
    // Get the option before we remove it to see if it has an ID
    const option = menuItemOptions[index];
    
    // Remove from UI state
    setMenuItemOptions(prev => prev.filter((_, i) => i !== index));
    
    // If this option has an ID and we're editing (not creating new), delete it from the database immediately
    if (option?.id && isEditingMenuItem && selectedMenuItem) {
      try {
        // Delete the option from the database
        const response = await fetch(`/api/admin/menu-options/${option.id}`, {
          method: 'DELETE',
          credentials: 'include',
          // Add a cache-busting parameter to ensure we don't get cached responses
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete option: ${response.statusText}`);
        }
        
        // More aggressive cache invalidation - Reset the query cache for anything related to menu items or options
        
        // Invalidate all menu-related queries by using partial key match
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = Array.isArray(query.queryKey) ? query.queryKey : [query.queryKey];
            // Invalidate anything with '/api/menu' in the query key
            return queryKey.some(key => 
              typeof key === 'string' && 
              (key.includes('/api/menu') || key.includes('/api/admin/menu'))
            );
          }
        });
        
        // Clear the specific cache entries completely
        queryClient.removeQueries({ queryKey: ['/api/menu'] });
        queryClient.removeQueries({ queryKey: ['/api/menu', selectedMenuItem.id, 'options'] });
        queryClient.removeQueries({ queryKey: [`/api/menu/${selectedMenuItem.id}/options`] });
        queryClient.removeQueries({ queryKey: [`/api/admin/menu/${selectedMenuItem.id}/options`] });
        
        console.log(`Option ${option.name} (ID: ${option.id}) deleted from database`);
        
        // Refetch the menu items to force a reload
        menuItemsQuery.refetch();
        
        notify({
          title: "Option Removed",
          description: `Successfully removed "${option.name}" option`
        });
      } catch (err) {
        console.error("Error deleting option:", err);
        notify({
          title: "Error",
          description: "Failed to delete option from database",
          variant: "destructive"
        });
      }
    }
  };
  
  // Save options for a menu item
  const saveMenuItemOptions = async (menuItemId: number) => {
    try {
      // First, fetch existing options to determine which to update, which to create, and which to delete
      const response = await fetch(`/api/admin/menu/${menuItemId}/options`, {
        credentials: 'include' // Add credentials to include session cookies
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch existing options: ${response.status}`);
      }
      
      const existingOptions = await response.json() as LocalMenuItemOption[];
      
      // Clear all existing options first if requested through the "Clear All" button
      // or if we have no options to save
      if (menuItemOptions.length === 0 && existingOptions.length > 0) {
        // Delete all existing options from the database
        const deletePromises = existingOptions.map((option: LocalMenuItemOption) => 
          fetch(`/api/admin/menu-options/${option.id}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        );
        
        await Promise.all(deletePromises);
        
        // More aggressive cache invalidation - Reset the query cache for anything related to menu items or options
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = Array.isArray(query.queryKey) ? query.queryKey : [query.queryKey];
            // Invalidate anything with '/api/menu' in the query key
            return queryKey.some(key => 
              typeof key === 'string' && 
              (key.includes('/api/menu') || key.includes('/api/admin/menu'))
            );
          }
        });
        
        // Clear the specific cache entries completely
        queryClient.removeQueries({ queryKey: ['/api/menu'] });
        queryClient.removeQueries({ queryKey: ['/api/menu', menuItemId, 'options'] });
        queryClient.removeQueries({ queryKey: [`/api/menu/${menuItemId}/options`] });
        queryClient.removeQueries({ queryKey: [`/api/admin/menu/${menuItemId}/options`] });
        
        // Refetch the menu items to force a reload
        menuItemsQuery.refetch();
        
        notify({
          title: "Options Removed",
          description: "All options have been removed from this item"
        });
        
        return;
      }
      
      // First, save all parent options
      const parentOptionsMap = new Map<number, number>(); // Map to store index -> DB ID
      
      // Create a function to save a parent option and return its DB ID
      const saveParentOption = async (option: LocalMenuItemOption): Promise<number> => {
        if (option.id) {
          // Parent already has an ID, just update it
          const response = await fetch(`/api/admin/menu-options/${option.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: option.name,
              priceAdjustment: option.priceAdjustment,
              isParent: true,
              parentId: null,
              optionType: 'group'
            })
          });
          
          if (!response.ok) throw new Error(`Failed to update option: ${option.name}`);
          return option.id;
        } else {
          // Create new parent option
          const response = await fetch(`/api/admin/menu/${menuItemId}/options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: option.name,
              priceAdjustment: option.priceAdjustment,
              menuItemId: menuItemId,
              isParent: true,
              parentId: null,
              optionType: 'group'
            })
          });
          
          if (!response.ok) throw new Error(`Failed to create option: ${option.name}`);
          const newOption = await response.json();
          return newOption.id;
        }
      };
      
      // First, save all parent options
      const parentOptions = menuItemOptions.filter(o => o.isParent);
      for (let i = 0; i < parentOptions.length; i++) {
        const option = parentOptions[i];
        const index = menuItemOptions.indexOf(option);
        const dbId = await saveParentOption(option);
        parentOptionsMap.set(index, dbId);
      }
      
      // Then save all child options with proper parent IDs
      const savePromises = menuItemOptions
        .filter(o => !o.isParent)
        .map((option: LocalMenuItemOption) => {
          // Resolve the parent ID
          let resolvedParentId: number | null = null;
          
          if (typeof option.parentId === 'number') {
            // Find the parent in our current options list
            const parentOption = menuItemOptions.find((o, idx) => 
              o.isParent && (idx === option.parentId || o.id === option.parentId)
            );
            
            if (parentOption) {
              // Use the map to get the database ID of the parent
              const parentIndex = menuItemOptions.indexOf(parentOption);
              resolvedParentId = parentOptionsMap.get(parentIndex) || null;
              
              // If we didn't find it in the map, the parent might already have a DB ID
              if (resolvedParentId === null && parentOption.id) {
                resolvedParentId = parentOption.id;
              }
            } else if (parentOptionsMap.has(option.parentId)) {
              // Direct lookup in the map as fallback
              resolvedParentId = parentOptionsMap.get(option.parentId) || null;
            } else {
              // It might already be a database ID
              resolvedParentId = option.parentId;
            }
          }
          
          // If option has an ID, update it
          if (option.id) {
            return fetch(`/api/admin/menu-options/${option.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                name: option.name,
                priceAdjustment: option.priceAdjustment,
                isParent: false,
                parentId: resolvedParentId,
                optionType: 'item'
              })
            }).then(res => {
              if (!res.ok) throw new Error(`Failed to update option: ${option.name}`);
              return res.json();
            });
          } else {
            // Otherwise create a new option
            return fetch(`/api/admin/menu/${menuItemId}/options`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                name: option.name,
                priceAdjustment: option.priceAdjustment,
                menuItemId: menuItemId,
                isParent: false,
                parentId: resolvedParentId,
                optionType: 'item'
              })
            }).then(res => {
              if (!res.ok) throw new Error(`Failed to create option: ${option.name}`);
              return res.json();
            });
          }
        });
      
      // Find options that need to be deleted (exist in DB but not in our current list)
      const optionIdsToKeep = menuItemOptions
        .filter(o => o.id !== undefined)
        .map(o => o.id);
      
      const deletePromises = existingOptions
        .filter((option) => !optionIdsToKeep.includes(option.id))
        .map((option) => 
          fetch(`/api/admin/menu-options/${option.id}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        );
      
      // Execute all promises
      await Promise.all([...savePromises, ...deletePromises]);
      
      // More aggressive cache invalidation - Reset the query cache for anything related to menu items or options
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = Array.isArray(query.queryKey) ? query.queryKey : [query.queryKey];
          // Invalidate anything with '/api/menu' in the query key
          return queryKey.some(key => 
            typeof key === 'string' && 
            (key.includes('/api/menu') || key.includes('/api/admin/menu'))
          );
        }
      });
      
      // Clear the specific cache entries completely
      queryClient.removeQueries({ queryKey: ['/api/menu'] });
      queryClient.removeQueries({ queryKey: ['/api/menu', menuItemId, 'options'] });
      queryClient.removeQueries({ queryKey: [`/api/menu/${menuItemId}/options`] });
      queryClient.removeQueries({ queryKey: [`/api/admin/menu/${menuItemId}/options`] });
      
      notify({
        title: "Options Saved",
        description: `Successfully saved ${menuItemOptions.length} options for this item`
      });
    } catch (error) {
      console.error("Error saving menu item options:", error);
      notify({
        title: "Error",
        description: "Failed to save options",
        variant: "destructive"
      });
    }
  };
  
  const handleMenuItemSubmit = () => {
    // Validate form
    if (!menuItemForm.name || !menuItemForm.category || !menuItemForm.price || menuItemForm.price <= 0) {
      notify({
        title: "Invalid Form",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate size prices if sizes are enabled
    if (menuItemForm.hasSizes) {
      if (!menuItemForm.mediumPrice || menuItemForm.mediumPrice <= 0 ||
          !menuItemForm.largePrice || menuItemForm.largePrice <= 0) {
        notify({
          title: "Invalid Form",
          description: "Please enter valid prices for all sizes.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Check options if they are enabled
    if (menuItemForm.hasOptions && menuItemOptions.length === 0) {
      notify({
        title: "Missing Options",
        description: "You enabled options but didn't add any. Please add at least one option or disable options.",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditingMenuItem && selectedMenuItem) {
      // Update existing menu item
      updateMenuItemMutation.mutate({ 
        id: selectedMenuItem.id,
        menuItem: menuItemForm
      }, {
        onSuccess: (updatedItem) => {
          // If options are enabled, save them
          if (menuItemForm.hasOptions) {
            saveMenuItemOptions(updatedItem.id);
          }
        }
      });
    } else {
      // Create new menu item
      createMenuItemMutation.mutate(menuItemForm as InsertMenuItem, {
        onSuccess: (newItem) => {
          // If options are enabled, save them for the new item
          if (menuItemForm.hasOptions) {
            saveMenuItemOptions(newItem.id);
          }
        }
      });
    }
  };
  
  const handleDeleteMenuItem = (id: number) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      deleteMenuItemMutation.mutate(id);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-500">Processing</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (ordersLoading || usersLoading || menuItemsLoading) {
    return (
      <div className="flex items-center justify-center iphone-fullscreen" style={{ 
        height: '-webkit-fill-available',
        width: '100vw',
        margin: 0,
        padding: 0 
      }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-secondary w-full iphone-fullscreen" style={{ 
      height: '-webkit-fill-available',
      width: '100vw',
      margin: 0,
      padding: 0 
    }}>
      <AppHeader />

      <main className="flex-1 p-5 container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-2xl text-primary">Admin Dashboard</h1>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="qrscanner">QR Scanner</TabsTrigger>
          </TabsList>
          
          {/* Quick Access Buttons */}
          <div className="mb-6 flex gap-3">
            <Button 
              onClick={() => window.open('/kitchen', '_blank')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              🍽️ Kitchen Display
            </Button>
            <Button 
              onClick={() => navigate('/admin/credit-verification')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              💳 Credit Verification
            </Button>
          </div>
          
          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
                <CardDescription>
                  Manage all customer orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersError ? (
                  <div className="text-red-500">Failed to load orders</div>
                ) : orders && orders.length === 0 ? (
                  <div className="text-center py-4">No orders found</div>
                ) : (
                  <Table>
                    <TableCaption>List of all orders</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(orders) && [...orders]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((order: OrderWithUserDetails) => (
                        <TableRow key={order.id} className={order.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>
                            <div className="font-medium">{order.userName}</div>
                            {order.userFullName && (
                              <div className="text-sm text-muted-foreground">{order.userFullName}</div>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(new Date(order.createdAt))}</TableCell>
                          <TableCell>{formatCurrency(order.total)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openOrderStatusDialog(order)}
                              >
                                Update
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openOrderDetailsDialog(order)}
                              >
                                Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                      Manage all registered users
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="destructive"
                      onClick={() => setClearDataDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Data
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => setNewUserDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersError ? (
                  <div className="text-red-500">Failed to load users</div>
                ) : users && users.length === 0 ? (
                  <div className="text-center py-4">No users found</div>
                ) : (
                  <Table>
                    <TableCaption>List of all users</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(users) && users.map((user: UserWithoutPassword) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">#{user.id}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
                          <TableCell>{formatCurrency(user.credits)}</TableCell>
                          <TableCell>
                            {user.isAdmin ? (
                              <Badge className="bg-purple-500">Admin</Badge>
                            ) : (
                              <Badge variant="outline">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openUserDialog(user)}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Menu Tab */}
          <TabsContent value="menu">
            <div className="space-y-6">
              {/* Categories Section */}
              <Card>
                <CardHeader>
                  <div className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Menu Categories</CardTitle>
                      <CardDescription>
                        Manage menu categories
                      </CardDescription>
                    </div>
                    <Button 
                      variant="default"
                      onClick={() => openCategoryDialog()}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {categoriesError ? (
                    <div className="text-red-500">Failed to load categories</div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-4">No categories found</div>
                  ) : (
                    <Table>
                      <TableCaption>List of all menu categories</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Category Key</TableHead>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Display Order</TableHead>
                          <TableHead className="w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">#{category.id}</TableCell>
                            <TableCell>{category.name}</TableCell>
                            <TableCell>{category.displayName}</TableCell>
                            <TableCell>{category.description || '-'}</TableCell>
                            <TableCell>{category.displayOrder || '-'}</TableCell>
                            <TableCell className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCategoryDialog(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              
              {/* Menu Items Section */}
              <Card>
                <CardHeader>
                  <div className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Menu Items</CardTitle>
                      <CardDescription>
                        Manage coffee shop menu items
                      </CardDescription>
                    </div>
                    <Button 
                      variant="default"
                      onClick={() => openMenuItemDialog()}
                    >
                      <CoffeeIcon className="h-4 w-4 mr-2" />
                      Add Menu Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {menuItemsError ? (
                    <div className="text-red-500">Failed to load menu items</div>
                  ) : menuItems && menuItems.length === 0 ? (
                    <div className="text-center py-4">No menu items found</div>
                  ) : (
                    <Table>
                      <TableCaption>List of all menu items</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(menuItems) && menuItems.map((item: MenuItem) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">#{item.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    className="w-10 h-10 object-cover rounded-md"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                                    <CoffeeIcon className="h-5 w-5 text-gray-500" />
                                  </div>
                                )}
                                <span>{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>
                              {item.hasSizes ? (
                                <div className="flex flex-col">
                                  <span>S: {formatCurrency(item.price)}</span>
                                  <span>M: {formatCurrency(item.mediumPrice || 0)}</span>
                                  <span>L: {formatCurrency(item.largePrice || 0)}</span>
                                </div>
                              ) : (
                                formatCurrency(item.price)
                              )}
                            </TableCell>
                            <TableCell className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMenuItemDialog(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteMenuItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* QR Scanner Tab */}
          <TabsContent value="qrscanner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Customer QR Code Scanner
                </CardTitle>
                <CardDescription>
                  Scan a customer's QR code to view their profile information and manage their account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-6">
                  {/* Camera View */}
                  <div className="relative aspect-video w-full max-w-md mx-auto border border-border rounded-md overflow-hidden bg-muted">
                    {isScanning ? (
                      <>
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover"
                        />
                        {/* Active scanning indicator */}
                        <div className="absolute top-2 right-2 flex items-center bg-black/70 text-white text-xs px-2 py-1 rounded">
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
                          <span>Scanning</span>
                        </div>
                        
                        {/* Scanning guide */}
                        <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded text-center">
                          <p>Position the QR code in the center of the frame</p>
                        </div>
                        
                        {/* Scanning frame animation */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-primary-500 rounded-lg animate-pulse"></div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <div className="mb-4 text-4xl text-muted-foreground">
                          <QrCode size={64} />
                        </div>
                        <p className="text-muted-foreground mb-2">
                          Camera is currently inactive. Click Start to begin scanning.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Please ensure camera permissions are enabled in your browser.
                        </p>
                        
                        {/* Browser permission guidance */}
                        <div className="mt-4 text-xs text-muted-foreground">
                          <p className="font-semibold mb-1">Browser permission help:</p>
                          <ul className="list-disc pl-5 text-left">
                            <li>Chrome: Look for camera icon in address bar</li>
                            <li>Firefox: Check the permission popup</li>
                            <li>Safari: Check Settings → Websites → Camera</li>
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Error indicator */}
                    {scannerError && isScanning && (
                      <div className="absolute inset-0 border-2 border-destructive pointer-events-none animate-pulse">
                        <div className="absolute top-0 left-0 right-0 bg-destructive/80 text-white text-xs p-2 text-center">
                          Camera error - check permissions
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Controls */}
                  <div className="flex justify-center gap-4">
                    {!isScanning ? (
                      <Button 
                        variant="default" 
                        onClick={handleStartScan}
                        disabled={getUserByQrCodeMutation.isPending}
                        className="gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Start Scanner
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={handleStopScan}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Stop Scanner
                      </Button>
                    )}
                  </div>
                  
                  {/* Status messages */}
                  {getUserByQrCodeMutation.isPending && (
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Loading user data...</span>
                    </div>
                  )}
                  
                  {/* Error message */}
                  {scannerError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Scanner Error</AlertTitle>
                      <AlertDescription>{scannerError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Helper message */}
                  {isScanning && !scannerError && !scannedUser && !getUserByQrCodeMutation.isPending && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Ready to Scan</AlertTitle>
                      <AlertDescription>
                        Position the QR code in the center of the frame. The scanner will automatically detect valid codes.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Scanned user info */}
                  {scannedUser && (
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Customer Information</CardTitle>
                          <Badge variant={scannedUser.isAdmin ? "default" : "outline"}>
                            {scannedUser.isAdmin ? "Admin" : "Customer"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="overflow-hidden">
                              <p className="text-sm text-muted-foreground truncate">Username</p>
                              <p className="font-medium truncate">{scannedUser.username}</p>
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm text-muted-foreground truncate">Full Name</p>
                              <p className="font-medium truncate">{scannedUser.fullName || 'Not provided'}</p>
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm text-muted-foreground truncate">Email</p>
                              <p className="font-medium truncate">{scannedUser.email || 'Not provided'}</p>
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm text-muted-foreground truncate">Account Credits</p>
                              <p className="font-semibold text-primary truncate">{formatCurrency(scannedUser.credits)}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => openUserDialog(scannedUser)}
                              className="flex-1 gap-1 h-auto py-2"
                              size="sm"
                            >
                              <UserIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">Manage Customer</span>
                            </Button>
                            <Button
                              variant="default"
                              onClick={() => {
                                setSelectedUser(scannedUser);
                                setCreditAmount("10");
                                setAddCreditDialog(true);
                              }}
                              className="flex-1 gap-1 h-auto py-2"
                              size="sm"
                            >
                              <CreditCard className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">Add Credits</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Push Notification Toggle - Important for Admin Notifications */}
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <Bell className="mr-2 h-5 w-5 text-primary" />
                  Admin Notifications
                </CardTitle>
                <CardDescription>
                  Enable notifications to receive alerts when new orders are placed
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary">Important</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <AdminPushNotificationToggle />
                
                <div className="mt-4 border-t pt-4">
                  <h3 className="text-md font-semibold mb-2">
                    Notification Troubleshooting
                  </h3>
                  <div className="flex items-center">
                    <Button 
                      onClick={handleSendTestNotification} 
                      disabled={testNotificationLoading}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {testNotificationLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                      Send Test Notification
                    </Button>
                    <p className="ml-4 text-sm text-muted-foreground">
                      Use this to verify if your device can receive push notifications
                    </p>
                  </div>
                  
                  {/* App Update Notification Section */}
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-semibold mb-4">App Update Notifications</h3>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => setUpdateNotificationDialog(true)}
                        disabled={sendUpdateNotificationMutation.isPending}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {sendUpdateNotificationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        Send Update Notification
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Send email notifications to all users about app updates
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsDialog} onOpenChange={setOrderDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <div className="text-sm">
                  <p><span className="font-semibold">Order ID:</span> #{selectedOrder.id}</p>
                  <p><span className="font-semibold">Customer:</span> {selectedOrder.userName} {selectedOrder.userFullName ? `(${selectedOrder.userFullName})` : ''}</p>
                  <p><span className="font-semibold">Date:</span> {formatDate(new Date(selectedOrder.createdAt))}</p>
                  <p><span className="font-semibold">Status:</span> {selectedOrder.status}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="mb-2 font-medium">Order Items</h3>
            {selectedOrder && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder.items as CartItem[]).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(selectedOrder.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setOrderDetailsDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setOrderDetailsDialog(false);
                openOrderStatusDialog(selectedOrder!);
              }}
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Status Dialog */}
      <Dialog open={orderStatusDialog} onOpenChange={setOrderStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order #{selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderStatusDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateOrderStatus}
              disabled={updateOrderStatusMutation.isPending}
            >
              {updateOrderStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
            <DialogDescription>
              Manage user: {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">User Info</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">ID:</div><div className="truncate">#{selectedUser?.id}</div>
                <div className="font-medium">Username:</div><div className="truncate">{selectedUser?.username}</div>
                <div className="font-medium">Email:</div><div className="truncate">{selectedUser?.email || "-"}</div>
                <div className="font-medium">Current Credits:</div><div className="truncate">{selectedUser ? formatCurrency(selectedUser.credits) : "-"}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Add Credits</h3>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
                <Button
                  onClick={handleAddUserCredits}
                  disabled={addUserCreditsMutation.isPending}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[10, 20, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant={creditAmount === amount.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreditAmount(amount.toString())}
                    className="px-1 w-full"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Admin Status</h3>
              <div className="flex items-center justify-between">
                <span>Grant admin privileges</span>
                <Switch
                  checked={isUserAdmin}
                  onCheckedChange={setIsUserAdmin}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleUpdateUserAdminStatus}
                disabled={updateUserAdminStatusMutation.isPending}
              >
                <UserCog className="h-4 w-4 mr-2" />
                {updateUserAdminStatusMutation.isPending
                  ? "Updating Privileges..."
                  : "Update Privileges"}
              </Button>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Account Status</h3>
              <div className="flex items-center justify-between">
                <span>Account active</span>
                <Switch
                  checked={isUserActive}
                  onCheckedChange={setIsUserActive}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleUpdateUserActiveStatus}
                disabled={updateUserActiveStatusMutation.isPending}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {updateUserActiveStatusMutation.isPending
                  ? "Updating Status..."
                  : isUserActive ? "Activate Account" : "Deactivate Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Menu Item Dialog */}
      <Dialog open={menuItemDialog} onOpenChange={(open) => {
        if (!open) resetMenuItemForm();
        setMenuItemDialog(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditingMenuItem ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
            <DialogDescription>
              {isEditingMenuItem 
                ? `Update details for ${selectedMenuItem?.name}`
                : "Add a new item to the menu"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={menuItemForm.name || ""}
                onChange={(e) => handleMenuItemFormChange("name", e.target.value)}
                placeholder="Cappuccino"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={menuItemForm.description || ""}
                onChange={(e) => handleMenuItemFormChange("description", e.target.value)}
                placeholder="Delicious coffee with frothy milk"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={menuItemForm.category || ""}
                  onValueChange={(value) => handleMenuItemFormChange("category", value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.map((categoryName) => (
                      <SelectItem key={categoryName} value={categoryName}>
                        {categoryName}
                      </SelectItem>
                    ))}
                    {/* Allow adding custom category if it doesn't exist yet */}
                    {menuItemForm.category && !categoryNames.includes(menuItemForm.category) && (
                      <SelectItem value={menuItemForm.category}>
                        {menuItemForm.category} (New)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">
                  {menuItemForm.hasSizes ? "Small Price ($) *" : "Price ($) *"}
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={menuItemForm.price || ""}
                  onChange={(e) => handleMenuItemFormChange("price", Number(e.target.value))}
                  placeholder="4.99"
                />
              </div>
            </div>
            
            <div className="space-y-4 py-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasSizes" 
                  checked={menuItemForm.hasSizes || false}
                  onCheckedChange={(checked) => 
                    handleMenuItemFormChange("hasSizes", Boolean(checked))
                  }
                />
                <Label htmlFor="hasSizes" className="font-medium">
                  Enable size options (small, medium, large)
                </Label>
              </div>
              
              {menuItemForm.hasSizes && (
                <div className="grid grid-cols-2 gap-4 pl-6 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="mediumPrice">Medium Price ($) *</Label>
                    <Input
                      id="mediumPrice"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={menuItemForm.mediumPrice || ""}
                      onChange={(e) => handleMenuItemFormChange("mediumPrice", Number(e.target.value))}
                      placeholder="5.99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="largePrice">Large Price ($) *</Label>
                    <Input
                      id="largePrice"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={menuItemForm.largePrice || ""}
                      onChange={(e) => handleMenuItemFormChange("largePrice", Number(e.target.value))}
                      placeholder="6.99"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Item Options Section */}
            <div className="space-y-4 py-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasOptions" 
                  checked={menuItemForm.hasOptions || false}
                  onCheckedChange={(checked) => 
                    handleMenuItemFormChange("hasOptions", Boolean(checked))
                  }
                />
                <Label htmlFor="hasOptions" className="font-medium">
                  Enable item options
                </Label>
              </div>
              
              {menuItemForm.hasOptions && (
                <div className="pl-6 mt-2 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Label>Current Options</Label>
                        <Badge variant="outline" className="ml-2">
                          {menuItemOptions.length} options
                        </Badge>
                      </div>
                      {isEditingMenuItem && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            // Clear options immediately in the UI
                            setMenuItemOptions([]);
                            
                            // If we're editing an existing menu item, clear from database immediately
                            if (selectedMenuItem?.id && menuItemOptions.some(o => o.id)) {
                              notify({
                                title: "Clearing Options",
                                description: "Removing all options for this item..."
                              });
                              
                              // We'll let saveMenuItemOptions handle the actual deletion when form is saved
                            }
                          }}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    
                    {menuItemOptions.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {/* Parent/group options */}
                        {menuItemOptions.filter(o => o.isParent).map((group, index) => (
                          <div key={`group-${index}`} className="border rounded-md overflow-hidden">
                            <div className="flex items-center justify-between p-2 bg-muted/50">
                              <div>
                                <span className="font-medium text-primary">{group.name}</span>
                                <Badge variant="outline" className="ml-2">Group</Badge>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveOption(menuItemOptions.indexOf(group))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Child options of this group */}
                            <div className="p-2 pl-4 space-y-1">
                              {menuItemOptions
                                .filter(o => !o.isParent && (
                                  // Match either by database ID if the group has one
                                  (group.id && o.parentId === group.id) ||
                                  // Or by position in the array for newly added options
                                  (!group.id && o.parentId === menuItemOptions.indexOf(group))
                                ))
                                .map((option, childIndex) => (
                                  <div key={`child-${childIndex}`} className="flex items-center justify-between py-1 px-2">
                                    <div>
                                      <span className="font-medium">{option.name}</span>
                                      {option.priceAdjustment > 0 && (
                                        <span className="ml-2 text-muted-foreground">
                                          (+{formatCurrency(option.priceAdjustment)})
                                        </span>
                                      )}
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleRemoveOption(menuItemOptions.indexOf(option))}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))
                              }
                              
                              {menuItemOptions.filter(o => !o.isParent && (
                                // Match either by database ID if the group has one
                                (group.id && o.parentId === group.id) ||
                                // Or by position in the array for newly added options
                                (!group.id && o.parentId === menuItemOptions.indexOf(group))
                              )).length === 0 && (
                                <div className="text-sm text-muted-foreground italic px-2">
                                  No options in this group yet. Add some below.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Standalone options (not in any group) */}
                        {menuItemOptions.filter(o => !o.isParent && (o.parentId === undefined || o.parentId === null)).map((option, index) => (
                          <div key={`option-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                            <div>
                              <span className="font-medium">{option.name}</span>
                              {option.priceAdjustment > 0 && (
                                <span className="ml-2 text-muted-foreground">
                                  (+{formatCurrency(option.priceAdjustment)})
                                </span>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveOption(menuItemOptions.indexOf(option))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        No options added yet. Add some below.
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label>Add New Option</Label>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox 
                        id="isParentOption" 
                        checked={optionForm.isParent || false}
                        onCheckedChange={(checked) => 
                          handleOptionFormChange("isParent", Boolean(checked))
                        }
                      />
                      <Label htmlFor="isParentOption" className="text-sm">
                        This is an option group
                      </Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Input
                          placeholder={optionForm.isParent 
                            ? "Group name (e.g. 'Milk Alternatives', 'Flavors')" 
                            : "Option name (e.g. 'Vanilla', 'Almond Milk')"}
                          value={optionForm.name}
                          onChange={(e) => handleOptionFormChange("name", e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price adjustment"
                          value={optionForm.priceAdjustment}
                          onChange={(e) => handleOptionFormChange("priceAdjustment", Number(e.target.value))}
                          disabled={optionForm.isParent}
                        />
                      </div>
                    </div>
                    
                    {!optionForm.isParent && menuItemOptions.filter(o => o.isParent).length > 0 && (
                      <div className="space-y-1">
                        <Label htmlFor="parentOption" className="text-sm">Parent Group (optional)</Label>
                        <Select 
                          value={optionForm.parentId?.toString() || "none"}
                          onValueChange={(value) => {
                            console.log("Selected parent value:", value);
                            
                            if (!value || value === "none") {
                              handleOptionFormChange("parentId", undefined);
                              return;
                            }
                            
                            // Check if it's a temp value (for newly added parent groups)
                            if (value.startsWith('temp-')) {
                              const index = parseInt(value.replace('temp-', ''));
                              const parentGroups = menuItemOptions.filter(o => o.isParent);
                              if (index >= 0 && index < parentGroups.length) {
                                // Use the index in the array
                                const actualParent = parentGroups[index];
                                const actualIndex = menuItemOptions.indexOf(actualParent);
                                console.log("Using array index for temp parent:", actualIndex);
                                handleOptionFormChange("parentId", actualIndex);
                              }
                              return;
                            }
                            
                            // Try to parse as a number for DB ID
                            const valueAsNumber = parseInt(value);
                            if (!isNaN(valueAsNumber)) {
                              // First check if it's a valid DB ID for an existing parent
                              const parentWithDbId = menuItemOptions.find(
                                o => o.isParent && o.id === valueAsNumber
                              );
                              
                              if (parentWithDbId) {
                                console.log("Found parent with DB ID:", valueAsNumber);
                                handleOptionFormChange("parentId", valueAsNumber);
                                return;
                              }
                            }
                            
                            // Fallback to the original logic
                            console.log("Using fallback logic for parent selection");
                            const parentGroup = menuItemOptions
                              .filter(o => o.isParent)
                              .find((group, index) => 
                                (group.id?.toString() === value) || 
                                (!group.id && index.toString() === value)
                              );
                            
                            if (parentGroup?.id) {
                              // Use the database ID
                              console.log("Selected parent by DB ID:", parentGroup.id);
                              handleOptionFormChange("parentId", parentGroup.id);
                            } else if (parentGroup) {
                              // Use the index in the array
                              const idx = menuItemOptions.indexOf(parentGroup);
                              console.log("Selected parent by array index:", idx);
                              handleOptionFormChange("parentId", idx);
                            } else {
                              console.log("Could not find parent group, clearing selection");
                              handleOptionFormChange("parentId", undefined);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a parent group (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No parent (standalone option)</SelectItem>
                            {/* Debug and show parent groups with better information */}
                            {(() => {
                              // Log all parent groups for debugging
                              console.log("All parent option groups:", 
                                menuItemOptions.filter(o => o.isParent).map(g => ({
                                  name: g.name,
                                  id: g.id,
                                  isParent: g.isParent
                                }))
                              );
                              
                              return menuItemOptions
                                .filter(o => o.isParent)
                                .map((group, index) => {
                                  const valueToUse = group.id ? group.id.toString() : `temp-${index}`;
                                  console.log(`Rendering option ${group.name} with value ${valueToUse}`);
                                  return (
                                    <SelectItem 
                                      key={`parent-${group.id || index}`} 
                                      value={valueToUse}
                                    >
                                      {group.name} {group.id ? `(#${group.id})` : '(New)'}
                                    </SelectItem>
                                  );
                                });
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddOption}
                      className="w-full mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {optionForm.isParent ? "Add Option Group" : "Add Option"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    id="imageUrl"
                    value={menuItemForm.imageUrl || ""}
                    onChange={(e) => handleMenuItemFormChange("imageUrl", e.target.value)}
                    placeholder="Image URL or upload an image"
                  />
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="max-w-sm"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          uploadImageMutation.mutate(e.target.files[0]);
                        }
                      }}
                    />
                    {uploadImageMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </div>
                
                {menuItemForm.imageUrl && (
                  <div className="flex items-center justify-center border rounded-md p-2">
                    <img 
                      src={menuItemForm.imageUrl} 
                      alt="Menu item preview" 
                      className="max-h-32 object-contain" 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMenuItemDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMenuItemSubmit}
              disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
            >
              {createMenuItemMutation.isPending || updateMenuItemMutation.isPending
                ? "Saving..."
                : isEditingMenuItem ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New User Dialog */}
      <Dialog open={newUserDialog} onOpenChange={(open) => {
        if (!open) resetNewUserForm();
        setNewUserDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new customer to the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={newUserForm.username}
                onChange={(e) => setNewUserForm(prev => ({...prev, username: e.target.value}))}
                placeholder="johndoe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm(prev => ({...prev, email: e.target.value}))}
                placeholder="john@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm(prev => ({...prev, password: e.target.value}))}
                placeholder="••••••••"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="credits">Initial Credits</Label>
              <Input
                id="credits"
                type="number"
                min="0"
                value={newUserForm.credits}
                onChange={(e) => setNewUserForm(prev => ({...prev, credits: Number(e.target.value)}))}
                placeholder="0"
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="isAdmin"
                onCheckedChange={(checked) => 
                  setNewUserForm(prev => ({...prev, isAdmin: checked === true}))
                }
              />
              <Label htmlFor="isAdmin" className="cursor-pointer">Make admin user</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewUserDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={(open) => {
        if (!open) resetCategoryForm();
        setCategoryDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {isEditingCategory 
                ? `Update details for ${selectedCategory?.displayName}`
                : "Add a new category to the menu"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Key *</Label>
              <Input
                id="name"
                value={categoryForm.name || ""}
                onChange={(e) => handleCategoryFormChange("name", e.target.value)}
                placeholder="breakfast"
              />
              <p className="text-xs text-muted-foreground">
                This is used as the internal identifier and should be lowercase without spaces
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                value={categoryForm.displayName || ""}
                onChange={(e) => handleCategoryFormChange("displayName", e.target.value)}
                placeholder="Breakfast"
              />
              <p className="text-xs text-muted-foreground">
                This is shown to customers when browsing the menu
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={categoryForm.description || ""}
                onChange={(e) => handleCategoryFormChange("description", e.target.value)}
                placeholder="Morning breakfast options served until 11am"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                min="0"
                value={categoryForm.displayOrder?.toString() || "0"}
                onChange={(e) => handleCategoryFormChange("displayOrder", parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Categories with lower numbers will appear first in the menu
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCategorySubmit}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending
                ? "Saving..."
                : isEditingCategory ? "Update Category" : "Add Category"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Data Dialog */}
      <Dialog open={clearDataDialog} onOpenChange={setClearDataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Clear System Data</DialogTitle>
            <DialogDescription>
              This will permanently remove data from the system. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Clearing data is a permanent action and cannot be reversed. Make sure you have a backup if needed.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">Clear All Users</h4>
                    <p className="text-sm text-muted-foreground">
                      Remove all non-admin users from the system
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => clearAllUsersMutation.mutate()}
                    disabled={clearAllUsersMutation.isPending}
                  >
                    {clearAllUsersMutation.isPending ? 
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                      <Trash2 className="h-4 w-4 mr-2" />
                    }
                    Clear Users
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Admin accounts will be preserved
                </p>
              </div>
              
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">Clear All Orders</h4>
                    <p className="text-sm text-muted-foreground">
                      Remove all orders from the system
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => clearAllOrdersMutation.mutate()}
                    disabled={clearAllOrdersMutation.isPending}
                  >
                    {clearAllOrdersMutation.isPending ? 
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 
                      <Trash2 className="h-4 w-4 mr-2" />
                    }
                    Clear Orders
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  All order history and status information will be permanently deleted
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearDataDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Notification Dialog */}
      <Dialog open={updateNotificationDialog} onOpenChange={setUpdateNotificationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send App Update Notification</DialogTitle>
            <DialogDescription>
              Send email notifications to all users about app updates
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="version" className="text-right">
                Version
              </Label>
              <Input
                id="version"
                placeholder="e.g., v2.1.0"
                value={updateVersion}
                onChange={(e) => setUpdateVersion(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAdmins"
                checked={includeAdmins}
                onCheckedChange={(checked) => setIncludeAdmins(checked === true)}
              />
              <Label htmlFor="includeAdmins" className="text-sm">
                Include admin users in notification
              </Label>
            </div>
            
            <div className="text-sm text-muted-foreground">
              This will send an email notification to all users with email addresses about the new app version.
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateNotificationDialog(false);
                setUpdateVersion("");
                setIncludeAdmins(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (updateVersion.trim()) {
                  sendUpdateNotificationMutation.mutate({
                    version: updateVersion.trim(),
                    includeAdmins
                  });
                  setUpdateNotificationDialog(false);
                  setUpdateVersion("");
                  setIncludeAdmins(false);
                }
              }}
              disabled={!updateVersion.trim() || sendUpdateNotificationMutation.isPending}
            >
              {sendUpdateNotificationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}