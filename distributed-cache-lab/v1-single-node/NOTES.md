# v1 · Single node

## The idea
One cache node, **A**, holds every key in memory. The client sends every request to A.
There is nothing distributed about this yet. It is the baseline every later version is
measured against.

## How it works (`cache.js`)
- **Node:** a map from key to value. `PUT` stores and replies `PUT_OK`. `GET` replies `VALUE`
  or `NOT_FOUND`.
- **Client:** sends to A and starts a 50 ms timer. If the timer fires before a reply arrives,
  the request fails with a timeout.

## Predict before stepping
1. *Write, then read:* how many messages does one PUT plus one GET cost?
2. *A node crashes:* what do the three reads return while A is down? And after it restarts?
3. *Add a node:* what would adding a second node even mean here?

<details>
<summary>What the runs show</summary>

1. Four messages: every request is exactly one round trip (request and reply).
2. While A is down, all three reads are **unavailable**. Nothing answers, so the client waits
   for the full timeout. After the restart, A answers quickly but has **lost every value**.
   The client was told these writes succeeded, and for a cache that is acceptable: the data
   must be re-read from the real database. But every key misses at once, so the database
   takes the whole load right after the restart.
3. Nothing. Clients only know about A. Capacity and throughput are capped at one machine.
   The lab marks this scenario n/a.
</details>

## Trade-offs
| Good | Bad |
|---|---|
| Simplest possible design, nothing can disagree | One machine's memory is the whole capacity |
| Every read sees the latest write | One crash makes every key unavailable, then lost |
| One round trip per request | Can't grow, so one busy machine is a bottleneck |

## Leads to
**v2** keeps each node exactly this simple, but spreads the keys over several nodes.
