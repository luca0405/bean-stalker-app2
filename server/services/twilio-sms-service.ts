import twilio from 'twilio';

export interface SMSMessage {
  to: string;
  message: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class TwilioSMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !phoneNumber) {
        console.log('📱 TWILIO: Missing credentials - SMS service not available');
        console.log('📱 TWILIO: Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
        return;
      }

      this.client = twilio(accountSid, authToken);
      this.fromNumber = phoneNumber;
      this.isConfigured = true;

      console.log('📱 TWILIO: SMS service initialized successfully');
      console.log(`📱 TWILIO: From number: ${phoneNumber}`);
    } catch (error) {
      console.error('📱 TWILIO: Failed to initialize Twilio client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if Twilio SMS service is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured && this.client !== null && this.fromNumber !== null;
  }

  /**
   * Format phone number for Australia (default) or international
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Australian numbers
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      // Convert 0412345678 to +61412345678
      cleaned = '61' + cleaned.substring(1);
    } else if (cleaned.length === 9 && !cleaned.startsWith('61')) {
      // Convert 412345678 to +61412345678
      cleaned = '61' + cleaned;
    }
    
    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Send SMS using Twilio
   */
  async sendSMS(to: string, message: string): Promise<SMSResponse> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Twilio SMS service is not configured');
      }

      if (!this.client || !this.fromNumber) {
        throw new Error('Twilio client not initialized');
      }

      // Format the phone number
      const formattedNumber = this.formatPhoneNumber(to);
      console.log(`📱 TWILIO: Sending SMS to ${formattedNumber}`);
      console.log(`📱 TWILIO: Message: ${message}`);

      // Send the SMS
      const twilioMessage = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber,
      });

      console.log(`📱 TWILIO: SMS sent successfully - SID: ${twilioMessage.sid}`);
      console.log(`📱 TWILIO: Status: ${twilioMessage.status}`);

      return {
        success: true,
        messageId: twilioMessage.sid,
      };
    } catch (error: any) {
      console.error('📱 TWILIO: Failed to send SMS:', error);
      
      let errorMessage = 'Failed to send SMS';
      
      if (error.code) {
        switch (error.code) {
          case 21211:
            errorMessage = 'Invalid phone number format';
            break;
          case 21610:
            errorMessage = 'Phone number is unsubscribed from SMS';
            break;
          case 21614:
            errorMessage = 'Phone number cannot receive SMS messages';
            break;
          case 20003:
            errorMessage = 'Authentication failed - check Twilio credentials';
            break;
          case 20404:
            errorMessage = 'Twilio phone number not found';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send credit sharing SMS with Bean Stalker branding and verification code
   */
  async sendCreditShareSMS(recipientPhone: string, senderName: string, creditAmount: number, verificationCode?: string, personalizedMessage?: string): Promise<SMSResponse> {
    let message = '';
    
    if (personalizedMessage && personalizedMessage.trim()) {
      message = `${personalizedMessage.trim()} `;
    }
    
    if (verificationCode) {
      message += `🎁 You've received $${creditAmount.toFixed(2)} Bean Stalker credits from ${senderName}! Show this code at our store: ${verificationCode}.`;
    } else {
      message += `🌟 You've received $${creditAmount.toFixed(2)} Bean Stalker credits from ${senderName}! Download the Bean Stalker app to claim your coffee credits and start ordering. Available on the App Store.`;
    }
    
    return this.sendSMS(recipientPhone, message);
  }

  /**
   * Test SMS functionality
   */
  async testSMS(testPhoneNumber: string): Promise<SMSResponse> {
    const testMessage = 'Test message from Bean Stalker - Twilio SMS is working correctly!';
    return this.sendSMS(testPhoneNumber, testMessage);
  }

  /**
   * Get account information for debugging
   */
  async getAccountInfo(): Promise<any> {
    try {
      if (!this.client) {
        return { error: 'Twilio client not initialized' };
      }

      const account = await this.client.api.accounts.list({ limit: 1 });
      if (account.length > 0) {
        const accountInfo = account[0];
        return {
          accountSid: accountInfo.sid,
          status: accountInfo.status,
          type: accountInfo.type,
          friendlyName: accountInfo.friendlyName,
        };
      }
      return { error: 'No account information available' };
    } catch (error) {
      console.error('📱 TWILIO: Failed to get account info:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const twilioSMSService = new TwilioSMSService();