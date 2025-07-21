/**
 * Square OAuth Integration for Modern Authentication
 */

import { getSquareApplicationId, getSquareApplicationSecret, getSquareEnvironment } from './square-config';

export function generateOAuthAuthorizationUrl(): string {
  const applicationId = getSquareApplicationId();
  const environment = getSquareEnvironment();
  const redirectUri = environment === 'production' 
    ? 'https://member.beanstalker.com.au/auth/square/callback'
    : 'http://localhost:5000/auth/square/callback';
  
  // Square OAuth authorization URL
  const baseUrl = environment === 'production' 
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
  
  const params = new URLSearchParams({
    client_id: applicationId || '',
    scope: 'PAYMENTS_READ PAYMENTS_WRITE ORDERS_READ ORDERS_WRITE MERCHANT_PROFILE_READ ITEMS_READ INVENTORY_READ',
    session: 'false',
    redirect_uri: redirectUri,
    state: 'beanstalker-oauth-' + Date.now()
  });

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(code: string): Promise<any> {
  const applicationId = getSquareApplicationId();
  const applicationSecret = getSquareApplicationSecret();
  const environment = getSquareEnvironment();
  
  const baseUrl = environment === 'production' 
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
    
  const redirectUri = environment === 'production' 
    ? 'https://member.beanstalker.com.au/auth/square/callback'
    : 'http://localhost:5000/auth/square/callback';

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2024-06-04'
    },
    body: JSON.stringify({
      client_id: applicationId,
      client_secret: applicationSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  return await response.json();
}