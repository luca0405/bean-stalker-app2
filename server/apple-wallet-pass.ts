/**
 * Apple Wallet Pass Generation Service
 * Generates signed .pkpass files for Apple Wallet integration
 */

import { createHash, createSign } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from 'fs';
import { join } from 'path';
import archiver from 'archiver';
import * as forge from 'node-forge';

export interface PassData {
  passTypeIdentifier: string;
  serialNumber: string;
  organizationName: string;
  description: string;
  logoText: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  primaryFields: PassField[];
  secondaryFields: PassField[];
  auxiliaryFields: PassField[];
  backFields: PassField[];
}

export interface PassField {
  key: string;
  label: string;
  value: string;
  textAlignment?: string;
}

export class AppleWalletPassGenerator {
  private static passesDir = join(process.cwd(), 'wallet-passes');
  
  // Test configuration method
  static async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to load certificates
      this.getCertificateData();
      this.getWWDRData();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  // Use certificates embedded during build time for TestFlight builds
  private static getCertificateData(): Buffer {
    // Try built-time embedded certificate files first (TestFlight builds)
    const certPath = join(process.cwd(), 'certs', 'bean_stalker_pass_cert.p12');
    if (existsSync(certPath)) {
      console.log('🍎 NATIVE: Using certificate from embedded file (TestFlight build)');
      return readFileSync(certPath);
    }
    
    // Fallback to environment variables for runtime injection
    if (process.env.APPLE_WALLET_CERT_BASE64) {
      console.log('🍎 RUNTIME: Using certificate from environment variable');
      return Buffer.from(process.env.APPLE_WALLET_CERT_BASE64, 'base64');
    }
    
    throw new Error('Apple Wallet certificate not found in embedded files or environment variables');
  }
  
  private static getWWDRData(): Buffer {
    // Try built-time embedded certificate files first (TestFlight builds)
    const wwdrPath = join(process.cwd(), 'certs', 'wwdr.pem');
    if (existsSync(wwdrPath)) {
      console.log('🍎 NATIVE: Using WWDR certificate from embedded file (TestFlight build)');
      return readFileSync(wwdrPath);
    }
    
    // Fallback to environment variables for runtime injection
    if (process.env.APPLE_WALLET_WWDR_BASE64) {
      console.log('🍎 RUNTIME: Using WWDR certificate from environment variable');
      return Buffer.from(process.env.APPLE_WALLET_WWDR_BASE64, 'base64');
    }
    
    throw new Error('Apple Wallet WWDR certificate not found in embedded files or environment variables');
  }
  private static passTypeIdentifier = 'pass.A43TZWNYA3.beanstalker.credits';
  private static teamIdentifier = process.env.APPLE_TEAM_ID || 'A43TZWNYA3';
  private static certificatePassword = process.env.APPLE_WALLET_CERT_PASSWORD || 'iamgroot!';
  
