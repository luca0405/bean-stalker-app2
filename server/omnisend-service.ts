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
  private static apiUrl = 'https://api.omnisend.com/v3/sms';
  
  /**
   * Send SMS through Omnisend API
   */
  static async sendSMS(data: OmnisendSMSData): Promise<OmnisendResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Omnisend API key not configured. Set OMNISEND_API_KEY environment variable.');
      }

      // Format phone number for international format
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
      
      const payload = {
        phoneNumber: formattedPhone,
        text: data.message,
        from: data.senderName || 'Bean Stalker'
      };

      console.log('Sending SMS via Omnisend:', { 
        phoneNumber: formattedPhone, 
        messageLength: data.message.length,
        from: payload.from 
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json() as any;

      if (!response.ok) {
        console.error('Omnisend SMS API error:', responseData);
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      console.log('SMS sent successfully via Omnisend:', responseData);

      return {
        success: true,
        messageId: responseData.messageId || responseData.id
      };

    } catch (error: any) {
      console.error('Omnisend SMS service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
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
    return !!this.apiKey;
  }
}