# Security policy

Parlor handles wallet sign-in and private messages, so we take reports seriously.

## Reporting a vulnerability

Please report privately. Do not open a public issue.

- Send a direct message to [@Parlorxyz](https://x.com/Parlorxyz) on X asking for a private channel, or
- open a [private security advisory](https://github.com/parlorxyz/parlor/security/advisories/new) on this repository.

Include what you found, steps to reproduce and the impact you expect. We aim to reply within 72 hours.

## In scope

- `parlorxyz.com` and its API
- the encryption protocol and [`client/e2e.js`](client/e2e.js)
- wallet sign-in and session handling
- the scam-link and seed-phrase filters
- anything that lets one user read, impersonate or act as another

## Out of scope

- social engineering of users or the team
- denial of service by volume
- issues in third-party services (wallets, Privy, RPC providers, market-data APIs) that Parlor doesn't control
- reports without a working proof of concept

## Ground rules

Test only against your own wallets and accounts, don't access other people's data, and give us reasonable time to fix an issue before you disclose it.

## What Parlor never asks for

Parlor never asks for a seed phrase or private key, and never asks you to sign a transaction to log in or message. Anyone who does is not Parlor.