  /**
   * Generate a signed .pkpass file for Apple Wallet
   */
  static async generatePass(userId: number, username: string, currentBalance: number, passData: PassData): Promise<{ success: boolean; passBase64?: string; error?: string }> {
    try {
      // Load certificate data (from environment or file system)
      let certificateData: Buffer;
      let wwdrData: Buffer;
      
      try {
        certificateData = this.getCertificateData();
        wwdrData = this.getWWDRData();
        console.log('🍎 DEBUG: Certificate data loaded successfully');
      } catch (error) {
        console.error('🍎 DEBUG: Certificate loading failed:', error);
        return {
          success: false,
          error: `Apple Wallet certificates not available: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
      
      // Ensure passes directory exists
      if (!existsSync(this.passesDir)) {
        mkdirSync(this.passesDir, { recursive: true });
      }
      
      const passId = `bscredit${userId}t${Date.now()}`;
      const passDir = join(this.passesDir, passId);
      mkdirSync(passDir, { recursive: true });
      
      // Create pass.json
      const passJson = this.createPassJson(passData, userId, username, currentBalance);
      writeFileSync(join(passDir, 'pass.json'), JSON.stringify(passJson, null, 2));
      
      // Copy logo and icon files
      await this.copyPassAssets(passDir);
      
      // Generate manifest.json
      const manifest = await this.generateManifest(passDir);
      writeFileSync(join(passDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      
      // Sign the manifest using certificate data
      const signature = await this.signManifest(manifest, certificateData);
      writeFileSync(join(passDir, 'signature'), signature);
      
      // Create .pkpass file
      const pkpassPath = join(this.passesDir, `${passId}.pkpass`);
      await this.createPkpassFile(passDir, pkpassPath);
      
      // Convert to base64 for Capacitor plugin
      const pkpassBuffer = readFileSync(pkpassPath);
      const passBase64 = pkpassBuffer.toString('base64');
      
      return { success: true, passBase64 };
      
    } catch (error: any) {
      console.error('Pass generation error:', error);
      return { success: false, error: error.message || 'Failed to generate pass' };
    }
  }
  
  /**
   * Create the pass.json content
   */
  private static createPassJson(passData: PassData, userId: number, username: string, currentBalance: number) {
    return {
      formatVersion: 1,
      passTypeIdentifier: this.passTypeIdentifier,
      serialNumber: passData.serialNumber,
      teamIdentifier: this.teamIdentifier,
      organizationName: passData.organizationName,
      description: passData.description,
      logoText: passData.logoText,
      foregroundColor: passData.foregroundColor,
      backgroundColor: passData.backgroundColor,
      labelColor: passData.labelColor,
      generic: {
        primaryFields: passData.primaryFields,
        secondaryFields: passData.secondaryFields,
        auxiliaryFields: passData.auxiliaryFields,
        backFields: passData.backFields
      },
      webServiceURL: `${process.env.NODE_ENV === 'production' ? 'https://member.beanstalker.com.au' : `http://localhost:${process.env.PORT || 5000}`}/api/apple-wallet`,
      authenticationToken: this.generateAuthToken(userId),
      relevantDate: new Date().toISOString(),
      barcodes: [
        {
          message: `BS${userId}`,
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1'
        }
      ],
      userInfo: {
        userId: userId,
        username: username,
        balance: currentBalance
      }
    };
  }
  
  /**
   * Copy logo and icon assets to pass directory
   */
  private static async copyPassAssets(passDir: string) {
    // Create minimal PNG placeholders for Apple Wallet assets
    // In production, replace with actual Bean Stalker branded images
    const assetFiles = [
      'icon.png',      // 29x29 points
      'icon@2x.png',   // 58x58 points  
      'icon@3x.png',   // 87x87 points
      'logo.png',      // 160x50 points
      'logo@2x.png',   // 320x100 points
      'logo@3x.png'    // 480x150 points
    ];
    
    // Create minimal PNG placeholders (1x1 pixel green image)
    const minimalPNG = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    for (const assetFile of assetFiles) {
      const assetPath = join(passDir, assetFile);
      writeFileSync(assetPath, minimalPNG);
    }
  }
  
  /**
   * Generate manifest.json with file hashes
   */
  private static async generateManifest(passDir: string): Promise<Record<string, string>> {
    const manifest: Record<string, string> = {};
    const files = ['pass.json', 'icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png', 'logo@3x.png'];
    
    for (const file of files) {
      const filePath = join(passDir, file);
      if (existsSync(filePath)) {
        const fileContent = readFileSync(filePath);
        const hash = createHash('sha1').update(fileContent).digest('hex');
        manifest[file] = hash;
      }
    }
    
    return manifest;
  }
  
  /**
   * Sign the manifest with Apple certificates
   */
  private static async signManifest(manifest: Record<string, string>, certificateData: Buffer): Promise<Buffer> {
    const manifestJson = JSON.stringify(manifest);
    
    try {
      // Use the certificate data directly (from environment or file)
      const p12Asn1 = forge.asn1.fromDer(certificateData.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.certificatePassword!);
      
      // Extract the private key - try multiple bag types
      let keyBag: any = null;
      
      // Try pkcs8ShroudedKeyBag first
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const shroudedBags = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (shroudedBags && shroudedBags.length > 0) {
        keyBag = shroudedBags[0];
      }
      
      // If not found, try keyBag
      if (!keyBag) {
        const altKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
        const normalBags = altKeyBags[forge.pki.oids.keyBag];
        if (normalBags && normalBags.length > 0) {
          keyBag = normalBags[0];
        }
      }
      
      if (!keyBag?.key) {
        throw new Error('Private key not found in .p12 certificate');
      }
      
      // Convert forge private key to PEM format for Node.js crypto
      const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
      
      // Sign the manifest
      const sign = createSign('SHA1');
      sign.update(manifestJson);
      return sign.sign(privateKeyPem);
      
    } catch (error: any) {
      console.error('Certificate signing error:', error.message);
      // For development, return a placeholder signature
      console.warn('Using placeholder signature - certificate configuration may need adjustment');
      return Buffer.from('PLACEHOLDER_SIGNATURE_FOR_DEVELOPMENT');
    }
  }
  
  /**
   * Create the final .pkpass ZIP file
   */
  private static async createPkpassFile(passDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => resolve());
      archive.on('error', (err: Error) => reject(err));
      
      archive.pipe(output);
      archive.directory(passDir, false);
      archive.finalize();
    });
  }
  
  /**
   * Generate authentication token for wallet updates
   */
  private static generateAuthToken(userId: number): string {
    const secret = process.env.APPLE_WALLET_AUTH_SECRET || 'bean-stalker-wallet-secret';
    return createHash('sha256').update(`${userId}_${secret}`).digest('hex');
  }
}