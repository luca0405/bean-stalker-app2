import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { format } from 'date-fns';
import { CreditTransaction } from '@shared/schema';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function TransactionHistory() {
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);
  const { data: transactions, isLoading, error } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/credit-transactions'],
  });

  const INITIAL_DISPLAY_COUNT = 5;

  function getTransactionTypeLabel(type: string) {
    switch (type) {
      case 'purchase':
        return <Badge variant="default">Purchase</Badge>;
      case 'order':
        return <Badge variant="destructive">Order</Badge>;
      case 'admin':
        return <Badge variant="secondary">Admin</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  }

  function formatAmount(amount: number) {
    if (amount > 0) {
      return <span className="text-green-600">+{formatCurrency(amount)}</span>;
    } else {
      return <span className="text-red-600">{formatCurrency(amount)}</span>;
    }
  }

  function formatDate(date: Date) {
    return isMobile
      ? format(date, 'MM/dd')
      : format(date, 'MMM d, yyyy HH:mm');
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="py-3">
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Failed to load transactions: {(error as Error).message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-lg">Transaction History</CardTitle>
        <CardDescription>Recent credit activities</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Date</TableHead>
                    <TableHead className="w-[90px]">Type</TableHead>
                    {!isMobile && <TableHead>Description</TableHead>}
                    <TableHead className="text-right">Amount</TableHead>
                    {!isMobile && <TableHead className="text-right">Balance</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...transactions]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, showAll ? transactions.length : INITIAL_DISPLAY_COUNT)
                    .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="py-2">
                        {formatDate(new Date(transaction.createdAt))}
                      </TableCell>
                      <TableCell className="py-2">{getTransactionTypeLabel(transaction.type)}</TableCell>
                      {!isMobile && <TableCell className="py-2 truncate max-w-[120px]">{transaction.description}</TableCell>}
                      <TableCell className="py-2 text-right">{formatAmount(transaction.amount)}</TableCell>
                      {!isMobile && <TableCell className="py-2 text-right">{formatCurrency(transaction.balanceAfter)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {transactions.length > INITIAL_DISPLAY_COUNT && (
              <div className="p-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll 
                    ? `Show Less (${INITIAL_DISPLAY_COUNT} of ${transactions.length})` 
                    : `Show All ${transactions.length} Transactions`
                  }
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No transactions found
          </div>
        )}
      </CardContent>
    </Card>
  );
}