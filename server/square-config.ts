/**
 * Square Production Configuration for Bean Stalker
 * Uses only production Square credentials for all environments
 */

// Production-only Square configuration
function getSquareConfig() {
  // Require production credentials - no fallback to sandbox
  if (!process.env.SQUARE_ACCESS_TOKEN_PROD || !process.env.SQUARE_LOCATION_ID_PROD) {
    throw new Error('SQUARE_ACCESS_TOKEN_PROD and SQUARE_LOCATION_ID_PROD are required');
  }
  
  const config = {
    locationId: process.env.SQUARE_LOCATION_ID_PROD!, // Bean Stalker Production Location
    applicationId: process.env.SQUARE_APPLICATION_ID_PROD!,
    accessToken: process.env.SQUARE_ACCESS_TOKEN_PROD!,
    applicationSecret: process.env.SQUARE_APPLICATION_SECRET_PROD,
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY_PROD,
    environment: 'production' as const
  };
  
  console.log(`🏪 Using Square Production credentials - Location: ${config.locationId}`);
  console.log(`🔧 Square Config: App=${config.applicationId?.substring(0, 20)}..., Environment=${config.environment}`);
  
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

export function getSquareApplicationSecret(): string | undefined {
  return squareConfig.applicationSecret;
}

export function getSquareEnvironment(): string {
  return squareConfig.environment || 'sandbox';
}

// Force refresh function for production cache issues
export function refreshSquareConfig() {
  const freshConfig = getSquareConfig();
  console.log(`🔄 Square Config Refreshed: Location=${freshConfig.locationId}`);
  return freshConfig;
}