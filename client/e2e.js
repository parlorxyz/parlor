// Parlor end-to-end encryption, client side.
//
// This is the same algorithm the parlorxyz.com web app runs in your browser,
// published as a standalone module so anyone can read, test and audit it.
//
//   wallet signature (Ed25519) ──SHA-256──▶ X25519 private key   (never leaves the device)
//   X25519(my private, peer public) ──HKDF-SHA-256──▶ AES-256-GCM key per wallet pair
//   AES-256-GCM(random 96-bit IV, AAD = "sender>recipient") ──▶ ciphertext stored by the server
//
// Only standard WebCrypto primitives are used. Nothing is hand-rolled.
// Works in modern browsers and in Node.js 20+ (globalThis.crypto.subtle).

const te = new TextEncoder();
const td = new TextDecoder();
const subtle = globalThis.crypto.subtle;

// PKCS#8 header for a raw 32-byte X25519 private key (RFC 8410)
const PKCS8_X25519 = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20]);

export const INFO = 'parlor-dm-v1';

/** The exact text a wallet signs to create its message key. Fixed per wallet, so the key is reproducible. */
export const keyMessage = (wallet) =>
  `Parlor private messages\n\nSign to create the key that encrypts your direct messages.\nWallet: ${wallet}\n\nFree. No transaction, no funds move. Only sign this on Parlor.`;

export const b64 = (buf) => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s); };
export const unb64 = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

/** True when this runtime supports X25519 in WebCrypto. */
export async function supported() {
  try { await subtle.generateKey({ name: 'X25519' }, false, ['deriveBits']); return true; } catch { return false; }
}

/**
 * Derive a wallet's message key pair from its signature over keyMessage(wallet).
 * Ed25519 signatures are deterministic (RFC 8032), so the same wallet always gets the same key pair.
 * @param {string} wallet  base58 Solana address
 * @param {Uint8Array} signature  64-byte Ed25519 signature over keyMessage(wallet)
 * @returns {Promise<{wallet: string, pub: string, priv: CryptoKey}>} pub = base64url X25519 public key; priv is non-extractable
 */
export async function deriveKeyPair(wallet, signature) {
  const seed = new Uint8Array(await subtle.digest('SHA-256', signature));
  const pkcs8 = new Uint8Array(48);
  pkcs8.set(PKCS8_X25519);
  pkcs8.set(seed, 16);
  const tmp = await subtle.importKey('pkcs8', pkcs8, { name: 'X25519' }, true, ['deriveBits']);
  const { x } = await subtle.exportKey('jwk', tmp);                        // public half only
  const priv = await subtle.importKey('pkcs8', pkcs8, { name: 'X25519' }, false, ['deriveBits']); // non-extractable
  pkcs8.fill(0); seed.fill(0);
  return { wallet, pub: x, priv };
}

/**
 * The AES-256-GCM key shared by two wallets.
 * Salt = both addresses sorted and joined with ":" (so both sides derive the same key); info = "parlor-dm-v1".
 */
export async function pairKey(mine, peerWallet, peerPub) {
  const pk = await subtle.importKey('raw', unb64(peerPub), { name: 'X25519' }, false, []);
  const bits = await subtle.deriveBits({ name: 'X25519', public: pk }, mine.priv, 256);
  const hk = await subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: te.encode([mine.wallet, peerWallet].sort().join(':')), info: te.encode(INFO) },
    hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

/** Encrypt one message. The direction is bound as additional authenticated data. */
export async function encrypt(key, from, to, text) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(from + '>' + to) }, key, te.encode(text));
  return { ct: b64(ct), iv: b64(iv) };
}

/** Decrypt one message. Throws if the ciphertext, IV or direction was tampered with. */
export async function decrypt(key, from, to, { ct, iv }) {
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: te.encode(from + '>' + to) }, key, unb64(ct));
  return td.decode(pt);
}
