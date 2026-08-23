/**
 * Web Crypto API client-side file encryption / decryption helper.
 * Uses AES-GCM 256-bit key derived from PBKDF2.
 * Output file format: [16 bytes Salt] + [12 bytes IV] + [Ciphertext]
 */

const ITERATIONS = 10000;
const KEY_LEN = 256;

// Helper to convert password to a CryptoKey
async function getPBKDF2Key(passphrase) {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return baseKey;
}

// Derive AES-GCM key from base key and salt
async function deriveAesKey(baseKey, salt) {
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LEN },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt an ArrayBuffer with a passphrase.
 * Returns a new ArrayBuffer containing: [16 bytes Salt] + [12 bytes IV] + [Ciphertext]
 */
export async function encryptFileBuffer(arrayBuffer, passphrase) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const baseKey = await getPBKDF2Key(passphrase);
  const aesKey = await deriveAesKey(baseKey, salt);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    arrayBuffer
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.byteLength);
  combined.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

  return combined.buffer;
}

/**
 * Decrypt an ArrayBuffer containing [16 bytes Salt] + [12 bytes IV] + [Ciphertext]
 * with a passphrase. Returns decrypted ArrayBuffer.
 */
export async function decryptFileBuffer(combinedBuffer, passphrase) {
  const combined = new Uint8Array(combinedBuffer);
  
  if (combined.byteLength < 28) {
    throw new Error("Invalid encrypted file: file size too small.");
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const baseKey = await getPBKDF2Key(passphrase);
  const aesKey = await deriveAesKey(baseKey, salt);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      ciphertext.buffer
    );
    return decrypted;
  } catch (err) {
    throw new Error("Incorrect passphrase or corrupted file.");
  }
}

/**
 * Encrypt a text string (note/snippet) with a passphrase using AES-GCM 256.
 * Returns Base64-encoded string: [Salt 16B][IV 12B][Ciphertext].
 */
export async function encryptText(plainText, passphrase) {
  if (!plainText) return '';
  const enc = new TextEncoder();
  const dataBuffer = enc.encode(plainText);
  const encryptedBuffer = await encryptFileBuffer(dataBuffer, passphrase);
  
  // Convert ArrayBuffer to Base64
  let binary = '';
  const bytes = new Uint8Array(encryptedBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Decrypt a Base64-encoded encrypted text string with passphrase.
 * Returns the original plain text.
 */
export async function decryptText(base64Ciphertext, passphrase) {
  if (!base64Ciphertext) return '';
  const binary = window.atob(base64Ciphertext);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const decryptedBuffer = await decryptFileBuffer(bytes.buffer, passphrase);
  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}


