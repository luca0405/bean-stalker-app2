/**
 * Apple Wallet Pass Validation Test
 * Tests pass data formats to identify pattern validation issues
 */

import { PassData, PassField } from './apple-wallet-pass';

export class AppleWalletValidator {
  /**
   * Validate pass data before generation
   */
  static validatePassData(passData: PassData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Validate passTypeIdentifier format
    const passTypePattern = /^pass\.[A-Z0-9]{10}\.[a-zA-Z0-9.-]+$/;
    if (!passTypePattern.test(passData.passTypeIdentifier)) {
      errors.push(`Invalid passTypeIdentifier format: ${passData.passTypeIdentifier}. Must match pattern: pass.TEAMID.identifier`);
    }

    // 2. Validate serialNumber format  
    const serialPattern = /^[a-zA-Z0-9.-]+$/;
    if (!serialPattern.test(passData.serialNumber)) {
      errors.push(`Invalid serialNumber format: ${passData.serialNumber}. Only alphanumeric, hyphens, and periods allowed`);
    }

    // 3. Validate color formats
    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
    const colorFields = ['foregroundColor', 'backgroundColor', 'labelColor'];
    
    for (const field of colorFields) {
      const color = (passData as any)[field];
      if (color && !hexColorPattern.test(color)) {
        errors.push(`Invalid ${field} format: ${color}. Must be hex format like #FFFFFF`);
      }
    }

    // 4. Validate required fields
    const requiredFields = ['passTypeIdentifier', 'serialNumber', 'organizationName', 'description'];
    for (const field of requiredFields) {
      if (!(passData as any)[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // 5. Validate field values don't contain problematic characters
    const validateField = (field: PassField, context: string) => {
      if (field.key && !/^[a-zA-Z0-9_-]+$/.test(field.key)) {
        errors.push(`Invalid field key in ${context}: ${field.key}. Only alphanumeric, underscore, hyphen allowed`);
      }
      
      // Check for characters that might cause JSON parsing issues
      if (field.value && /[\x00-\x1f\x7f-\x9f]/.test(field.value)) {
        errors.push(`Invalid characters in field value (${context}): ${field.key}`);
      }
    };

    // Validate all pass fields
    passData.primaryFields?.forEach(field => validateField(field, 'primaryFields'));
    passData.secondaryFields?.forEach(field => validateField(field, 'secondaryFields'));
    passData.auxiliaryFields?.forEach(field => validateField(field, 'auxiliaryFields'));
    passData.backFields?.forEach(field => validateField(field, 'backFields'));

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a test pass with known good values
   */
  static createTestPass(userId: number): PassData {
    return {
      passTypeIdentifier: 'pass.A43TZWNYA3.beanstalker.credits',
      serialNumber: `test${userId}${Date.now()}`,
      organizationName: 'Bean Stalker Coffee',
      description: 'Bean Stalker Credit Balance',
      logoText: 'Bean Stalker',
      foregroundColor: '#FFFFFF',
      backgroundColor: '#228B22',
      labelColor: '#FFFFFF',
      primaryFields: [
        {
          key: 'balance',
          label: 'Credit Balance',
          value: '$25.00',
          textAlignment: 'center'
        }
      ],
      secondaryFields: [
        {
          key: 'username',
          label: 'Account',
          value: 'testuser'
        },
        {
          key: 'lastUpdated',
          label: 'Last Updated',
          value: new Date().toLocaleDateString()
        }
      ],
      auxiliaryFields: [
        {
          key: 'memberType',
          label: 'Membership',
          value: 'Standard'
        }
      ],
      backFields: [
        {
          key: 'description',
          label: 'About',
          value: 'Your Bean Stalker credit balance.'
        }
      ]
    };
  }
}