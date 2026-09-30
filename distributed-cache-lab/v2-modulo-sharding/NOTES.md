# v2 · Modulo sharding

## The idea
Split the keys over three nodes (**A**, **B**, **C**). The client decides where each key lives:

```
node = nodes[ hash(key) % nodes.length ]
```

This is **partitioning** (or sharding) with **client-side routing**. Nodes don't know about each
other; each one is still exactly the v1 node.

## What changed from v1
- `nodes: ['A']` became `nodes: ['A', 'B', 'C']`.
- The client keeps a list of nodes and picks one per key with a hash.
- New: `onAddNode` appends the new node to every client's list. **No data is moved.**
- New: `entryNote` marks stored entries that no client will ever ask for again ("orphaned").

The node code is unchanged.

## Predict before stepping
1. *A node crashes:* the three keys land on B, A and C. Which reads fail now?
2. *Add a node:* after D joins, the client computes `hash % 4` instead of `hash % 3`.
   How many of the four keys will it still find?
3. What happens to the values that are no longer found? Are they deleted?

<details>
<summary>What the runs show</summary>

1. Only `user:2` (on A) is unavailable, then lost. The other two keys are fine.
   **A failure now costs about 1/N of the keys instead of all of them.**
2. Only one of four keys is still found. A key stays put only if `h % 3 == h % 4`, which holds
   for about 1 key in 4. The page shows the exact share for 10,000 keys: **~75% of all keys
   move** when going from 3 to 4 nodes. In general, growing from N to N+1 nodes moves about
   N/(N+1) of the keys. The bigger the cluster, the worse this gets.
3. They stay where they were, **orphaned**. They use memory, but no client will ever read them.
   A real cache would eventually evict them. Meanwhile, every moved key is a miss that goes to
   the database, so adding capacity triggers a burst of load: the opposite of what you wanted.
</details>

## Trade-offs
| Good | Bad |
|---|---|
| Capacity and throughput grow with the number of nodes | Changing the node count remaps most keys, so a wave of misses follows |
| A crash affects about 1/N of the keys | Keys on a crashed node are still unavailable, then lost (no copies yet) |
| Still one round trip; the client knows where to go | Every client must agree on the node list, or they route differently |

## Leads to
**v3** keeps the idea (hash the key, pick a node) but replaces `% N` with a **hash ring**, so adding
a node moves only about 1/(N+1) of the keys.
