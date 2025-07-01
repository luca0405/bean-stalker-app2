import { randomUUID } from 'crypto';
import { 
  SquareClient, 
  SquareEnvironment,
  SquareError
} from 'square';

// Always use sandbox for testing (regardless of production or development)
const environment = SquareEnvironment.Sandbox;

console.log(`Square client initialized in SANDBOX mode for testing purposes`);

// Initialize Square client
const squareClient = new SquareClient({
  token: () => process.env.SQUARE_ACCESS_TOKEN || '',
  environment: () => environment
});

export interface SquarePaymentRequest {
  sourceId: string;
  amount: number;
  currency: string; // 'USD' or other valid currency code
  idempotencyKey?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * Process a payment with Square
 * @param paymentRequest The payment request details
 * @returns The payment result
 */
export async function processPayment(paymentRequest: SquarePaymentRequest) {
  try {
    const { sourceId, amount, currency, idempotencyKey = randomUUID(), customerName, customerEmail } = paymentRequest;
    
    // Convert amount to smallest currency unit (cents for USD)
    const amountInCents = Math.round(amount * 100);
    
    // Build payment request with optional customer information
    const paymentRequestBody: any = {
      sourceId,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'AUD' // Fixed currency for Square
      },
      idempotencyKey,
      locationId: process.env.SQUARE_LOCATION_ID!
    };

    // Add customer information if provided
    if (customerName || customerEmail) {
      paymentRequestBody.buyerEmailAddress = customerEmail;
      paymentRequestBody.note = `Bean Stalker Premium Membership - ${customerName || 'Member'}`;
      
      // Also add reference ID which appears more prominently in Square dashboard
      paymentRequestBody.referenceId = `PREMIUM_${customerName?.replace(/\s+/g, '_').toUpperCase() || 'MEMBER'}_${Date.now()}`;
      
      // Add autocomplete to create customer record in Square
      paymentRequestBody.autocomplete = true;
    }
    
    // Skip order creation for now due to API method issues
    // Focus on payment with enhanced member information

    const response = await squareClient.payments.create(paymentRequestBody);
    
    // Convert BigInt values to strings for logging and further processing
    const responseJson = JSON.parse(JSON.stringify(response, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));
    console.log('Payment successful:', responseJson);
    
    return {
      success: true,
      payment: response.payment
    };
  } catch (error: any) {
    console.error('Payment failed:', error);
    
    if (error instanceof SquareError) {
      return {
        success: false,
        error: {
          code: error.statusCode || 'ERROR',
          message: error.message || 'Payment processing failed'
        }
      };
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error?.message || 'An unknown error occurred during payment processing'
      }
    };
  }
}

/**
 * Generate a payment link for Square Checkout
 * @param amount The amount to charge
 * @returns The payment link object with URL
 */
export async function createPaymentLink(amount: number) {
  try {
    // Convert amount to smallest currency unit (cents for USD)
    const amountInCents = Math.round(amount * 100);
    
    // Create a Square payment link
    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      quickPay: {
        name: `Bean Stalker Credit Purchase - $${amount}`,
        priceMoney: {
          amount: BigInt(amountInCents),
          currency: 'AUD' // Changed from USD to AUD based on Square error message
        },
        locationId: process.env.SQUARE_LOCATION_ID!
      }
    });
    
    // Convert BigInt to string for logging
    const responseJson = JSON.parse(JSON.stringify(response, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));
    console.log('Payment link created:', responseJson);
    
    if (response.paymentLink?.url) {
      return {
        success: true,
        paymentLink: response.paymentLink.url
      };
    } else {
      throw new Error('No payment link URL in response');
    }
  } catch (error: any) {
    console.error('Failed to create payment link:', error);
    
    return {
      success: false,
      error: error instanceof SquareError
        ? { code: error.statusCode || 'ERROR', message: error.message || 'Failed to create payment link' }
        : { code: 'UNKNOWN_ERROR', message: error?.message || 'An unknown error occurred' }
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