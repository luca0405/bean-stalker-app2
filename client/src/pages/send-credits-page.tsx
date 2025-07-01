import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MessageSquare, User, DollarSign, Shield, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface ShareCreditsResponse {
  success: boolean;
  verificationCode: string;
  smsMessage: string;
  expiresAt: string;
}

export default function SendCreditsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [showSMSPreview, setShowSMSPreview] = useState(false);
  const [smsDetails, setSmsDetails] = useState<ShareCreditsResponse | null>(null);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
  };

  const shareCreditsMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; amount: number }) => {
      const response = await apiRequest("POST", "/api/share-credits", data);
      return await response.json();
    },
    onSuccess: (data: ShareCreditsResponse) => {
      setSmsDetails(data);
      setShowSMSPreview(true);
      toast({
        title: "Credit Share Ready",
        description: "Verification code generated. Send the SMS to complete sharing.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Share Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendSMS = () => {
    if (!smsDetails) return;
    
    // Create SMS URL for native SMS app
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(smsDetails.smsMessage)}`;
    
    // Open SMS app
    window.location.href = smsUrl;
    
    toast({
      title: "SMS App Opened",
      description: "Complete the transfer by sending the text message.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const creditAmount = parseFloat(amount);
    if (!phoneNumber || !creditAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter phone number and amount.",
        variant: "destructive",
      });
      return;
    }

    if (creditAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be greater than $0.",
        variant: "destructive",
      });
      return;
    }

    if (!user || creditAmount > user.credits) {
      toast({
        title: "Insufficient Credits",
        description: "You don't have enough credits for this transfer.",
        variant: "destructive",
      });
      return;
    }

    shareCreditsMutation.mutate({
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      amount: creditAmount
    });
  };

  if (showSMSPreview && smsDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-4 pt-4"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSMSPreview(false)}
              className="p-2 h-auto"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-800">Send SMS</h1>
          </motion.div>

          {/* SMS Preview Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-green-800">Ready to Send</CardTitle>
                <CardDescription className="text-green-600">
                  Your SMS message is ready. Tap "Send SMS" to open your messaging app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Transfer Details */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">To:</span>
                    <span className="font-semibold">{phoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amount:</span>
                    <span className="font-semibold text-green-600">${amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Code:</span>
                    <span className="font-mono font-bold text-lg">{smsDetails.verificationCode}</span>
                  </div>
                </div>

                {/* SMS Preview */}
                <div className="bg-slate-100 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-2">Message Preview:</p>
                  <div className="bg-white rounded-lg p-3 border-l-4 border-green-500">
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {smsDetails.smsMessage}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button 
                    onClick={handleSendSMS}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Send SMS
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSMSPreview(false)}
                    className="w-full"
                  >
                    Edit Share
                  </Button>
                </div>

                {/* Important Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-amber-800 font-medium">Important:</p>
                      <p className="text-xs text-amber-700">
                        Credits will be deducted from your account only after staff verify this code at the store counter.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4 pt-4"
        >
          <Link href="/">
            <Button variant="ghost" size="sm" className="p-2 h-auto">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Share Credits</h1>
        </motion.div>

        {/* Available Balance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-green-100 text-sm">Available Balance</p>
                  <p className="text-2xl font-bold">${user?.credits?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Send Credits Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-600" />
                <span>Share Credits</span>
              </CardTitle>
              <CardDescription>
                Share credits with non-members via SMS. They can claim them at our store counter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Recipient's Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="000 000 0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    maxLength={12}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Send ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                    max={user?.credits || 0}
                    className="text-lg"
                  />
                  {amount && parseFloat(amount) > 0 && (
                    <p className="text-sm text-slate-600">
                      Remaining balance: ${((user?.credits || 0) - parseFloat(amount)).toFixed(2)}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                  disabled={shareCreditsMutation.isPending || !phoneNumber || !amount}
                >
                  {shareCreditsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating Code...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Generate SMS Code
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-slate-100 border-slate-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">How It Works</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
                  <p>Enter non-member's phone number and credit amount</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
                  <p>We generate a unique verification code</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
                  <p>Send SMS using your phone's messaging app</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">4</span>
                  <p>Non-member shows code at store counter</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">5</span>
                  <p>Staff verifies code and deducts credits from your account</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}