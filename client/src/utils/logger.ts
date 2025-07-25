// Production-safe logging utility
import { APP_CONFIG } from '../config/environment';

export class Logger {
  private static shouldLog(): boolean {
    return APP_CONFIG.features.enableConsoleLogging;
  }

  static log(message: string, ...args: any[]): void {
    if (this.shouldLog()) {
      console.log(message, ...args);
    }
  }

  static error(message: string, ...args: any[]): void {
    // Always log errors, even in production
    console.error(message, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    if (this.shouldLog()) {
      console.warn(message, ...args);
    }
  }

  static debug(message: string, ...args: any[]): void {
    if (this.shouldLog()) {
      console.debug(message, ...args);
    }
  }

  // Special logging for IAP that can be enabled in production for testing
  static iap(message: string, ...args: any[]): void {
    if (this.shouldLog() || APP_CONFIG.features.enableIAPDiagnostics) {
      console.log(`[IAP] ${message}`, ...args);
    }
  }
}