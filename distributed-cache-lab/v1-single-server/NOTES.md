# v1 · Single server

## The idea
One cache server, **S1**, holds every key in memory. The client (**C1**) sends every request to S1.
There is nothing distributed about this yet. It is the baseline every later version is
measured against.

## How it works (`cache.js`)
- **Server:** a map from key to value. `PUT` stores and replies `PUT_OK`. `GET` replies `VALUE`
  or `NOT_FOUND`.
- **Client:** sends to S1 and starts a timer. If no reply arrives in time, the request fails.

## Predict before stepping
1. *Write, then read:* how many messages does one PUT plus one GET cost?
2. *A server crashes:* what do the three reads return while S1 is down? And after it restarts?
3. *Add a server:* what would adding a second server even mean here?

<details>
<summary>What the runs show</summary>

1. Four messages: every request is exactly one round trip (request and reply).
2. While S1 is down, all three reads are **unavailable**. Nothing answers, so the client waits
   until it gives up. After the restart, S1 answers quickly but has **lost every value**.
   The client was told these writes succeeded, and for a cache that is acceptable: the data
   must be re-read from the real database. But every key misses at once, so the database
   takes the whole load right after the restart.
3. Nothing. Clients only know about S1. Capacity and throughput are capped at one machine.
   The lab marks this scenario n/a.
</details>

## Trade-offs
| Good | Bad |
|---|---|
| Simplest possible design, nothing can disagree | One machine's memory is the whole capacity |
| Every read sees the latest write | One crash makes every key unavailable, then lost |
| One round trip per request | Can't grow, so one busy machine is a bottleneck |

## Leads to
**v2** keeps each server exactly this simple, but spreads the keys over several servers.
