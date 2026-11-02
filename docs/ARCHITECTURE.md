# Architecture

Parlor indexes conversation at the asset level. Every Solana token gets exactly one room, keyed by its mint address, created the moment anyone searches for it.

## Overview

```
            ┌───────────────────────────── browser ─────────────────────────────┐
            │  rooms UI · charts · holders · DMs (E2E in WebCrypto) · Privy      │
            └───────────────▲──────────────────────────────▲────────────────────┘
                    HTTPS + Server-Sent Events        signMessage (no transactions)
            ┌───────────────┴──────────────────────────────┴────────────────────┐
            │                         Parlor server (Node.js 22)                 │
            │  rooms & history · verification · holder badges · Agent · filters  │
            │                         SQLite (node:sqlite)                       │
            └──────▲──────────────▲───────────────▲──────────────▲──────────────┘
                   │              │               │              │
             DexScreener   GeckoTerminal    Solana RPC       Google Gemini
            (price, pairs)   (trades,       via Helius        (Agent, Groq
                              candles)   (holders, balances,    failover)
                                          authorities, SNS)
```

## Rooms

- **Primary key:** the token's mint address. One room per token, no duplicates, no claiming.
- **Transport:** Server-Sent Events push messages, reactions and Agent posts to everyone in the room in real time.
- **History:** messages persist in SQLite. A room shows its latest 150 messages.
- **Neutrality:** rooms are not owned by token teams. Moderation is platform-level: automatic filters, community reports (three reports hide a message) and moderators who can ban wallets.

## Market data

| Source | Data | Refresh |
| --- | --- | --- |
| DexScreener | Price, FDV, liquidity, volume, buys/sells, pairs, socials, trending | 20 s |
| GeckoTerminal | Live trades, the day's biggest trades, OHLC candles | 10 s trades, 30 s candles |
| Solana RPC (Helius) | Top 100 holders, holder count, balances, supply, mint/freeze authority, Token-2022 extensions | On demand, cached |

Large tokens are scanned with a streaming, size-capped reader so a single huge holder set cannot exhaust memory.

## Identity and verification

Wallets connect through Privy and sign in with a single-use nonce (Ed25519 `signMessage`). See [VERIFICATION.md](VERIFICATION.md) for holder badges, wallet labels and on-chain `.sol` resolution.

## Private messages

Wallet-to-wallet, end-to-end encrypted in the browser. The server stores ciphertext and routing metadata. See [ENCRYPTION.md](ENCRYPTION.md).

## The Agent

An AI analyst in every room, given a fresh context window of live data for each question, plus a background watcher that posts alerts. See [AGENT.md](AGENT.md).

## Safety filters

Room messages are checked before they are stored:

- link shorteners, raw IP addresses and look-alike domains of known sites are refused;
- "claim your airdrop" bait and seed-phrase solicitation are refused (and cannot be sent in DMs);
- unknown links open behind a warning step; known sites (DexScreener, Solscan, Jupiter…) open normally.

## Limits

| Limit | Value |
| --- | --- |
| Message length | 400 characters |
| Room messages | 20 per minute |
| Direct messages | 15 per minute |
| Images | 6 per minute, GIFs up to 1 MB |
| Watchlist | 30 coins |
