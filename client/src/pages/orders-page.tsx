import { useCallback } from "react";
import { AppHeader } from "@/components/app-header";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Order, CartItem } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useNativeNotifications } from "@/hooks/use-native-notifications";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { notifySuccess, notifyError } = useNativeNotifications();
  
  const {
    data: orders = [],
    isLoading,
    error,
    isRefetching,
  } = useQuery<Order[], Error>({
    queryKey: ["/api/orders"],
    refetchOnWindowFocus: false, // Disable excessive refetching to improve scroll performance
    refetchOnMount: true,
    refetchInterval: false, // Completely disable polling
    refetchOnReconnect: false, // Don't refetch on network reconnect
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      notifySuccess("Orders Updated", "Latest order information loaded");
    } catch (error) {
      notifyError("Refresh Failed", "Could not refresh order information");
    }
  }, [queryClient]);

  return (
    <div className="min-h-screen flex flex-col bg-secondary mobile-scroll">
      <AppHeader />

      <div className="flex-1 overflow-y-auto mobile-scroll">
        <main className="p-5 main-content-with-header mobile-scroll">
          <div className="flex justify-between items-center mb-4">
            <h1 className="font-semibold text-2xl text-primary">Order History</h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-500">Failed to load orders</p>
              </CardContent>
            </Card>
          ) : sortedOrders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">You haven't placed any orders yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sortedOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>
                      Placed on {formatDate(new Date(order.createdAt))}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="items">
                        <AccordionTrigger>Order Details</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {(order.items as CartItem[]).map((item: CartItem, idx: number) => (
                              <div key={idx} className="flex justify-between py-2">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-gray-500">
                                    Quantity: {item.quantity}
                                  </div>
                                </div>
                                <div className="font-medium">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-semibold">
                              <div>Total</div>
                              <div>{formatCurrency(order.total)}</div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
