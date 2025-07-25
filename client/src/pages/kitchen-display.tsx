import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, CheckCircle, AlertCircle, Coffee, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useNativeNotification } from "@/services/native-notification-service";

interface KitchenOrder {
  id: number;
  customerName: string;
  items: any[];
  status: string;
  total: number;
  createdAt: string;
  estimatedTime: number;
  priority: number;
  station: string;
}

export default function KitchenDisplayPage() {
  const { notify } = useNativeNotification();
  const queryClient = useQueryClient();
  
  const { data: orders = [], isLoading } = useQuery<KitchenOrder[]>({
    queryKey: ["/api/kitchen/orders"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, assignedTo, estimatedTime }: {
      orderId: number;
      status: string;
      assignedTo?: string;
      estimatedTime?: number;
    }) => {
      const response = await apiRequest("PATCH", `/api/kitchen/orders/${orderId}`, {
        status,
        assignedTo,
        estimatedTime
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      notify({
        title: "Order Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: () => {
      notify({
        title: "Update Failed",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return 'border-red-500 bg-red-50';
      case 2: return 'border-orange-500 bg-orange-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateOrderMutation.mutate({ orderId, status: newStatus });
  };

  // Group orders by status
  const pendingOrders = orders.filter(order => order.status === 'pending');
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kitchen Display System</h1>
            <p className="text-gray-600 mt-1">Bean Stalker Restaurant Operations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {orders.length} Active Orders
            </Badge>
          </div>
        </div>
      </div>

      {/* Order Status Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Pending ({pendingOrders.length})
            </h2>
          </div>
          
          {pendingOrders.map(order => (
            <Card key={order.id} className={`${getPriorityColor(order.priority)} border-l-4`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {order.customerName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      {item.notes && (
                        <span className="text-gray-500 italic">({item.notes})</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold">${order.total.toFixed(2)}</span>
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusUpdate(order.id, 'preparing')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Preparing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preparing Orders */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Preparing ({preparingOrders.length})
            </h2>
          </div>
          
          {preparingOrders.map(order => (
            <Card key={order.id} className={`${getPriorityColor(order.priority)} border-l-4`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {order.customerName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    Est. {order.estimatedTime} min
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      {item.notes && (
                        <span className="text-gray-500 italic">({item.notes})</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold">${order.total.toFixed(2)}</span>
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusUpdate(order.id, 'ready')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Ready
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ready Orders */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Ready ({readyOrders.length})
            </h2>
          </div>
          
          {readyOrders.map(order => (
            <Card key={order.id} className={`${getPriorityColor(order.priority)} border-l-4`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {order.customerName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    Ready for pickup
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      {item.notes && (
                        <span className="text-gray-500 italic">({item.notes})</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold">${order.total.toFixed(2)}</span>
                  <Button 
                    size="sm" 
                    onClick={() => handleStatusUpdate(order.id, 'completed')}
                    variant="outline"
                  >
                    Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-12">
          <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h3>
          <p className="text-gray-600">New orders will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}