# v2 · Modulo sharding

## The idea
Split the keys over three servers (**S1**, **S2**, **S3**). The client decides where each key lives:

```
server = servers[ hash(key) % servers.length ]
```

This is **partitioning** (or sharding) with **client-side routing**. Servers don't know about each
other; each one is still exactly the v1 server.

## What changed from v1
- `nodes: ['S1']` became `nodes: ['S1', 'S2', 'S3']`.
- The client keeps a list of servers and picks one per key with a hash.
- New: `onAddNode` appends the new server to every client's list. **No data is moved.**
- New: `entryNote` marks stored entries that no client will ever ask for again ("orphaned").

The server code is unchanged.

## Predict before stepping
1. *A server crashes:* the three keys land on S2, S1 and S3. Which reads fail now?
2. *Add a server:* after S4 joins, the client computes `hash % 4` instead of `hash % 3`.
   How many of the four keys will it still find?
3. What happens to the values that are no longer found? Are they deleted?

<details>
<summary>What the runs show</summary>

1. Only `user:2` (on S1) is unavailable, then lost. The other two keys are fine.
   **A failure now costs about 1/N of the keys instead of all of them.**
2. Only one of four keys is still found. A key stays put only if `h % 3 == h % 4`, which holds
   for about 1 key in 4. The page shows the exact share for 10,000 keys: **~75% of all keys
   move** when going from 3 to 4 servers. In general, growing from N to N+1 servers moves about
   N/(N+1) of the keys. The bigger the cluster, the worse this gets.
3. They stay where they were, **orphaned**. They use memory, but no client will ever read them.
   A real cache would eventually evict them. Meanwhile, every moved key is a miss that goes to
   the database, so adding capacity triggers a burst of load: the opposite of what you wanted.
</details>

## Trade-offs
| Good | Bad |
|---|---|
| Capacity and throughput grow with the number of servers | Changing the server count remaps most keys, so a wave of misses follows |
| A crash affects about 1/N of the keys | Keys on a crashed server are still unavailable, then lost (no copies yet) |
| Still one round trip; the client knows where to go | Every client must agree on the server list, or they route differently |

## Leads to
**v3** keeps the idea (hash the key, pick a server) but replaces `% N` with a **hash ring**, so adding
a server moves only about 1/(N+1) of the keys.
