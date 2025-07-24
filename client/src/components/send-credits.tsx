import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useNativeNotifications } from "@/hooks/use-native-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Send, Phone, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SendCreditsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SendCredits({ open: externalOpen, onOpenChange }: SendCreditsProps = {}) {
  const { notifySuccess, notifyError, notifyWarning } = useNativeNotifications();
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [includeMessage, setIncludeMessage] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [recipientInfo, setRecipientInfo] = useState<{ id: number, username: string } | null>(null);
  
  // Use either controlled or uncontrolled open state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  // Mutation to look up a user by phone number
  const lookupUserMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await apiRequest("GET", `/api/user/lookup?phoneNumber=${encodeURIComponent(phoneNumber)}`);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data && data.id) {
        setRecipientInfo(data);
        notifySuccess("User found", `Found user: ${data.username}`);
      } else {
        setRecipientInfo(null);
        notifyError("User not found", "No user with that phone number was found");
      }
      setIsSearching(false);
    },
    onError: (error: Error) => {
      setRecipientInfo(null);
      notifyError("Lookup failed", error.message);
      setIsSearching(false);
    },
  });
  
  // Mutation to send credits
  const sendCreditsMutation = useMutation({
    mutationFn: async () => {
      if (!recipientInfo) throw new Error("No recipient selected");
      
      const data = {
        recipientId: recipientInfo.id,
        phoneNumber,
        amount,
        message: includeMessage ? message : undefined,
      };
      const res = await apiRequest("POST", "/api/send-credits", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-transactions"] });
      
      notifySuccess(
        "Credits sent successfully",
        `${formatCurrency(amount)} has been sent to ${recipientInfo?.username}.`
      );
      
      // Reset form and close dialog
      setPhoneNumber("");
      setAmount(0);
      setMessage("");
      setRecipientInfo(null);
      setOpen(false);
    },
    onError: (error: Error) => {
      notifyError("Failed to send credits", error.message);
    },
  });
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format phone number as user types (optional)
    const value = e.target.value.replace(/\D/g, "");
    let formattedValue = value;
    
    if (value.length > 3 && value.length <= 6) {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 6) {
      formattedValue = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`;
    }
    
    setPhoneNumber(formattedValue);
    // Clear recipient info when phone number changes
    setRecipientInfo(null);
  };
  
  const handleLookupUser = () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) {
      notifyError("Invalid phone number", "Please enter a valid phone number");
      return;
    }
    
    setIsSearching(true);
    lookupUserMutation.mutate(phoneNumber);
  };
  
  const handleSubmit = () => {
    if (!recipientInfo) {
      notifyError("Missing recipient", "Please look up a valid phone number first");
      return;
    }
    
    if (!amount || amount <= 0) {
      notifyError("Invalid amount", "Please enter a valid amount greater than 0");
      return;
    }
    
    if (amount > (user?.credits || 0)) {
      notifyError("Insufficient credits", "You don't have enough credits to complete this transaction");
      return;
    }
    
    sendCreditsMutation.mutate();
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when dialog is closed
      setPhoneNumber("");
      setAmount(0);
      setMessage("");
      setRecipientInfo(null);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2"
          onClick={() => setOpen(true)}
        >
          <Send className="h-4 w-4" />
          Send Credits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Coffee Credits</DialogTitle>
          <DialogDescription>
            Send coffee credits to another Bean Stalker user via their phone number.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="phone-number" className="text-right">
                Phone Number
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="phone-number"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="flex-1"
                  placeholder="123-456-7890"
                />
                <Button 
                  onClick={handleLookupUser} 
                  variant="secondary"
                  size="icon"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {recipientInfo && (
              <div className="ml-[25%] pl-2 text-sm font-medium text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span>Recipient: {recipientInfo.username}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="col-span-3"
              placeholder="0.00"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="include-message" className="text-right">
              Include Message
            </Label>
            <Switch 
              id="include-message"
              checked={includeMessage}
              onCheckedChange={setIncludeMessage}
            />
          </div>
          
          {includeMessage && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Message
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="col-span-3"
                placeholder="Add a personal message"
                rows={3}
              />
            </div>
          )}
          
          <div className="text-sm text-muted-foreground mt-2">
            Your current balance: {formatCurrency(user?.credits || 0)}
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={sendCreditsMutation.isPending || !recipientInfo}
          >
            {sendCreditsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Credits"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}