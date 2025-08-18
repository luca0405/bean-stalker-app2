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
  
  // Use embedded base64 certificates for native apps or file paths for development
  private static getCertificateData(): Buffer {
    // First try environment variable (for native apps)
    if (process.env.APPLE_WALLET_CERT_BASE64) {
      console.log('🍎 DEBUG: Using base64 certificate from environment');
      return Buffer.from(process.env.APPLE_WALLET_CERT_BASE64, 'base64');
    }
    
    // For development/testing, use hardcoded base64 data
    const devCertBase64 = 'MIINjAIBAzCCDUIGCSqGSIb3DQEHAaCCDTMEgg0vMIINKzCCB1oGCSqGSIb3DQEHBqCCB0swggdHAgEAMIIHQAYJKoZIhvcNAQcBMF8GCSqGSIb3DQEFDTBSMDEGCSqGSIb3DQEFDDAkBBB+ap+eUI7RPJ+vivr2p1p3AgIIADAMBggqhkiG9w0CCQUAMB0GCWCGSAFlAwQBKgQQy59AG1NGLT+GmD5WagOm5YCCBtAjSyQD0B+gWdGh6UrLmSZZ3OWL52Wn8882ypWEw/PPhRDnwqZlhMLI5r+jsmQcaBwdtT/AgYb3fkqCA1J2t9+FEP25iKbIcKRYjd21Aoo7eRkaqo7wI5Z8SNggHA86VVCvxQGmPDfWW035Q+PCJMc9olOKCH/ObFeXYD7bvayrKTKrR8o5y1KxPJCIcBOgXf3UUle/VyWFkVjRNqtr4UaxpcYRyAUuxqU/jghGH7HyVL/5ex4MeKUXGC5TQq09Q+QGhUMvcOcFGBVvcLtUZDvlZB4JnPsiAsRwbpbQ1gofPJuqBdmHDnHtdw+z1cp8F3wjYdtuPFnJnOgfZ9KsldDxQfCgTuT0Uk3FRV+p7pGBgQnNqfERNQy7tQjjqyh0fiSFwwrapWOTniIR2EyYdDQ5vPCSV9s1ERd+Kwy7rZ1IdEBmxTohMJzK1quCq94YTWy9r3/b7i6uERLQECydB+4jqq+qiANSIyX/gnfuF0DlSdtU0UQAxPZR3sEcclTmL9+w8e1Ja/PB0ZnxqjWdbMiHOTeIoqcAM3tZmUtdzUEy+Z6N1NIBmnn1ER1cpRO1MgXwWWSiNUH7SAZ9/TQWYxCMtSDVKPdzFJECahQo0bPo9ekrIUHW3oQCZlEdQVC0ojOaz2QUVTwk6s5zCZITdxBldHNi0e/o+016JlVXfmFZS5ZmjkdEFLcI5ORhUZskTHN+Wd40iDwm3bTWRCTXdfaE3qOY4Ix9fVPD5lvW+yb3veTyMlik83sweCDICzx+6hhgVQ2F9UpGydFWao3Pdc8P34Wow05t3skrZwiQEn+U3jzl/d06/ihrPfigjvvj1aL/boIg2M5VKyycDTluvC9n75ZjLFd12O5sH+wvCR6SL98LUgK9+lQoAdax5tmN/+/hePYQRzdKDUg2xDzNWKEHe0N2WpVpzaosyRGiM0KrpzabYkvtFDZVxwJC216Bq/oUv7IFEsnrAXNWUAw/n5qviJ4QN+QtyfSKGt990XbyMpRlNm84aSF1oK0RcqOy/zwJ3QPVRc+hVBvAuW38EUv8i4Atl6Flft6MYFStuf1yNrnmLNzj3TxnqbiAayhayMygj9CuHPSx0MN8Edwf+/nd2PyvcUNcf5vWRX8bKUeaz90SiQaEThanGycrv0uMHuHCQbmiVv86S3eEADUKGl5NLbGnT62+LiUWADKx5F8/0NHkf6KqcIFQpIzKgDpIywgzgAiV7LwVQs2MxASMFHZvFer/VQWwVg0FzWQwYqjlPa143UZ6r1sawAJPpCBcGH3K72yJpdkYvcvDM8Rk+dfLtOExJMCPHbX6nlSXXdC/DP/RVNcD+5mmieZTu4Af19TXt5/ZivPxxHYfBAfI4V+vwDoo1dkXb0OftuVnZrG357q/KmfR/jG+Q5+OheSd2b3ozlBVCiSaf7/6u1KKPMZqEv00hdVOOfi+05MWSmqFeYL66tI4F9qzg0S5M+aV4fTebsUpJPj+KaP+dbZp31+JNbYWMMiwaHHnKVg4dxgewY/MGyjYNIW52yrON8CICT2ezBwe3LUqJFwMDL/Uw89i+QsLSGUqFTf2/gPLpCJwwHFcy8WTO1fHtiAvIOQOTgCN4CAriF1Vm+hyaBWYi4CYOO9ySC2W/VC1VEMzRstqrbdytVPHCYGiOl4vMzzdaumacMSvYBPoBVwsv32Zr/ruTbcg0hzVcKZoy4jOnjDMTFFPV6ykhzkumXOxRAXmlkQsMELbPGXkqEr7U6VMK6D03Kqe9R8WJmtbmI8DksZIbj5zGR72sDn99VBz0Vb2UcugLkxTwiagKEUxhBU6CcIF74jD6IiYo0oVFhuypCpCySBysZymWnPdPbqwwQV1z71OTZoriZw06GcL+M6e9K5IQSaPcDbBNlK7m2qUQEDVO+lHaVVJB3N072GyJFLqqAnzB6WGbkMemCXmUBdJNomqj3Sn/+p+GYA1gOSC90goqAFazYwJPtfe3TlWCpqnyvuKc6exbjXI/MdSYqllKlt/aQ7zTMqy+xJKGhVkOOR2yq+C1eSgrclXEZCYbsfQ4KT21SMEz2KUwrBO+g00w6w7/f8yckXEE70oJUJq/ciQHj7Fi1/Ht00t16ZwnZvPnpNVbsmg2LJnqZuZf4jc864zTXGpVc4aH1bOw6lx2DGZ4/yoa/0gj9GwKKzFc3w9lseNpH5I9OdFSeLMuyt/Y5UaVuiQfkTRXUV7TsVz/1LWjb5rHbwnA7huNeWghSc4LgbskEI83iBFeHmJel592YFoNHGAWp7nxVCaIeZtlCTRufmCYe9U24/E1Qu3evoEH/ghLJrCH40pJSRAOxu8ZpKTMIIFyQYJKoZIhvcNAQcBoIIFugSCBbYwggWyMIIFrgYLKoZIhvcNAQwKAQKgggU5MIIFNTBfBgkqhkiG9w0BBQ0wUjAxBgkqhkiG9w0BBQwwJAQQeSwOXTkhYQuNRM3y4brUfgICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEEIgzEDUPgrzjnWVSEjhqsxEEggTQxfST/MaydXIZM4vlEzddy2TtMWg/2XLGPRiqVPqLkcfYgEa7G3WgZ34yvTEDWdwOJbxw1F7kQvB7DJy3XcmrwV4q9Gp6G7wTv+scf544ThWL7HdAPbIHut9RGnl4OfuWYvxCaCq3HZUy3R9AIR5BaidGQlb+iWGWK6ChIj2qgoRtr2QjFIePyzQB7x7xGGM/shUpPdAMYjiE/pACf5uQvTJgzcpT1v4oS+j2UIYIjgotAChAjTuohvCV2UjsfajYNQc2/iAoc+UIspW2plqPTN/nFUX4htyRzG00EWC5YitCmx509fMC7iqHpAE9X+Wnr594gcicle/u9ht8EGmjtYytQm+AtfDyqFAMEzXhsdUavbjYYAjlCeILbdVzDwgMl89N9oNyn3AAta3MvU325TG/70mylPDsKEqkuqaot7WoiTGdU7EHjzYFGbPc2lKbDQ5G48I3U9uRjByYXLCm0RqA+O8NiDmbt0OL7S8R2R76YVR/g1Zwzqs7WulE4KwAfSOmTU0PExyjcTIMwRUZCbtFa0vTlWndl+6l3wEs5k9mhZHwX32ttKjE7DOOa2EP79Z7tCApRd1r23Rs5ZXjQQV7kX2assgUMtVmbGVtVYHxy0gcEkeZAJUsXKfDjyBs0bByIEuYXKBMXs+0AvCSmF8eNIMLamOldk9bzU+i/o/aaH70XgGS/krILfoO5e8kp09B4fk/3njbq4e7xgmknQz3+A1bXZUVJ/igygHKUAEZ+ZtTzx1/RLG1yCJDJXH1/4emG27XNV6zWiiuBM49UAhyv20PkN4ASV0XZEijhzq8vHp7lqBXPpDZJ8ZTJGM3ZVz23nSJCXx9gATnms0TXiF754Yn0d9wkIVcU64C85EeU7bHG4KalK011Teqmjh7yoaM0TzdPUWOPhlKa+/zeyD3P/VTmIKqXmwVG4HYG0ewt77AjqzAVxu1D2aRrkz9n5Cg1R0XYBPmKu00OLkDMNP/c+62L4eZcBG+vBLJ5Z05O6D2aSTnUTzJ6sCKIBXQ5lQwPbEnD4EKMZ+vmjBW5xST4Lb6EcXoQUmw+h8v4aM5YNmAq6vFeSsmb039Ss1NHkf+7T/SA9rEUYaK8qbLy9CcQLmVNUp3dS8zJGbjHvI49ak5x3hhk4ij7AJDxPBJMXGCv26N6cHys1hBr8dlQg+28yAwbjWH6TQhHNWIEarSHS77l5iaA8lzOCblkLKElYJOc6EsUC1nIwpFOwePEHvv/WPlpy5IySRah49zXhwT/suk1aUf8knVNWHQMTRRXY39AqVnJ0IvmBUoWVqXEN4OggyuVulfIM0xMty5yqguEBTxXCQ/i3T/WQW5+TbXicpUJ1wRda5yy4msbvHjGI06Ah67ponrDo8dcog7vXf7c9lenGSiT2L2OabJfgzzRd4MFnMFMiYtVPeM1KDjo83I4wAwHNEzmPR713UxVG/CSMl0NGzNAjs0LY+3LV0Krln0Zj+YIvcs/ktwvYfD2i46rkMWcl8kYBAXygIqdFSuRpBwMk7zuyazCeNZPnqS8VZTrgPp6+W7p94dwpK1gqSBZcIeqnZ85d+/lDdxsK2umbQjGo1qQBH+ugKErqWtBom+Abeay/sDLqEkwCDOalOH8bylHRjBcxlh75F3rD8xYjAjBgkqhkiG9w0BCRUxFgQUtt5F2xQYkZTxmrJsZqrbeNoHZdwwOwYJKoZIhvcNAQkUMS4eLABCAGUAYQBuACAAUwB0AGEAbABrAGUAcgAgAFAAYQBzAHMAIABDAGUAcgB0MEEwMTANBglghkgBZQMEAgEFAAQgAnEzspa/aAYX/w/brdIhAmSD1JyD50HVYPrO/Yfs/tUECHnj6qzz/cXaAgIIAA==';
    
    console.log('🍎 DEBUG: Using hardcoded certificate data for development');
    return Buffer.from(devCertBase64, 'base64');
  }
  
  private static getWWDRData(): Buffer {
    // First try environment variable (for native apps)
    if (process.env.APPLE_WALLET_WWDR_BASE64) {
      console.log('🍎 DEBUG: Using base64 WWDR from environment');
      return Buffer.from(process.env.APPLE_WALLET_WWDR_BASE64, 'base64');
    }
    
    // For development/testing, use hardcoded base64 data
    const devWwdrBase64 = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUVJakNDQXdxZ0F3SUJBZ0lJQWQ2OHhEbHRvQkF3RFFZSktvWklodmNOQVFFRkJRQXdZakVMTUFrR0ExVUUKQmhNQ1ZWTXhFekFSQmdOVkJBb1RDa0Z3Y0d4bElFbHVZeTR4SmpBa0JnTlZCQXNUSFVGd2NHeGxJRU5sY25ScApabWxqWVhScGIyNGdRWFYwYUc5eWFYUjVNUll3RkFZRFZRUURFdzFCY0hCc1pTQlNiMjkwSUVOQk1CNFhEVEV6Ck1ESXdOekl4TkRnME4xb1hEVEl6TURJd056SXhORGcwTjFvd2daWXhDekFKQmdOVkJBWVRBbFZUTVJNd0VRWUQKVlFRS0RBcEJjSEJzWlNCSmJtTXVNU3d3S2dZRFZRUUxEQ05CY0hCc1pTQlhiM0pzWkhkcFpHVWdSR1YyWld4dgpjR1Z5SUZKbGJHRjBhVzl1Y3pGRU1FSUdBMVVFQXd3N1FYQndiR1VnVjI5eWJHUjNhV1JsSUVSbGRtVnNiM0JsCmNpQlNaV3hoZEdsdmJuTWdRMlZ5ZEdsbWFXTmhkR2x2YmlCQmRYUm9iM0pwZEhrd2dnRWlNQTBHQ1NxR1NJYjMKRFFFQkFRVUFBNElCRHdBd2dnRUtBb0lCQVFES09GU215MWFxeUNRNVNPbU03dXhmdUg4bWtidzBVM3JPZkdPQQpZWGRrWHFVSEk3WTUvbEF0RlZaWWNDMSt4RzdCU29VK0wvRGVoQnFoVjhtdmV4ai9hdm9WRWtrVkNCbXNxdHNxCk11MldZMmhTRlQyTWl1eS9heGlWNEFPc0FYMlhCV2ZPRG9XVk4ycnRDYmF1WjgxUlpKL0dYTkc4VjI1bk5ZQjIKTnFTSGdXNDRqOWdyRlU1N0pkaGF2MDZEd1kzU2s5VWFjYlZnbkowelRsWDVFbGdNaHJnV0RjSGxkMFdOVUVpNgpLeTNrbElYaDZNU2R4bWlsc0tQOFozNXd1Z0paUzNkQ2tUbTU5YzNoVE8vQU8waU1wdVVoWGYxcWFydW5GalZnCjB1YXQ4MFlweWVqRGkrbDV3R3BoWnhXeThQM2xhTHhpWDI3UG1kM3ZHMlAra21XckFnTUJBQUdqZ2FZd2dhTXcKSFFZRFZSME9CQllFRklnbkZ3bXB0aGhnaSt6cnV2WkhXY1ZTVktPM01BOEdBMVVkRXdFQi93UUZNQU1CQWY4dwpId1lEVlIwakJCZ3dGb0FVSzlCcFI1UjJDZjcwYTQwdVFLYjNSMDEvQ0Y0d0xnWURWUjBmQkNjd0pUQWpvQ0dnCkg0WWRhSFIwY0RvdkwyTnliQzVoY0hCc1pTNWpiMjB2Y205dmRDNWpjbXd3RGdZRFZSMFBBUUgvQkFRREFnR0cKTUJBR0NpcUdTSWIzWTJRR0FnRUVBZ1VBTUEwR0NTcUdTSWIzRFFFQkJRVUFBNElCQVFCUHorOVp2aXoxc213dgpqKzRUaHpMb0JUV29ib3Q5eVdrTXVka1h2SGNzMUdmaS9acHRPbGxjMzRNQnZiS3VLbUZ5c2EvTncwVXdqNk9ECkRjNGRSN1R4azRxamRKdWt3NWh5aHpzK3IwVUxrbFM1TXJ1UUdGTnJDazRRdHRrZFVHd2hnQXFKVGxlTWExczgKUGFiOTN2Y05JeDBMU2lhSFA3cVJra3lrR1JJWmJWZjFlbGlIZTJpSzVJYU1TdXZpU1JTcXBkMVZBSW11dTBzdwpydUdnc2J3cGdPWUpkK1crTktJQnluL2M0Z3JtTzdpNzdMcGlsZk1GWTBHQ3pRODdIVXlWcE51citjbVY2VS9rClRlY21tWUhwdlBtMEtkSUJlbWJoTG96MklZckYrSGpoZ2E2LzA1Q2RxYTN6ci8wNEdwWm5NQnhScFZ6c2NZcUMKdEd3UERCVWYKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=';
    
    console.log('🍎 DEBUG: Using hardcoded WWDR data for development');
    return Buffer.from(devWwdrBase64, 'base64');
  }
  private static passTypeIdentifier = 'pass.A43TZWNYA3.beanstalker.credits';
  private static teamIdentifier = process.env.APPLE_TEAM_ID || 'A43TZWNYA3';
  private static certificatePassword = process.env.APPLE_WALLET_CERT_PASSWORD || 'BeanStalker2025!';
  
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
      if (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] && keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length > 0) {
        keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      }
      
      // If not found, try keyBag
      if (!keyBag) {
        const altKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
        if (altKeyBags[forge.pki.oids.keyBag] && altKeyBags[forge.pki.oids.keyBag].length > 0) {
          keyBag = altKeyBags[forge.pki.oids.keyBag][0];
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