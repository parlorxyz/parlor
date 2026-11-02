# Encryption spec

Parlor's private messages are wallet-to-wallet and end-to-end encrypted. This document describes the protocol exactly as the web app implements it. The reference code is [`client/e2e.js`](../client/e2e.js).

**Design goals**

- No seed phrase, no extra app, no key backup: the wallet itself is the key.
- Standard primitives only (WebCrypto). Nothing is hand-rolled.
- Private keys never leave the device and cannot be read by page scripts.
- A full compromise of Parlor's server yields ciphertext, not messages.

## 1. Identity: proving wallet ownership

Before messaging, a wallet signs in. The server issues a random, single-use nonce. The wallet signs a plain-text message containing it via `signMessage` (Ed25519), and the server verifies the signature against the wallet's public key. No transaction is ever requested, so signing in cannot move funds. Wallet connection runs through Privy.

## 2. Key derivation

The wallet signs a fixed message:

```
Parlor private messages

Sign to create the key that encrypts your direct messages.
Wallet: <address>

Free. No transaction, no funds move. Only sign this on Parlor.
```

```
seed = SHA-256( Ed25519_Sign(wallet_key, keyMessage(address)) )     32 bytes
sk   = X25519 private key from seed (PKCS#8, RFC 8410)              non-extractable CryptoKey
pk   = X25519 public key                                            published to the server (base64url)
```

Ed25519 signatures are deterministic ([RFC 8032 §5.1.6](https://www.rfc-editor.org/rfc/rfc8032#section-5.1.6)), so the same wallet always derives the same key pair. Sign in on a new device and the identical key is re-created. There is nothing to export, store or lose.

The private key is imported as **non-extractable**: the page can use it to derive secrets, but no script can read its bytes. It is cached in IndexedDB as a `CryptoKey` object. The raw seed is zeroed after import.

## 3. Key agreement and the pair key

For wallets A and B:

```
secret = X25519(sk_A, pk_B)                                         = X25519(sk_B, pk_A)
k_AB   = HKDF-SHA-256(secret, salt = sort(A, B).join(":"), info = "parlor-dm-v1") → AES-256-GCM key
```

- The salt contains both addresses, sorted, so both sides derive the same key and every pair of wallets gets a distinct key.
- The `info` string domain-separates these keys from any other use of the same material, and versions the protocol.

## 4. Message encryption

```
iv  = 12 random bytes (crypto.getRandomValues)
aad = "<sender address>><recipient address>"
ct  = AES-256-GCM(k_AB, iv, plaintext, aad)                         includes the 128-bit tag
```

The server stores `{from, to, ct, iv, ts}`. Binding the direction as additional authenticated data means a ciphertext cannot be replayed as if it were sent the other way, or moved to a different conversation, without failing authentication.

## 5. Messaging a wallet that hasn't joined

End-to-end encryption needs the recipient's public key, which exists only once that wallet signs in. Parlor still lets you write to any Solana address. Until the recipient joins:

- messages are **sealed at rest** with AES-256-GCM under a dedicated server key (random IV, AAD-bound), so they are never stored in plain text;
- the interface marks them **not encrypted**, because the server can technically decrypt them;
- the recipient sees them the first time it signs in.

As soon as the recipient publishes a key, every new message in the conversation is end-to-end encrypted. The protocol is explicit about this trust boundary rather than hiding it.

## 6. Threat model

| Adversary | Can see | Cannot see |
| --- | --- | --- |
| Network observer | That you use Parlor (TLS-protected traffic) | Message contents, recipients |
| Parlor's server / database | Who messaged whom and when, public keys, ciphertext | End-to-end message contents |
| Someone with your old device | Messages, if the browser profile is unlocked | Your wallet key; a message key cannot sign transactions |
| Another wallet | Nothing of conversations it isn't in | Your private key (non-extractable) |

**Out of scope:** a compromised browser or malicious extension on your device, a compromised wallet, and a malicious version of the web app served to you. Verify you are on `parlorxyz.com`, and only sign the "Parlor private messages" request there.

**Metadata:** the server necessarily routes messages, so it knows sender, recipient and timestamp. Content is the protected property.

## 7. Properties at a glance

| Property | Status |
| --- | --- |
| Confidentiality against the server | Yes, for end-to-end threads |
| Integrity and authenticity of each message | Yes (AES-GCM tag + direction AAD) |
| Multi-device without key backup | Yes (deterministic derivation) |
| Forward secrecy | No: one static key per pair. A future protocol version may add ratcheting. |
| Key rotation | Not yet: the key is tied to the wallet signature. |

## 8. Verify it yourself

```bash
npm test
```

The tests in [`client/e2e.test.mjs`](../client/e2e.test.mjs) use real Ed25519 keys to check that derivation is deterministic, that two wallets agree on a key, that a third wallet cannot decrypt, and that replayed or tampered ciphertext is rejected.
