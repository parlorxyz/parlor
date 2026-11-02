// Run with: node --test client/
// Uses real Ed25519 wallet keys generated with WebCrypto to stand in for Phantom / Solflare / Backpack.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyMessage, deriveKeyPair, pairKey, encrypt, decrypt, supported } from './e2e.js';

const te = new TextEncoder();
const subtle = globalThis.crypto.subtle;

async function fakeWallet(name) {
  const kp = await subtle.generateKey({ name: 'Ed25519' }, false, ['sign']);
  return { address: name, sign: async (bytes) => new Uint8Array(await subtle.sign({ name: 'Ed25519' }, kp.privateKey, bytes)) };
}

test('runtime supports X25519', async () => {
  assert.equal(await supported(), true);
});

test('the same wallet always derives the same key pair', async () => {
  const w = await fakeWallet('WalletA111111111111111111111111111111111111');
  const a = await deriveKeyPair(w.address, await w.sign(te.encode(keyMessage(w.address))));
  const b = await deriveKeyPair(w.address, await w.sign(te.encode(keyMessage(w.address))));
  assert.equal(a.pub, b.pub);
  assert.equal(a.priv.extractable, false);
});

test('two wallets agree on a key and exchange messages', async () => {
  const A = await fakeWallet('WalletA111111111111111111111111111111111111');
  const B = await fakeWallet('WalletB222222222222222222222222222222222222');
  const ka = await deriveKeyPair(A.address, await A.sign(te.encode(keyMessage(A.address))));
  const kb = await deriveKeyPair(B.address, await B.sign(te.encode(keyMessage(B.address))));
  const keyAB = await pairKey(ka, B.address, kb.pub);
  const keyBA = await pairKey(kb, A.address, ka.pub);

  const msg = await encrypt(keyAB, A.address, B.address, 'why did you sell 40% in one click?');
  assert.equal(await decrypt(keyBA, A.address, B.address, msg), 'why did you sell 40% in one click?');
});

test('a message cannot be replayed in the other direction', async () => {
  const A = await fakeWallet('WalletA111111111111111111111111111111111111');
  const B = await fakeWallet('WalletB222222222222222222222222222222222222');
  const ka = await deriveKeyPair(A.address, await A.sign(te.encode(keyMessage(A.address))));
  const kb = await deriveKeyPair(B.address, await B.sign(te.encode(keyMessage(B.address))));
  const key = await pairKey(ka, B.address, kb.pub);
  const msg = await encrypt(key, A.address, B.address, 'gm');
  await assert.rejects(decrypt(key, B.address, A.address, msg));
});

test('a third wallet cannot read the conversation', async () => {
  const A = await fakeWallet('WalletA111111111111111111111111111111111111');
  const B = await fakeWallet('WalletB222222222222222222222222222222222222');
  const C = await fakeWallet('WalletC333333333333333333333333333333333333');
  const ka = await deriveKeyPair(A.address, await A.sign(te.encode(keyMessage(A.address))));
  const kb = await deriveKeyPair(B.address, await B.sign(te.encode(keyMessage(B.address))));
  const kc = await deriveKeyPair(C.address, await C.sign(te.encode(keyMessage(C.address))));
  const msg = await encrypt(await pairKey(ka, B.address, kb.pub), A.address, B.address, 'private');
  const wrong = await pairKey(kc, A.address, ka.pub);
  await assert.rejects(decrypt(wrong, A.address, B.address, msg));
});

test('tampered ciphertext is rejected', async () => {
  const A = await fakeWallet('WalletA111111111111111111111111111111111111');
  const B = await fakeWallet('WalletB222222222222222222222222222222222222');
  const ka = await deriveKeyPair(A.address, await A.sign(te.encode(keyMessage(A.address))));
  const kb = await deriveKeyPair(B.address, await B.sign(te.encode(keyMessage(B.address))));
  const key = await pairKey(ka, B.address, kb.pub);
  const msg = await encrypt(key, A.address, B.address, 'hold');
  const bytes = Uint8Array.from(atob(msg.ct), (c) => c.charCodeAt(0)); bytes[0] ^= 1;
  await assert.rejects(decrypt(key, A.address, B.address, { ...msg, ct: btoa(String.fromCharCode(...bytes)) }));
});
