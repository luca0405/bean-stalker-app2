/**
 * Square Configuration with forced Beanstalker Sandbox override
 * CRITICAL: Forces production to use correct credentials regardless of environment variable caching
 */

// Square configuration with deployment-safe credential switching
function getSquareConfig() {
  // Determine if we should use production or sandbox credentials
  const useProduction = process.env.NODE_ENV === 'production' && process.env.SQUARE_USE_PRODUCTION === 'true';
  
  let config;
  
  if (useProduction) {
    // Production Square credentials
    config = {
      locationId: process.env.SQUARE_PRODUCTION_LOCATION_ID || 'YOUR_PRODUCTION_LOCATION_ID',
      applicationId: process.env.SQUARE_PRODUCTION_APPLICATION_ID || 'YOUR_PRODUCTION_APP_ID',
      accessToken: process.env.SQUARE_PRODUCTION_ACCESS_TOKEN,
      webhookSignatureKey: process.env.SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY
    };
    console.log(`🏪 Using PRODUCTION Square credentials`);
  } else {
    // Sandbox credentials (current working setup)
    config = {
      locationId: 'LKTZKDFJ44YZD', // Working sandbox location
      applicationId: 'sandbox-sq0idb-psFtGCJDduHGMjv3Qw34jA', // Working sandbox app
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    };
    console.log(`🧪 Using SANDBOX Square credentials`);
  }

  // Log configuration
  console.log(`🔧 Square Config: Location=${config.locationId}, App=${config.applicationId}`);
  
  return config;
}

// Export fresh configuration
export const squareConfig = getSquareConfig();

// Helper functions for consistent access
export function getSquareLocationId(): string {
  return squareConfig.locationId;
}

export function getSquareApplicationId(): string {
  return squareConfig.applicationId;
}

export function getSquareAccessToken(): string | undefined {
  return squareConfig.accessToken;
}

export function getSquareWebhookSignatureKey(): string | undefined {
  return squareConfig.webhookSignatureKey;
}

// Force refresh function for production cache issues
export function refreshSquareConfig() {
  const freshConfig = getSquareConfig();
  console.log(`🔄 Square Config Refreshed: Location=${freshConfig.locationId}`);
  return freshConfig;
}