/**
 * Omnisend SMS Service
 * Handles SMS sending through Omnisend API for credit sharing
 */

import fetch from 'node-fetch';

interface OmnisendSMSData {
  phoneNumber: string;
  message: string;
  senderName?: string;
}

interface OmnisendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class OmnisendService {
  private static apiKey = process.env.OMNISEND_API_KEY;
  private static apiUrl = 'https://api.omnisend.com/v5';
  
  /**
   * Send SMS through Omnisend API (Note: Requires SMS campaign setup in Omnisend dashboard)
   */
  static async sendSMS(data: OmnisendSMSData): Promise<OmnisendResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Omnisend API key not configured. Set OMNISEND_API_KEY environment variable.');
      }

      // Format phone number for international format
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
      
      console.log('📱 Omnisend SMS: Starting process for', formattedPhone);
      
      // First, create/update contact with SMS channel
      const contactPayload = {
        identifiers: [{
          type: 'phone',
          id: formattedPhone,
          channels: {
            sms: {
              status: 'subscribed',
              statusDate: new Date().toISOString()
            }
          }
        }],
        firstName: 'Bean Stalker Customer',
        customProperties: {
          credit_message: data.message,
          sender_name: data.senderName || 'Bean Stalker'
        }
      };

      console.log('📱 Creating/updating SMS contact...');

      // Create contact
      const contactResponse = await fetch(`${this.apiUrl}/contacts`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(contactPayload)
      });

      const contactData = await contactResponse.json() as any;
      console.log('📱 Contact response:', { status: contactResponse.status, contactID: contactData.contactID });

      if (!contactResponse.ok) {
        console.error('❌ Contact creation failed:', contactData);
        // For native mobile app, fallback to manual SMS since Omnisend needs campaign setup
        return {
          success: false,
          error: 'SMS automation requires campaign setup in Omnisend dashboard. Using manual SMS fallback.'
        };
      }

      // Since custom events may not be available in all Omnisend plans,
      // we'll use contact creation with custom properties instead
      console.log('📱 Contact created successfully, but SMS automation requires manual campaign setup in Omnisend dashboard');
      
      // For basic Omnisend plans without custom events, we need to fall back to manual SMS
      // This ensures the app works immediately while allowing future automation setup
      return {
        success: false,
        error: 'Omnisend contact created, but SMS automation requires custom event triggers (premium feature). Using manual SMS fallback.',
        contactId: contactData.contactID
      };

    } catch (error: any) {
      console.error('❌ Omnisend SMS service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process SMS via Omnisend'
      };
    }
  }

  /**
   * Format phone number to international format
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, assume it's Australian and replace with +61
    if (digits.startsWith('0')) {
      return `+61${digits.slice(1)}`;
    }
    
    // If it doesn't start with +, assume it needs +61 prefix for Australian numbers
    if (!digits.startsWith('61') && digits.length === 10) {
      return `+61${digits}`;
    }
    
    // If it starts with 61, add the + prefix
    if (digits.startsWith('61')) {
      return `+${digits}`;
    }
    
    // For international numbers, add + if not present
    if (!phoneNumber.startsWith('+')) {
      return `+${digits}`;
    }
    
    return phoneNumber;
  }

  /**
   * Send credit share SMS with verification code
   */
  static async sendCreditShareSMS(
    phoneNumber: string, 
    amount: number, 
    senderName: string, 
    verificationCode: string
  ): Promise<OmnisendResponse> {
    const message = `🎁 You've received $${amount.toFixed(2)} Bean Stalker credits from ${senderName}! Show this code at our store: ${verificationCode}. Valid for 24 hours. Bean Stalker Coffee Shop`;
    
    return this.sendSMS({
      phoneNumber,
      message,
      senderName: 'Bean Stalker'
    });
  }

  /**
   * Check if Omnisend service is configured
   */
  static isConfigured(): boolean {
    const configured = !!this.apiKey;
    console.log(`Omnisend configuration check: ${configured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    if (configured) {
      console.log(`API Key length: ${this.apiKey.length}, starts with: ${this.apiKey.substring(0, 10)}...`);
    }
    return configured;
  }

  /**
   * Test Omnisend API connection
   */
  static async testConnection(): Promise<OmnisendResponse> {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'API key not configured' };
      }

      // Test with a simple contact creation
      const testPayload = {
        identifiers: [{
          type: 'phone',
          id: '+61400000000',
          channels: {
            sms: {
              status: 'subscribed',
              statusDate: new Date().toISOString()
            }
          }
        }]
      };

      console.log('Testing Omnisend API connection with payload:', testPayload);

      const response = await fetch(`${this.apiUrl}/contacts`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      const responseData = await response.json() as any;
      console.log('Omnisend test response:', { status: response.status, data: responseData });

      return {
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${JSON.stringify(responseData)}`
      };

    } catch (error: any) {
      console.error('Omnisend connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}