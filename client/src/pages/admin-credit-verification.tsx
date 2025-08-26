import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Phone, User, DollarSign, Search, CheckCircle2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNativeNotification } from "@/services/native-notification-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface PendingTransfer {
  id: number;
  verificationCode: string;
  senderId: number;
  recipientPhone: string;
  amount: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  senderName?: string;
  senderFullName?: string;
  verifiedAt?: string;
  verifierName?: string;
}

export default function AdminCreditVerification() {
  const [verificationCode, setVerificationCode] = useState("");
  const { notify } = useNativeNotification();
  const queryClient = useQueryClient();

  // Get all pending transfers
  const { data: pendingTransfers, isLoading } = useQuery<PendingTransfer[]>({
    queryKey: ["/api/admin/pending-credit-transfers"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get all credit transfers (pending and verified)
  const { data: allTransfers, isLoading: isLoadingAll } = useQuery<PendingTransfer[]>({
    queryKey: ["/api/admin/all-credit-transfers"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Verify credit code mutation
  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/verify-credit-share", { verificationCode: code });
      return await res.json();
    },
    onSuccess: (data) => {
      notify({
        title: "Code Verified Successfully",
        description: `Deducted $${data.amount} from ${data.senderName}`,
        variant: "default",
      });
      setVerificationCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-credit-transfers"] });
    },
    onError: (error: any) => {
      notify({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code",
        variant: "destructive",
      });
    },
  });

  const handleQuickVerify = (code: string) => {
    verifyCodeMutation.mutate(code);
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      notify({
        title: "Code Required",
        description: "Please enter a verification code",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(verificationCode.trim());
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 iphone-fullscreen" style={{ 
      height: '-webkit-fill-available',
      width: '100vw',
      margin: 0,
      padding: 0 
    }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold text-slate-800">Credit Share Verification</h1>
          <p className="text-slate-600">Verify SMS credit sharing codes from customers</p>
        </motion.div>

        {/* Manual Verification Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Manual Code Verification
              </CardTitle>
              <CardDescription>
                Enter the 6-digit code from customer's phone to verify their credit share
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={verifyCodeMutation.isPending || verificationCode.length !== 6}
                  className="w-full"
                >
                  {verifyCodeMutation.isPending ? "Verifying..." : "Verify Code"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabbed Credit Transfers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="pending" className="w-full">
                <div className="px-6 pt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Pending ({pendingTransfers?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="verified" className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Verified ({allTransfers?.filter(t => t.status === "verified").length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="pending" className="p-6 pt-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="mt-2 text-slate-600">Loading pending transfers...</p>
                    </div>
                  ) : !pendingTransfers || pendingTransfers.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                      <h3 className="text-lg font-medium text-slate-800">All caught up!</h3>
                      <p className="text-slate-600">No pending credit shares to verify</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingTransfers.map((transfer) => (
                        <motion.div
                          key={transfer.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm"
                        >
                          <div className="space-y-4">
                            {/* Header with status and verification code */}
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 px-3 py-1">
                                PENDING
                              </Badge>
                              <div className="text-center">
                                <div className="text-2xl font-mono font-bold text-slate-800 bg-slate-100 px-4 py-2 rounded-lg border-2 border-slate-300">
                                  {transfer.verificationCode}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 font-medium">Code</div>
                              </div>
                            </div>
                            
                            {/* Customer Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm text-slate-500">Customer</div>
                                  <div className="font-medium text-slate-800">
                                    {transfer.senderFullName || transfer.senderName || `User #${transfer.senderId}`}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-2 rounded-full">
                                  <Phone className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                  <div className="text-sm text-slate-500">Phone</div>
                                  <div className="font-medium text-slate-800">{transfer.recipientPhone}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-full">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <div className="text-sm text-slate-500">Amount</div>
                                  <div className="font-bold text-green-700 text-lg">${transfer.amount}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Footer with time and action */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                              <div className="text-sm text-slate-500">
                                Created {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
                              </div>
                              <Button
                                onClick={() => handleQuickVerify(transfer.verificationCode)}
                                disabled={verifyCodeMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 px-6"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {verifyCodeMutation.isPending ? "Verifying..." : "Verify Credit"}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="verified" className="p-6 pt-4">
                  {isLoadingAll ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="mt-2 text-slate-600">Loading credit sharing history...</p>
                    </div>
                  ) : allTransfers?.filter(t => t.status === "verified").length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                      <h3 className="text-lg font-medium text-slate-800">No verified shares yet</h3>
                      <p className="text-slate-600">Verified credit shares will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allTransfers?.filter(t => t.status === "verified").map((transfer) => (
                        <motion.div
                          key={transfer.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="border border-green-200 rounded-lg p-4 bg-green-50"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                VERIFIED
                              </Badge>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-500" />
                                <span className="font-medium">
                                  {transfer.senderFullName || transfer.senderName || `User #${transfer.senderId}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-slate-500" />
                                <span className="text-slate-600">📱 {transfer.recipientPhone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-700">${transfer.amount}</span>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-mono font-bold text-slate-600 bg-white px-2 py-1 rounded border text-xs">
                                  {transfer.verificationCode}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500">
                              <span>Created {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}</span>
                              {transfer.verifiedAt && (
                                <span>
                                  Verified {formatDistanceToNow(new Date(transfer.verifiedAt), { addSuffix: true })}
                                  {transfer.verifierName && ` by ${transfer.verifierName}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}