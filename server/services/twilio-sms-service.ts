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
  private senderId: string | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
      const senderId = process.env.TWILIO_SENDER_ID;

      if (!accountSid || !authToken) {
        console.log('📱 TWILIO: Missing basic credentials - SMS service not available');
        console.log('📱 TWILIO: Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
        return;
      }

      if (!phoneNumber && !senderId) {
        console.log('📱 TWILIO: No sender configured - SMS service not available');
        console.log('📱 TWILIO: Required: TWILIO_PHONE_NUMBER or TWILIO_SENDER_ID');
        return;
      }

      this.client = twilio(accountSid, authToken);
      
      // Prefer Sender ID over phone number if both are provided
      if (senderId) {
        this.senderId = senderId;
        this.fromNumber = null;
        console.log('📱 TWILIO: SMS service initialized with Sender ID');
        console.log(`📱 TWILIO: Sender ID: ${senderId}`);
      } else {
        this.fromNumber = phoneNumber;
        this.senderId = null;
        console.log('📱 TWILIO: SMS service initialized with phone number');
        console.log(`📱 TWILIO: From number: ${phoneNumber}`);
      }
      
      this.isConfigured = true;
    } catch (error) {
      console.error('📱 TWILIO: Failed to initialize Twilio client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if Twilio SMS service is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured && this.client !== null && (this.fromNumber !== null || this.senderId !== null);
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

      if (!this.client || (!this.fromNumber && !this.senderId)) {
        throw new Error('Twilio client not initialized');
      }

      // Format the phone number
      const formattedNumber = this.formatPhoneNumber(to);
      console.log(`📱 TWILIO: Sending SMS to ${formattedNumber}`);
      console.log(`📱 TWILIO: Message: ${message}`);

      // Send the SMS using either Sender ID or phone number
      const messageOptions: any = {
        body: message,
        to: formattedNumber,
      };

      if (this.senderId) {
        messageOptions.from = this.senderId;
        console.log(`📱 TWILIO: Using Sender ID: ${this.senderId}`);
      } else {
        messageOptions.from = this.fromNumber;
        console.log(`📱 TWILIO: Using phone number: ${this.fromNumber}`);
      }

      const twilioMessage = await this.client.messages.create(messageOptions);

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