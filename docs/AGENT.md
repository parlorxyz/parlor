# The Agent and the risk score

## The Agent

Every room has an AI analyst that knows the coin's live state. Tag it in chat or tap a quick question.

**Context.** Each answer is built from a fresh context window assembled at request time:

- market data: price, market cap, liquidity, volume, buy/sell flow, pair age;
- the risk assessment below;
- holder concentration and the largest wallets;
- recent transactions and which labelled traders are active;
- the last messages in the room, so follow-up questions work.

**Models.** Google Gemini, with Groq as a failover. Under heavy load the Agent answers with a deterministic quick read built from the same data.

**Alerts.** The Agent checks every room with people in it every 45 seconds and posts when:

| Event | Threshold |
| --- | --- |
| Big move | ±15% or more in 5 minutes |
| Liquidity pull | liquidity falls 30% or more between checks |
| Whale trade | one trade of $5,000+, or 5% of liquidity, whichever is larger |
| Milestone | market cap crosses $50K, $100K, $250K, $500K, $1M and up to $1B |
| Known trader | a labelled wallet buys or sells |

It waits a few minutes before repeating the same alert.

**Guardrails.** The Agent gives a read, not advice. It never tells anyone to buy or sell and never asks for a seed phrase. Like any AI, it can be wrong.

## Risk score

Each token gets a score from 0 to 100. Higher means more warning signs. It is a fast heuristic, not an audit; every room also links to the full RugCheck report.

| Warning sign | Points |
| --- | ---: |
| Mint authority still enabled | +25 |
| Token-2022 permanent delegate | +25 |
| Liquidity under $10K | +25 |
| Freeze authority enabled | +20 |
| Pair under 1 hour old | +20 |
| Top 10 wallets hold over 30% | +15 |
| Liquidity under 3% of market cap | +15 |
| No website or socials listed | +15 |
| Sells outpacing buys this hour | +15 |
| Down 30% or more in the last hour | +15 |
| Token-2022 transfer fee | +10 |
| Liquidity under $50K | +10 |
| Pair under 1 day old | +10 |

**Levels:** LOW 0–24 · MEDIUM 25–49 · HIGH 50–100.
