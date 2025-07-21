/**
 * Square Configuration with forced Beanstalker Sandbox override
 * CRITICAL: Forces production to use correct credentials regardless of environment variable caching
 */

// Modern Square OAuth configuration for both sandbox and production
function getSquareConfig() {
  // Production mode enabled - OAuth configuration supports both environments
  const hasProductionSecrets = process.env.SQUARE_ACCESS_TOKEN_PROD || process.env.SQUARE_LOCATION_ID_PROD;
  // const hasProductionSecrets = false; // Uncomment to force sandbox mode
  
  let config;
  
  if (hasProductionSecrets) {
    // Production Square OAuth credentials (disabled for sandbox testing)
    config = {
      locationId: process.env.SQUARE_LOCATION_ID_PROD || 'YOUR_PRODUCTION_LOCATION_ID',
      applicationId: process.env.SQUARE_APPLICATION_ID_PROD || 'YOUR_PRODUCTION_APP_ID',
      accessToken: process.env.SQUARE_ACCESS_TOKEN_PROD,
      applicationSecret: process.env.SQUARE_APPLICATION_SECRET_PROD,
      webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY_PROD,
      environment: 'production'
    };
    console.log(`🏪 Using PRODUCTION Square OAuth credentials`);
  } else {
    // Sandbox credentials with modern OAuth support
    config = {
      locationId: process.env.SQUARE_LOCATION_ID || 'LRQ926HVH9WFD', // Beanstalker Sandbox
      applicationId: process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-0f_-wyGBcz7NmblQtFkv9A',
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      applicationSecret: process.env.SQUARE_APPLICATION_SECRET,
      webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
      environment: 'sandbox'
    };
    console.log(`🧪 Using SANDBOX Square OAuth credentials`);
  }

  // Log configuration without exposing sensitive data
  console.log(`🔧 Square Config: Location=${config.locationId}, App=${config.applicationId?.substring(0, 20)}..., Env=${config.environment}`);
  
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