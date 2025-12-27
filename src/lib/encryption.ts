import { getBytes, hexlify } from 'ethers';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(address: string, usages: KeyUsage[]) {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API unavailable');
  }

  const normalized = address.trim().toLowerCase();
  const material = await window.crypto.subtle.digest('SHA-256', encoder.encode(normalized));
  return window.crypto.subtle.importKey('raw', material, 'AES-GCM', false, usages);
}

export async function encryptHashWithAddress(address: string, ipfsHash: string): Promise<string> {
  const key = await deriveKey(address, ['encrypt']);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(ipfsHash);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const encryptedBytes = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  encryptedBytes.set(iv, 0);
  encryptedBytes.set(new Uint8Array(ciphertext), iv.byteLength);
  return hexlify(encryptedBytes);
}

export async function decryptHashWithAddress(address: string, payloadHex: string): Promise<string> {
  const data = getBytes(payloadHex);
  if (data.length <= 12) {
    throw new Error('Invalid encrypted payload');
  }

  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const key = await deriveKey(address, ['decrypt']);
  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return decoder.decode(new Uint8Array(decrypted));
}
