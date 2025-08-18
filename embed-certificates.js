/**
 * Embed Apple Wallet certificates directly in server code during build
 * This ensures certificates are available in TestFlight builds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certPath = path.join(__dirname, 'certs', 'bean_stalker_pass_cert.p12');
const wwdrPath = path.join(__dirname, 'certs', 'wwdr.pem');
const outputPath = path.join(__dirname, 'server', 'embedded-certificates.ts');

// Check if certificates exist
if (!fs.existsSync(certPath)) {
  console.error('❌ Certificate file not found:', certPath);
  process.exit(1);
}

if (!fs.existsSync(wwdrPath)) {
  console.error('❌ WWDR certificate file not found:', wwdrPath);
  process.exit(1);
}

// Read certificates as base64
const certBase64 = fs.readFileSync(certPath).toString('base64');
const wwdrBase64 = fs.readFileSync(wwdrPath).toString('base64');

// Create embedded certificates TypeScript file
const embeddedCode = `/**
 * Apple Wallet certificates embedded at build time for TestFlight builds
 * Generated automatically by embed-certificates.js
 */

export const EMBEDDED_CERTIFICATES = {
  APPLE_WALLET_CERT_BASE64: '${certBase64}',
  APPLE_WALLET_WWDR_BASE64: '${wwdrBase64}',
  APPLE_TEAM_ID: 'A43TZWNYA3'
} as const;

export function getEmbeddedCertificate(): Buffer {
  return Buffer.from(EMBEDDED_CERTIFICATES.APPLE_WALLET_CERT_BASE64, 'base64');
}

export function getEmbeddedWWDR(): Buffer {
  return Buffer.from(EMBEDDED_CERTIFICATES.APPLE_WALLET_WWDR_BASE64, 'base64');
}
`;

// Write the embedded certificates file
fs.writeFileSync(outputPath, embeddedCode);

console.log('✅ Embedded certificates created:', outputPath);
console.log('✅ Certificate length:', certBase64.length, 'characters');
console.log('✅ WWDR length:', wwdrBase64.length, 'characters');