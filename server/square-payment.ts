// TEMPORARILY SIMPLIFIED - REMOVED SQUARE SDK IMPORTS
// Using direct HTTP requests instead of Square SDK to avoid production compatibility issues

import { randomUUID } from 'crypto';

export interface SquarePaymentRequest {
  sourceId: string;
  amount: number;
  currency: string; // 'USD' or other valid currency code
  idempotencyKey?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * Process a payment with Square using direct HTTP requests
 * @param paymentRequest The payment request details
 * @returns The payment result
 */
export async function processPayment(paymentRequest: SquarePaymentRequest) {
  try {
    const idempotencyKey = paymentRequest.idempotencyKey || randomUUID();
    
    const paymentData = {
      source_id: paymentRequest.sourceId,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: Math.round(paymentRequest.amount * 100), // Convert to cents
        currency: paymentRequest.currency
      },
      location_id: process.env.SQUARE_LOCATION_ID_PROD,
      ...(paymentRequest.customerName && {
        buyer_email_address: paymentRequest.customerEmail,
        note: `Bean Stalker Premium Membership - ${paymentRequest.customerName}`
      })
    };

    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN_PROD}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Payment failed: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      payment: result.payment,
      transactionId: result.payment?.id,
      receiptUrl: result.payment?.receipt_url
    };
  } catch (error) {
    console.error('Square payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown payment error'
    };
  }
}

/**
 * Generate a payment link for Square Checkout using HTTP requests
 * @param amount The amount to charge
 * @param credits Number of credits being purchased
 * @param userId User ID to include as reference for tracking
 * @param isNativeApp Whether this is for a native app (uses custom URL scheme)
 * @returns The payment link object with URL
 */
export async function createPaymentLink(amount: number, credits: number, userId: string, isNativeApp: boolean = false) {
  try {
    const checkoutData = {
      idempotency_key: randomUUID(),
      checkout_options: {
        redirect_url: 'https://member.beanstalker.com.au/api/payment-success'
      },
      order: {
        location_id: process.env.SQUARE_LOCATION_ID_PROD,
        reference_id: userId, // This will be passed back in redirect URL
        line_items: [{
          name: `${credits} credits for Bean Stalker`,
          quantity: '1',
          base_price_money: {
            amount: Math.round(amount * 100),
            currency: 'AUD'
          }
        }]
      },
      payment_options: {
        autocomplete: true
      }
    };

    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN_PROD}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13'
      },
      body: JSON.stringify(checkoutData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Payment link creation failed: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      paymentLink: result.payment_link,
      url: result.payment_link?.url
    };
  } catch (error) {
    console.error('Square payment link error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get the application ID for the Square Web Payments SDK
 * @returns The application ID
 */
export function getSquareApplicationId() {
  return process.env.SQUARE_APPLICATION_ID;
}

/**
 * Get the location ID for the Square Web Payments SDK
 * @returns The location ID
 */
export function getSquareLocationId() {
  return process.env.SQUARE_LOCATION_ID;
}