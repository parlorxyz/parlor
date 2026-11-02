# Verification: making conversation accountable

Most memecoin chat is *cheap talk*: claims that cost nothing to make and prove nothing when heard. Parlor attaches every verified message to the sender's on-chain position, so a claim carries its evidence with it.

## Wallet sign-in

1. The browser asks the server for a nonce (12 random bytes, single use).
2. The wallet, connected through Privy (Phantom, Solflare, Backpack and others), signs this plain text:

   ```
   Sign in to Parlor

   This only proves you own this wallet. It costs nothing and moves no funds.

   Nonce: <nonce>
   ```

3. The server verifies the Ed25519 signature against the wallet's public key and issues a session.

There is no transaction and no token approval. A verified wallet shows its short address beside its name. Anyone can type any name; only the badge is proof.

## Holder badges

When a verified wallet posts in a room, the server reads that wallet's balance of the room's token from the chain and stamps the message:

| Badge | Share of supply |
| --- | --- |
| 🐋 | 1% or more |
| 🐬 | 0.1% or more |
| 🐟 | any amount |
| no bag | none |

The badge is a **snapshot at send time**. It records what the wallet held when it spoke, not what it holds today, so a wallet cannot claim conviction and exit quietly without the record showing it.

## Wallet labels

More than 2,200 known wallets render as names across chat, transactions, top traders and holders: KOLs from public lists such as Kolscan's, tracked traders, and exchange wallets as labelled on Solscan. Labels are a guide, not proof: judge the trade, not the name.

## `.sol` names, resolved on-chain

Parlor resolves Solana Name Service domains directly from the chain, with no third-party API in the path:

```
hashed  = SHA-256("SPL Name Service" + label)
account = PDA(seeds = [hashed, 32 zero bytes, SOL_TLD], program = namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX)
owner   = account data bytes 32..64
```

`SOL_TLD` is `58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx`. The program-derived address is found with the standard bump search and an ed25519 off-curve check. A public resolver is used only as a fallback.
